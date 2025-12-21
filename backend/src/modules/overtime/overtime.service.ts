import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { OvertimeStatus } from '@prisma/client';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';

@Injectable()
export class OvertimeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Arrondit les heures supplémentaires selon la configuration du tenant
   * @param hours Heures en décimal (ex: 1.75 pour 1h45)
   * @param roundingMinutes Minutes d'arrondi (15, 30, ou 60)
   * @returns Heures arrondies
   */
  private roundOvertimeHours(hours: number, roundingMinutes: number): number {
    if (roundingMinutes <= 0) return hours;
    
    const totalMinutes = hours * 60;
    const roundedMinutes = Math.round(totalMinutes / roundingMinutes) * roundingMinutes;
    return roundedMinutes / 60;
  }

  async create(tenantId: string, dto: CreateOvertimeDto) {
    // Verify employee belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get tenant settings for default rates and rounding
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    // Determine type: use dto.type if provided, otherwise infer from isNightShift (backward compatibility)
    const overtimeType = dto.type || (dto.isNightShift ? 'NIGHT' : 'STANDARD');

    // Determine rate based on type
    let rate = dto.rate;
    if (!rate) {
      if (overtimeType === 'NIGHT') {
        rate = Number(settings?.nightShiftRate || 1.5);
      } else if (overtimeType === 'HOLIDAY') {
        rate = Number(settings?.overtimeRate || 1.25) * 1.5; // 50% de majoration pour jours fériés
      } else if (overtimeType === 'EMERGENCY') {
        rate = Number(settings?.overtimeRate || 1.25) * 1.3; // 30% de majoration pour urgences
      } else {
        rate = Number(settings?.overtimeRate || 1.25);
      }
    }

    // Appliquer l'arrondi aux heures supplémentaires
    const roundingMinutes = settings?.overtimeRounding || 15;
    const roundedHours = this.roundOvertimeHours(dto.hours, roundingMinutes);

    return this.prisma.overtime.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hours: roundedHours,
        type: overtimeType as any,
        isNightShift: overtimeType === 'NIGHT', // Keep for backward compatibility
        rate,
        notes: dto.notes,
        status: OvertimeStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: {
      employeeId?: string;
      status?: OvertimeStatus;
      startDate?: string;
      endDate?: string;
      isNightShift?: boolean;
      type?: string;
      siteId?: string;
      departmentId?: string;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Filtrer par employé si l'utilisateur n'a que la permission 'overtime.view_own'
    const hasViewAll = userPermissions?.includes('overtime.view_all');
    const hasViewOwn = userPermissions?.includes('overtime.view_own');
    const hasViewDepartment = userPermissions?.includes('overtime.view_department');
    const hasViewSite = userPermissions?.includes('overtime.view_site');

    // IMPORTANT: Détecter si l'utilisateur est un manager, mais seulement s'il n'a pas 'view_all'
    // Les admins avec 'view_all' doivent voir toutes les données, indépendamment de leur statut de manager
    // PRIORITÉ: La permission 'view_all' prime sur le statut de manager
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
      if (managerLevel.type === 'DEPARTMENT') {
        // Manager de département : filtrer par les employés du département
        // IMPORTANT: Ne pas filtrer par isActive pour inclure toutes les demandes historiques
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'SITE') {
        // Manager régional : filtrer par les employés du site ET département
        // IMPORTANT: Inclure toutes les demandes des employés gérés, même historiques
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        
        // Debug log (à retirer en production)
        if (process.env.NODE_ENV === 'development') {
          console.log('[OvertimeService] Manager SITE - Managed Employee IDs:', managedEmployeeIds);
          console.log('[OvertimeService] Manager SITE - Site IDs:', managerLevel.siteIds);
          console.log('[OvertimeService] Manager SITE - Department ID:', managerLevel.departmentId);
        }
        
        if (managedEmployeeIds.length === 0) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        
        // Filtrer par les employés gérés - cela inclura toutes leurs demandes d'overtime
        // même si elles ont été créées avant leur affectation au site/département
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'TEAM') {
        // Manager d'équipe : filtrer par l'équipe de l'utilisateur
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { teamId: true },
        });

        if (employee?.teamId) {
          // Récupérer tous les employés de la même équipe
          const teamMembers = await this.prisma.employee.findMany({
            where: { teamId: employee.teamId, tenantId },
            select: { id: true },
          });

          where.employeeId = {
            in: teamMembers.map(m => m.id),
          };
        } else {
          // Si pas d'équipe, retourner vide
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
      } else if (!hasViewAll && hasViewOwn) {
        // Si pas manager et a seulement 'view_own', filtrer par son propre ID
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });

        if (employee) {
          where.employeeId = employee.id;
        } else {
          // Si pas d'employé lié, retourner vide
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
      }
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.isNightShift !== undefined) {
      where.isNightShift = filters.isNightShift;
    }

    if (filters?.type) {
      where.type = filters.type as any;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    // Filtrer par site et département (seulement si employeeId n'est pas spécifié)
    // Si employeeId est spécifié, ces filtres sont ignorés car employeeId est plus spécifique
    if (!filters?.employeeId) {
      const employeeFilters: any = {};
      
      if (filters?.siteId) {
        employeeFilters.siteId = filters.siteId;
      }
      
      if (filters?.departmentId) {
        employeeFilters.departmentId = filters.departmentId;
      }
      
      if (Object.keys(employeeFilters).length > 0) {
        where.employee = employeeFilters;
      }
    }

    // Debug log (à retirer en production)
    if (process.env.NODE_ENV === 'development') {
      console.log('[OvertimeService] Final where clause:', JSON.stringify(where, null, 2));
      console.log('[OvertimeService] Filters:', filters);
      console.log('[OvertimeService] Pagination:', { page, limit, skip });
    }

    const [data, total, totalHoursAggregate] = await Promise.all([
      this.prisma.overtime.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          date: true,
          hours: true,
          approvedHours: true,
          type: true,
          isNightShift: true,
          rate: true,
          convertedToRecovery: true,
          recoveryId: true,
          status: true,
          rejectionReason: true,
          notes: true,
          approvedBy: true,
          approvedAt: true,
          createdAt: true,
          updatedAt: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              site: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.overtime.count({ where }),
      // OPTIMISATION: Utiliser aggregate au lieu de findMany pour calculer les totaux
      this.prisma.overtime.aggregate({
        where,
        _sum: {
          hours: true,
          approvedHours: true,
        },
      }),
    ]);

    // Debug log (à retirer en production)
    if (process.env.NODE_ENV === 'development') {
      console.log('[OvertimeService] Found records:', data.length, 'Total:', total);
      console.log('[OvertimeService] Total hours aggregate:', totalHoursAggregate);
    }

    // OPTIMISATION: Utiliser les résultats de l'aggregate au lieu de calculer manuellement
    // Utiliser approvedHours si disponible, sinon hours
    const totalHours = totalHoursAggregate._sum.approvedHours 
      ? (typeof totalHoursAggregate._sum.approvedHours === 'object' && 'toNumber' in totalHoursAggregate._sum.approvedHours
          ? (totalHoursAggregate._sum.approvedHours as any).toNumber()
          : typeof totalHoursAggregate._sum.approvedHours === 'string'
          ? parseFloat(totalHoursAggregate._sum.approvedHours)
          : totalHoursAggregate._sum.approvedHours)
      : (totalHoursAggregate._sum.hours
          ? (typeof totalHoursAggregate._sum.hours === 'object' && 'toNumber' in totalHoursAggregate._sum.hours
              ? (totalHoursAggregate._sum.hours as any).toNumber()
              : typeof totalHoursAggregate._sum.hours === 'string'
              ? parseFloat(totalHoursAggregate._sum.hours)
              : totalHoursAggregate._sum.hours)
          : 0);

    // Transformer les Decimal en nombres pour garantir la cohérence de sérialisation JSON
    const transformedData = data.map((record) => ({
      ...record,
      hours: typeof record.hours === 'object' && 'toNumber' in record.hours
        ? (record.hours as any).toNumber()
        : typeof record.hours === 'string'
        ? parseFloat(record.hours)
        : record.hours,
      approvedHours: record.approvedHours
        ? (typeof record.approvedHours === 'object' && 'toNumber' in record.approvedHours
            ? (record.approvedHours as any).toNumber()
            : typeof record.approvedHours === 'string'
            ? parseFloat(record.approvedHours)
            : record.approvedHours)
        : null,
      rate: typeof record.rate === 'object' && 'toNumber' in record.rate
        ? (record.rate as any).toNumber()
        : typeof record.rate === 'string'
        ? parseFloat(record.rate)
        : record.rate,
    }));

    return {
      data: transformedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalHours, // Ajouter le total des heures calculé sur toutes les données
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const overtime = await this.prisma.overtime.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        date: true,
        hours: true,
        approvedHours: true,
        type: true,
        isNightShift: true,
        rate: true,
        convertedToRecovery: true,
        recoveryId: true,
        status: true,
        rejectionReason: true,
        notes: true,
        approvedBy: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            position: true,
            email: true,
          },
        },
      },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime record not found');
    }

    return overtime;
  }

  async update(tenantId: string, id: string, dto: UpdateOvertimeDto) {
    const overtime = await this.findOne(tenantId, id);

    // Only allow updates if overtime is still pending
    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Cannot update overtime that is not pending');
    }

    // Get tenant settings for rounding
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const updateData: any = {};
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.hours !== undefined) {
      // Appliquer l'arrondi aux heures supplémentaires
      const roundingMinutes = settings?.overtimeRounding || 15;
      updateData.hours = this.roundOvertimeHours(dto.hours, roundingMinutes);
    }
    if (dto.type) {
      updateData.type = dto.type;
      // Update isNightShift for backward compatibility
      updateData.isNightShift = dto.type === 'NIGHT';
    } else if (dto.isNightShift !== undefined) {
      updateData.isNightShift = dto.isNightShift;
      // Infer type from isNightShift if type not provided
      updateData.type = dto.isNightShift ? 'NIGHT' : 'STANDARD';
    }
    if (dto.rate !== undefined) updateData.rate = dto.rate;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.overtime.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        date: true,
        hours: true,
        approvedHours: true,
        type: true,
        isNightShift: true,
        rate: true,
        convertedToRecovery: true,
        recoveryId: true,
        status: true,
        rejectionReason: true,
        notes: true,
        approvedBy: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
    });
  }

  async approve(
    tenantId: string,
    id: string,
    userId: string,
    dto: ApproveOvertimeDto,
  ) {
    const overtime = await this.findOne(tenantId, id);

    // Only allow approval/rejection if overtime is pending
    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Overtime can only be approved or rejected when pending');
    }

    // Validate rejection reason if status is REJECTED
    if (dto.status === OvertimeStatus.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('Rejection reason is required when rejecting overtime');
    }

    // Si des heures personnalisées sont fournies et que le statut est APPROVED, les utiliser
    const updateData: any = {
      status: dto.status,
      approvedBy: dto.status === OvertimeStatus.APPROVED ? userId : undefined,
      approvedAt: dto.status === OvertimeStatus.APPROVED ? new Date() : undefined,
      rejectionReason: dto.status === OvertimeStatus.REJECTED ? dto.rejectionReason : null,
    };

    // Si le manager a personnalisé le nombre d'heures validées
    if (dto.status === OvertimeStatus.APPROVED && dto.approvedHours !== undefined) {
      updateData.approvedHours = dto.approvedHours;
    }

    return this.prisma.overtime.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        date: true,
        hours: true,
        approvedHours: true,
        type: true,
        isNightShift: true,
        rate: true,
        convertedToRecovery: true,
        recoveryId: true,
        status: true,
        rejectionReason: true,
        notes: true,
        approvedBy: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
    });
  }

  async convertToRecovery(tenantId: string, id: string, conversionRate?: number, expiryDays?: number) {
    const overtime = await this.findOne(tenantId, id);

    // Only convert approved overtime
    if (overtime.status !== OvertimeStatus.APPROVED) {
      throw new BadRequestException('Only approved overtime can be converted to recovery');
    }

    // Check if already converted
    if (overtime.convertedToRecovery) {
      throw new BadRequestException('Overtime already converted to recovery');
    }

    // Get tenant settings for conversion rate and expiry
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    // Utiliser les heures approuvées si disponibles, sinon les heures demandées
    const hoursDecimal = overtime.approvedHours || overtime.hours;

    // Convert Decimal to number
    let hoursToConvert: number;
    if (typeof hoursDecimal === 'object' && hoursDecimal !== null && 'toNumber' in hoursDecimal) {
      hoursToConvert = (hoursDecimal as any).toNumber();
    } else if (typeof hoursDecimal === 'string') {
      hoursToConvert = parseFloat(hoursDecimal);
    } else {
      hoursToConvert = Number(hoursDecimal);
    }

    // Apply conversion rate if provided (default 1:1)
    const rate = conversionRate || Number(settings?.recoveryConversionRate || 1.0);
    const recoveryHours = hoursToConvert * rate;

    // Calculate expiry date (default: 1 year from now)
    const expiryDaysValue = expiryDays || Number(settings?.recoveryExpiryDays || 365);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDaysValue);

    // Create recovery record
    const recovery = await this.prisma.recovery.create({
      data: {
        tenantId,
        employeeId: overtime.employee.id,
        hours: recoveryHours,
        source: 'OVERTIME',
        usedHours: 0,
        remainingHours: recoveryHours,
        expiryDate,
      },
    });

    // Update overtime record
    await this.prisma.overtime.update({
      where: { id },
      data: {
        convertedToRecovery: true,
        recoveryId: recovery.id,
        status: OvertimeStatus.RECOVERED, // Update status to RECOVERED
      },
    });

    return recovery;
  }

  async getBalance(tenantId: string, employeeId: string) {
    // Verify employee belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get all overtime records for this employee
    const overtimeRecords = await this.prisma.overtime.findMany({
      where: {
        tenantId,
        employeeId,
      },
      select: {
        hours: true,
        approvedHours: true,
        status: true,
        convertedToRecovery: true,
        date: true,
      },
    });

    // Calculate totals
    let totalRequested = 0;
    let totalApproved = 0;
    let totalPending = 0;
    let totalRejected = 0;
    let totalPaid = 0;
    let totalRecovered = 0;

    overtimeRecords.forEach((record) => {
      const hours = typeof record.hours === 'object' && 'toNumber' in record.hours
        ? (record.hours as any).toNumber()
        : typeof record.hours === 'string'
        ? parseFloat(record.hours)
        : record.hours;

      const approvedHours = record.approvedHours
        ? (typeof record.approvedHours === 'object' && 'toNumber' in record.approvedHours
            ? (record.approvedHours as any).toNumber()
            : typeof record.approvedHours === 'string'
            ? parseFloat(record.approvedHours)
            : record.approvedHours)
        : hours;

      totalRequested += hours;

      switch (record.status) {
        case OvertimeStatus.PENDING:
          totalPending += hours;
          break;
        case OvertimeStatus.APPROVED:
          totalApproved += approvedHours;
          break;
        case OvertimeStatus.REJECTED:
          totalRejected += hours;
          break;
        case OvertimeStatus.PAID:
          totalPaid += approvedHours;
          break;
        case OvertimeStatus.RECOVERED:
          totalRecovered += approvedHours;
          break;
      }
    });

    return {
      employeeId,
      totalRequested,
      totalApproved,
      totalPending,
      totalRejected,
      totalPaid,
      totalRecovered,
      availableForConversion: totalApproved - totalRecovered - totalPaid,
    };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.overtime.delete({
      where: { id },
    });
  }
}
