import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface AuditContext {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class DevicesService {
  private readonly SALT_ROUNDS = 12;
  private readonly API_KEY_EXPIRY_DAYS = 90;

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // AUDIT LOGGING (Conformite RGPD/ISO 27001)
  // ==========================================

  private async createAuditLog(
    tenantId: string,
    deviceId: string,
    action: DeviceAction,
    context: AuditContext,
    details?: any,
    previousValue?: any,
    newValue?: any,
  ) {
    try {
      await this.prisma.deviceAuditLog.create({
        data: {
          tenantId,
          deviceId,
          action,
          performedBy: context.userId,
          performedByName: context.userName,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: details || {},
          previousValue: previousValue || null,
          newValue: newValue || null,
        },
      });
    } catch (error) {
      console.error('[DeviceAudit] Erreur lors de la creation du log:', error);
    }
  }

  // ==========================================
  // API KEY MANAGEMENT (Securite)
  // ==========================================

  /**
   * Genere une nouvelle API Key securisee
   * @returns { apiKey: string, apiKeyHash: string, expiresAt: Date }
   */
  private async generateApiKey(): Promise<{
    apiKey: string;
    apiKeyHash: string;
    expiresAt: Date;
  }> {
    // Generer une cle aleatoire de 32 bytes (256 bits)
    const apiKey = `pk_${crypto.randomBytes(32).toString('hex')}`;

    // Hasher la cle avec bcrypt
    const apiKeyHash = await bcrypt.hash(apiKey, this.SALT_ROUNDS);

    // Date d'expiration (90 jours par defaut)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.API_KEY_EXPIRY_DAYS);

    return { apiKey, apiKeyHash, expiresAt };
  }

  /**
   * Verifie une API Key contre le hash stocke
   */
  async verifyApiKey(deviceId: string, tenantId: string, apiKey: string): Promise<boolean> {
    const device = await this.prisma.attendanceDevice.findFirst({
      where: { deviceId, tenantId },
      select: {
        id: true,
        apiKeyHash: true,
        apiKey: true, // Legacy
        apiKeyExpiresAt: true,
        isActive: true,
      },
    });

    if (!device || !device.isActive) {
      return false;
    }

    // Verifier l'expiration
    if (device.apiKeyExpiresAt && new Date() > device.apiKeyExpiresAt) {
      console.warn(`[DeviceSecurity] API Key expiree pour device ${deviceId}`);
      return false;
    }

    // Verifier contre le hash (nouvelle methode)
    if (device.apiKeyHash) {
      return bcrypt.compare(apiKey, device.apiKeyHash);
    }

    // Fallback: verification legacy (API Key en clair)
    if (device.apiKey) {
      return device.apiKey === apiKey;
    }

    return false;
  }

  /**
   * Genere une nouvelle API Key pour un terminal
   */
  async generateNewApiKey(
    id: string,
    tenantId: string,
    context: AuditContext,
  ): Promise<{ apiKey: string; expiresAt: Date }> {
    const device = await this.findOne(id, tenantId);

    const { apiKey, apiKeyHash, expiresAt } = await this.generateApiKey();

    await this.prisma.attendanceDevice.update({
      where: { id },
      data: {
        apiKeyHash,
        apiKeyExpiresAt: expiresAt,
        apiKeyLastRotation: new Date(),
        apiKey: null, // Supprimer l'ancienne cle en clair
      },
    });

    await this.createAuditLog(
      tenantId,
      id,
      DeviceAction.API_KEY_GENERATED,
      context,
      { expiresAt: expiresAt.toISOString() },
    );

    return { apiKey, expiresAt };
  }

  /**
   * Rotation de l'API Key (renouvellement)
   */
  async rotateApiKey(
    id: string,
    tenantId: string,
    context: AuditContext,
  ): Promise<{ apiKey: string; expiresAt: Date }> {
    const device = await this.findOne(id, tenantId);

    const { apiKey, apiKeyHash, expiresAt } = await this.generateApiKey();

    await this.prisma.attendanceDevice.update({
      where: { id },
      data: {
        apiKeyHash,
        apiKeyExpiresAt: expiresAt,
        apiKeyLastRotation: new Date(),
        apiKey: null,
      },
    });

    await this.createAuditLog(
      tenantId,
      id,
      DeviceAction.API_KEY_ROTATED,
      context,
      {
        previousExpiry: device.apiKeyExpiresAt?.toISOString(),
        newExpiry: expiresAt.toISOString(),
      },
    );

    return { apiKey, expiresAt };
  }

  /**
   * Revoque l'API Key d'un terminal
   */
  async revokeApiKey(id: string, tenantId: string, context: AuditContext): Promise<void> {
    await this.findOne(id, tenantId);

    await this.prisma.attendanceDevice.update({
      where: { id },
      data: {
        apiKeyHash: null,
        apiKeyExpiresAt: null,
        apiKey: null,
      },
    });

    await this.createAuditLog(tenantId, id, DeviceAction.API_KEY_REVOKED, context);
  }

  // ==========================================
  // IP WHITELIST (Securite ISO 27001)
  // ==========================================

  /**
   * Verifie si une IP est autorisee pour un terminal
   */
  async verifyIPWhitelist(deviceId: string, tenantId: string, clientIP: string): Promise<boolean> {
    const device = await this.prisma.attendanceDevice.findFirst({
      where: { deviceId, tenantId },
      select: {
        enforceIPWhitelist: true,
        allowedIPs: true,
      },
    });

    if (!device) return false;

    // Si le whitelist n'est pas active, autoriser toutes les IPs
    if (!device.enforceIPWhitelist) return true;

    // Si whitelist vide, autoriser (pour eviter le blocage)
    if (!device.allowedIPs || device.allowedIPs.length === 0) return true;

    // Verifier si l'IP est dans la liste
    return device.allowedIPs.includes(clientIP);
  }

  /**
   * Met a jour la liste blanche d'IPs
   */
  async updateIPWhitelist(
    id: string,
    tenantId: string,
    allowedIPs: string[],
    enforceIPWhitelist: boolean,
    context: AuditContext,
  ) {
    const device = await this.findOne(id, tenantId);

    const previousValue = {
      allowedIPs: device.allowedIPs,
      enforceIPWhitelist: device.enforceIPWhitelist,
    };

    const updated = await this.prisma.attendanceDevice.update({
      where: { id },
      data: {
        allowedIPs,
        enforceIPWhitelist,
      },
      include: { site: true },
    });

    await this.createAuditLog(
      tenantId,
      id,
      DeviceAction.IP_WHITELIST_UPDATED,
      context,
      { ipCount: allowedIPs.length },
      previousValue,
      { allowedIPs, enforceIPWhitelist },
    );

    return updated;
  }

  // ==========================================
  // HEARTBEAT & MONITORING
  // ==========================================

  /**
   * Enregistre un heartbeat du terminal
   */
  async recordHeartbeat(
    deviceId: string,
    tenantId: string,
    clientIP?: string,
  ): Promise<{ status: string; serverTime: Date; nextHeartbeatExpected: Date }> {
    const device = await this.prisma.attendanceDevice.findFirst({
      where: { deviceId, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Terminal non trouve');
    }

    if (!device.isActive) {
      throw new ForbiddenException('Terminal desactive');
    }

    const now = new Date();
    const nextHeartbeat = new Date(now.getTime() + device.heartbeatInterval * 1000);

    // Mettre a jour le heartbeat et les metriques
    await this.prisma.attendanceDevice.update({
      where: { id: device.id },
      data: {
        lastHeartbeat: now,
        lastSync: now,
      },
    });

    // Log audit (sans bloquer)
    this.createAuditLog(
      tenantId,
      device.id,
      DeviceAction.HEARTBEAT,
      { ipAddress: clientIP },
      { timestamp: now.toISOString() },
    );

    return {
      status: 'OK',
      serverTime: now,
      nextHeartbeatExpected: nextHeartbeat,
    };
  }

  /**
   * Calcule le statut de connexion d'un terminal
   */
  getConnectionStatus(device: any): 'ONLINE' | 'WARNING' | 'OFFLINE' | 'INACTIVE' {
    if (!device.isActive) return 'INACTIVE';

    const lastActivity = device.lastHeartbeat || device.lastSync;
    if (!lastActivity) return 'OFFLINE';

    const now = new Date();
    const diffMs = now.getTime() - new Date(lastActivity).getTime();
    const diffMinutes = diffMs / (1000 * 60);

    // Utiliser l'intervalle de heartbeat configure
    const warningThreshold = (device.heartbeatInterval || 300) / 60 * 2; // 2x l'intervalle
    const offlineThreshold = (device.heartbeatInterval || 300) / 60 * 6; // 6x l'intervalle

    if (diffMinutes <= warningThreshold) return 'ONLINE';
    if (diffMinutes <= offlineThreshold) return 'WARNING';
    return 'OFFLINE';
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  async create(tenantId: string, createDeviceDto: CreateDeviceDto, context?: AuditContext) {
    // Extraire generateApiKey du DTO (ce n'est pas un champ DB)
    const { generateApiKey: shouldGenerateApiKey, ...deviceData } = createDeviceDto;

    // Verifier si deviceId existe deja
    const existingDevice = await this.prisma.attendanceDevice.findFirst({
      where: {
        tenantId,
        deviceId: deviceData.deviceId,
      },
    });

    if (existingDevice) {
      throw new ConflictException('Un terminal avec cet ID existe deja');
    }

    // Generer une API Key si demande
    let apiKeyData = {};
    let generatedApiKey: string | null = null;

    if (shouldGenerateApiKey) {
      const { apiKey, apiKeyHash, expiresAt } = await this.generateApiKey();
      generatedApiKey = apiKey;
      apiKeyData = {
        apiKeyHash,
        apiKeyExpiresAt: expiresAt,
        apiKeyLastRotation: new Date(),
      };
    }

    const device = await this.prisma.attendanceDevice.create({
      data: {
        ...deviceData,
        ...apiKeyData,
        tenantId,
      },
      include: {
        site: true,
      },
    });

    // Audit log
    if (context) {
      await this.createAuditLog(
        tenantId,
        device.id,
        DeviceAction.CREATED,
        context,
        {
          deviceId: device.deviceId,
          deviceType: device.deviceType,
          hasApiKey: !!generatedApiKey,
        },
      );
    }

    return {
      ...device,
      generatedApiKey, // Retourner la cle en clair une seule fois
    };
  }

  async findAll(tenantId: string, filters?: any) {
    const where: any = { tenantId };

    if (filters?.deviceType) {
      where.deviceType = filters.deviceType;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters?.siteId) {
      where.siteId = filters.siteId;
    }

    const devices = await this.prisma.attendanceDevice.findMany({
      where,
      include: {
        site: true,
        _count: {
          select: {
            attendance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Ajouter le statut de connexion a chaque terminal
    return devices.map(device => ({
      ...device,
      connectionStatus: this.getConnectionStatus(device),
      hasApiKey: !!(device.apiKeyHash || device.apiKey),
      apiKeyExpired: device.apiKeyExpiresAt ? new Date() > device.apiKeyExpiresAt : false,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const device = await this.prisma.attendanceDevice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        site: true,
        _count: {
          select: {
            attendance: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Terminal non trouve');
    }

    return {
      ...device,
      connectionStatus: this.getConnectionStatus(device),
      hasApiKey: !!(device.apiKeyHash || device.apiKey),
      apiKeyExpired: device.apiKeyExpiresAt ? new Date() > device.apiKeyExpiresAt : false,
    };
  }

  async findByDeviceId(deviceId: string, tenantId: string) {
    return this.prisma.attendanceDevice.findFirst({
      where: {
        deviceId,
        tenantId,
      },
    });
  }

  async update(id: string, tenantId: string, updateDeviceDto: UpdateDeviceDto, context?: AuditContext) {
    const device = await this.findOne(id, tenantId);

    // Verifier conflit de deviceId
    if (updateDeviceDto.deviceId) {
      const existingDevice = await this.prisma.attendanceDevice.findFirst({
        where: {
          tenantId,
          deviceId: updateDeviceDto.deviceId,
          NOT: { id },
        },
      });

      if (existingDevice) {
        throw new ConflictException('Un terminal avec cet ID existe deja');
      }
    }

    const previousValue = {
      name: device.name,
      deviceId: device.deviceId,
      deviceType: device.deviceType,
      ipAddress: device.ipAddress,
      siteId: device.siteId,
      isActive: device.isActive,
    };

    const updated = await this.prisma.attendanceDevice.update({
      where: { id },
      data: updateDeviceDto,
      include: {
        site: true,
      },
    });

    // Determiner l'action d'audit
    let action: DeviceAction = DeviceAction.UPDATED;
    if (updateDeviceDto.isActive !== undefined) {
      action = updateDeviceDto.isActive ? DeviceAction.ACTIVATED : DeviceAction.DEACTIVATED;
    }

    if (context) {
      await this.createAuditLog(
        tenantId,
        id,
        action,
        context,
        { changes: Object.keys(updateDeviceDto) },
        previousValue,
        updateDeviceDto,
      );
    }

    return {
      ...updated,
      connectionStatus: this.getConnectionStatus(updated),
    };
  }

  async remove(id: string, tenantId: string, context?: AuditContext) {
    const device = await this.findOne(id, tenantId);

    // Log avant suppression
    if (context) {
      await this.createAuditLog(
        tenantId,
        id,
        DeviceAction.DELETED,
        context,
        {
          deviceId: device.deviceId,
          name: device.name,
          attendanceCount: device._count?.attendance || 0,
        },
      );
    }

    return this.prisma.attendanceDevice.delete({
      where: { id },
    });
  }

  async getStats(tenantId: string) {
    const devices = await this.prisma.attendanceDevice.findMany({
      where: { tenantId },
      select: {
        isActive: true,
        lastHeartbeat: true,
        lastSync: true,
        heartbeatInterval: true,
        apiKeyExpiresAt: true,
      },
    });

    let online = 0;
    let warning = 0;
    let offline = 0;
    let inactive = 0;
    let apiKeyExpiringSoon = 0;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    devices.forEach(device => {
      const status = this.getConnectionStatus(device);
      switch (status) {
        case 'ONLINE': online++; break;
        case 'WARNING': warning++; break;
        case 'OFFLINE': offline++; break;
        case 'INACTIVE': inactive++; break;
      }

      // Verifier les API Keys expirant bientot
      if (device.apiKeyExpiresAt && device.apiKeyExpiresAt <= sevenDaysFromNow) {
        apiKeyExpiringSoon++;
      }
    });

    return {
      total: devices.length,
      online,
      warning,
      offline,
      inactive,
      active: online + warning + offline,
      apiKeyExpiringSoon,
    };
  }

  async syncDevice(id: string, tenantId: string, context?: AuditContext) {
    const device = await this.findOne(id, tenantId);

    const updatedDevice = await this.prisma.attendanceDevice.update({
      where: { id },
      data: {
        lastSync: new Date(),
        totalSyncs: { increment: 1 },
      },
      include: {
        site: true,
      },
    });

    if (context) {
      await this.createAuditLog(tenantId, id, DeviceAction.SYNCED, context);
    }

    return {
      success: true,
      message: 'Synchronisation reussie',
      device: {
        ...updatedDevice,
        connectionStatus: this.getConnectionStatus(updatedDevice),
      },
    };
  }

  // ==========================================
  // ACTIVATION / DEACTIVATION
  // ==========================================

  async activateDevice(id: string, tenantId: string, context: AuditContext) {
    const device = await this.findOne(id, tenantId);

    if (device.isActive) {
      throw new BadRequestException('Le terminal est deja actif');
    }

    const updated = await this.prisma.attendanceDevice.update({
      where: { id },
      data: { isActive: true },
      include: { site: true },
    });

    await this.createAuditLog(
      tenantId,
      id,
      DeviceAction.ACTIVATED,
      context,
      { previousStatus: false },
    );

    return {
      ...updated,
      connectionStatus: this.getConnectionStatus(updated),
    };
  }

  async deactivateDevice(id: string, tenantId: string, context: AuditContext) {
    const device = await this.findOne(id, tenantId);

    if (!device.isActive) {
      throw new BadRequestException('Le terminal est deja desactive');
    }

    const updated = await this.prisma.attendanceDevice.update({
      where: { id },
      data: { isActive: false },
      include: { site: true },
    });

    await this.createAuditLog(
      tenantId,
      id,
      DeviceAction.DEACTIVATED,
      context,
      { previousStatus: true },
    );

    return {
      ...updated,
      connectionStatus: this.getConnectionStatus(updated),
    };
  }

  // ==========================================
  // AUDIT LOGS RETRIEVAL
  // ==========================================

  async getAuditLogs(
    tenantId: string,
    filters?: {
      deviceId?: string;
      action?: DeviceAction;
      performedBy?: string;
      startDate?: string | Date;
      endDate?: string | Date;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = { tenantId };

    if (filters?.deviceId) {
      where.deviceId = filters.deviceId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.performedBy) {
      where.performedBy = filters.performedBy;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = typeof filters.startDate === 'string'
          ? new Date(filters.startDate)
          : filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = typeof filters.endDate === 'string'
          ? new Date(filters.endDate)
          : filters.endDate;
      }
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.deviceAuditLog.findMany({
        where,
        include: {
          device: {
            select: {
              name: true,
              deviceId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deviceAuditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
