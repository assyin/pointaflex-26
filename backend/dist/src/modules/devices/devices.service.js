"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
let DevicesService = class DevicesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.SALT_ROUNDS = 12;
        this.API_KEY_EXPIRY_DAYS = 90;
    }
    async createAuditLog(tenantId, deviceId, action, context, details, previousValue, newValue) {
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
        }
        catch (error) {
            console.error('[DeviceAudit] Erreur lors de la creation du log:', error);
        }
    }
    async generateApiKey() {
        const apiKey = `pk_${crypto.randomBytes(32).toString('hex')}`;
        const apiKeyHash = await bcrypt.hash(apiKey, this.SALT_ROUNDS);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.API_KEY_EXPIRY_DAYS);
        return { apiKey, apiKeyHash, expiresAt };
    }
    async verifyApiKey(deviceId, tenantId, apiKey) {
        const device = await this.prisma.attendanceDevice.findFirst({
            where: { deviceId, tenantId },
            select: {
                id: true,
                apiKeyHash: true,
                apiKey: true,
                apiKeyExpiresAt: true,
                isActive: true,
            },
        });
        if (!device || !device.isActive) {
            return false;
        }
        if (device.apiKeyExpiresAt && new Date() > device.apiKeyExpiresAt) {
            console.warn(`[DeviceSecurity] API Key expiree pour device ${deviceId}`);
            return false;
        }
        if (device.apiKeyHash) {
            return bcrypt.compare(apiKey, device.apiKeyHash);
        }
        if (device.apiKey) {
            return device.apiKey === apiKey;
        }
        return false;
    }
    async generateNewApiKey(id, tenantId, context) {
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
        await this.createAuditLog(tenantId, id, client_1.DeviceAction.API_KEY_GENERATED, context, { expiresAt: expiresAt.toISOString() });
        return { apiKey, expiresAt };
    }
    async rotateApiKey(id, tenantId, context) {
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
        await this.createAuditLog(tenantId, id, client_1.DeviceAction.API_KEY_ROTATED, context, {
            previousExpiry: device.apiKeyExpiresAt?.toISOString(),
            newExpiry: expiresAt.toISOString(),
        });
        return { apiKey, expiresAt };
    }
    async revokeApiKey(id, tenantId, context) {
        await this.findOne(id, tenantId);
        await this.prisma.attendanceDevice.update({
            where: { id },
            data: {
                apiKeyHash: null,
                apiKeyExpiresAt: null,
                apiKey: null,
            },
        });
        await this.createAuditLog(tenantId, id, client_1.DeviceAction.API_KEY_REVOKED, context);
    }
    async verifyIPWhitelist(deviceId, tenantId, clientIP) {
        const device = await this.prisma.attendanceDevice.findFirst({
            where: { deviceId, tenantId },
            select: {
                enforceIPWhitelist: true,
                allowedIPs: true,
            },
        });
        if (!device)
            return false;
        if (!device.enforceIPWhitelist)
            return true;
        if (!device.allowedIPs || device.allowedIPs.length === 0)
            return true;
        return device.allowedIPs.includes(clientIP);
    }
    async updateIPWhitelist(id, tenantId, allowedIPs, enforceIPWhitelist, context) {
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
        await this.createAuditLog(tenantId, id, client_1.DeviceAction.IP_WHITELIST_UPDATED, context, { ipCount: allowedIPs.length }, previousValue, { allowedIPs, enforceIPWhitelist });
        return updated;
    }
    async recordHeartbeat(deviceId, tenantId, clientIP) {
        const device = await this.prisma.attendanceDevice.findFirst({
            where: { deviceId, tenantId },
        });
        if (!device) {
            throw new common_1.NotFoundException('Terminal non trouve');
        }
        if (!device.isActive) {
            throw new common_1.ForbiddenException('Terminal desactive');
        }
        const now = new Date();
        const nextHeartbeat = new Date(now.getTime() + device.heartbeatInterval * 1000);
        await this.prisma.attendanceDevice.update({
            where: { id: device.id },
            data: {
                lastHeartbeat: now,
                lastSync: now,
            },
        });
        this.createAuditLog(tenantId, device.id, client_1.DeviceAction.HEARTBEAT, { ipAddress: clientIP }, { timestamp: now.toISOString() });
        return {
            status: 'OK',
            serverTime: now,
            nextHeartbeatExpected: nextHeartbeat,
        };
    }
    getConnectionStatus(device) {
        if (!device.isActive)
            return 'INACTIVE';
        const lastActivity = device.lastHeartbeat || device.lastSync;
        if (!lastActivity)
            return 'OFFLINE';
        const now = new Date();
        const diffMs = now.getTime() - new Date(lastActivity).getTime();
        const diffMinutes = diffMs / (1000 * 60);
        const warningThreshold = (device.heartbeatInterval || 300) / 60 * 2;
        const offlineThreshold = (device.heartbeatInterval || 300) / 60 * 6;
        if (diffMinutes <= warningThreshold)
            return 'ONLINE';
        if (diffMinutes <= offlineThreshold)
            return 'WARNING';
        return 'OFFLINE';
    }
    async create(tenantId, createDeviceDto, context) {
        const { generateApiKey: shouldGenerateApiKey, ...deviceData } = createDeviceDto;
        const existingDevice = await this.prisma.attendanceDevice.findFirst({
            where: {
                tenantId,
                deviceId: deviceData.deviceId,
            },
        });
        if (existingDevice) {
            throw new common_1.ConflictException('Un terminal avec cet ID existe deja');
        }
        let apiKeyData = {};
        let generatedApiKey = null;
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
        if (context) {
            await this.createAuditLog(tenantId, device.id, client_1.DeviceAction.CREATED, context, {
                deviceId: device.deviceId,
                deviceType: device.deviceType,
                hasApiKey: !!generatedApiKey,
            });
        }
        return {
            ...device,
            generatedApiKey,
        };
    }
    async findAll(tenantId, filters) {
        const where = { tenantId };
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
        return devices.map(device => ({
            ...device,
            connectionStatus: this.getConnectionStatus(device),
            hasApiKey: !!(device.apiKeyHash || device.apiKey),
            apiKeyExpired: device.apiKeyExpiresAt ? new Date() > device.apiKeyExpiresAt : false,
        }));
    }
    async findOne(id, tenantId) {
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
            throw new common_1.NotFoundException('Terminal non trouve');
        }
        return {
            ...device,
            connectionStatus: this.getConnectionStatus(device),
            hasApiKey: !!(device.apiKeyHash || device.apiKey),
            apiKeyExpired: device.apiKeyExpiresAt ? new Date() > device.apiKeyExpiresAt : false,
        };
    }
    async findByDeviceId(deviceId, tenantId) {
        return this.prisma.attendanceDevice.findFirst({
            where: {
                deviceId,
                tenantId,
            },
        });
    }
    async update(id, tenantId, updateDeviceDto, context) {
        const device = await this.findOne(id, tenantId);
        if (updateDeviceDto.deviceId) {
            const existingDevice = await this.prisma.attendanceDevice.findFirst({
                where: {
                    tenantId,
                    deviceId: updateDeviceDto.deviceId,
                    NOT: { id },
                },
            });
            if (existingDevice) {
                throw new common_1.ConflictException('Un terminal avec cet ID existe deja');
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
        let action = client_1.DeviceAction.UPDATED;
        if (updateDeviceDto.isActive !== undefined) {
            action = updateDeviceDto.isActive ? client_1.DeviceAction.ACTIVATED : client_1.DeviceAction.DEACTIVATED;
        }
        if (context) {
            await this.createAuditLog(tenantId, id, action, context, { changes: Object.keys(updateDeviceDto) }, previousValue, updateDeviceDto);
        }
        return {
            ...updated,
            connectionStatus: this.getConnectionStatus(updated),
        };
    }
    async remove(id, tenantId, context) {
        const device = await this.findOne(id, tenantId);
        if (context) {
            await this.createAuditLog(tenantId, id, client_1.DeviceAction.DELETED, context, {
                deviceId: device.deviceId,
                name: device.name,
                attendanceCount: device._count?.attendance || 0,
            });
        }
        return this.prisma.attendanceDevice.delete({
            where: { id },
        });
    }
    async getStats(tenantId) {
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
                case 'ONLINE':
                    online++;
                    break;
                case 'WARNING':
                    warning++;
                    break;
                case 'OFFLINE':
                    offline++;
                    break;
                case 'INACTIVE':
                    inactive++;
                    break;
            }
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
    async syncDevice(id, tenantId, context) {
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
            await this.createAuditLog(tenantId, id, client_1.DeviceAction.SYNCED, context);
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
    async activateDevice(id, tenantId, context) {
        const device = await this.findOne(id, tenantId);
        if (device.isActive) {
            throw new common_1.BadRequestException('Le terminal est deja actif');
        }
        const updated = await this.prisma.attendanceDevice.update({
            where: { id },
            data: { isActive: true },
            include: { site: true },
        });
        await this.createAuditLog(tenantId, id, client_1.DeviceAction.ACTIVATED, context, { previousStatus: false });
        return {
            ...updated,
            connectionStatus: this.getConnectionStatus(updated),
        };
    }
    async deactivateDevice(id, tenantId, context) {
        const device = await this.findOne(id, tenantId);
        if (!device.isActive) {
            throw new common_1.BadRequestException('Le terminal est deja desactive');
        }
        const updated = await this.prisma.attendanceDevice.update({
            where: { id },
            data: { isActive: false },
            include: { site: true },
        });
        await this.createAuditLog(tenantId, id, client_1.DeviceAction.DEACTIVATED, context, { previousStatus: true });
        return {
            ...updated,
            connectionStatus: this.getConnectionStatus(updated),
        };
    }
    async getAuditLogs(tenantId, filters) {
        const where = { tenantId };
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
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map