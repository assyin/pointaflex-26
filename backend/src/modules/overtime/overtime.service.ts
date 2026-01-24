import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { OvertimeStatus, LeaveStatus, RecoveryDayStatus } from '@prisma/client';
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

  /**
   * Récupère le taux de majoration selon le type d'heures supplémentaires
   * et la configuration du tenant
   * @param settings Configuration du tenant (TenantSettings)
   * @param overtimeType Type d'heures supplémentaires (STANDARD, NIGHT, HOLIDAY, EMERGENCY)
   * @returns Taux de majoration (1.0 si majorations désactivées)
   */
  getOvertimeRate(settings: any, overtimeType: string): number {
    // Si les majorations sont désactivées, retourner 1.0 (pas de majoration)
    const majorationEnabled = settings?.overtimeMajorationEnabled !== false;
    if (!majorationEnabled) {
      return 1.0;
    }

    // Utiliser les nouveaux champs configurables avec fallback sur les anciens
    switch (overtimeType) {
      case 'NIGHT':
        // Nouveau champ > Ancien champ > Valeur par défaut
        return Number(
          settings?.overtimeRateNight ??
          settings?.nightShiftRate ??
          1.50
        );
      case 'HOLIDAY':
        // Nouveau champ > Ancien champ (holidayOvertimeRate) > Valeur par défaut
        return Number(
          settings?.overtimeRateHoliday ??
          settings?.holidayOvertimeRate ??
          2.00
        );
      case 'EMERGENCY':
        return Number(settings?.overtimeRateEmergency ?? 1.30);
      case 'STANDARD':
      default:
        // Nouveau champ > Ancien champ > Valeur par défaut
        return Number(
          settings?.overtimeRateStandard ??
          settings?.overtimeRate ??
          1.25
        );
    }
  }

  /**
   * Vérifie les plafonds d'heures supplémentaires pour un employé
   * Retourne un objet avec les informations sur les limites
   */
  async checkOvertimeLimits(
    tenantId: string,
    employeeId: string,
    newHours: number,
    date: Date,
  ): Promise<{
    exceedsLimit: boolean;
    message?: string;
    adjustedHours?: number;
    monthlyUsed?: number;
    monthlyLimit?: number;
    weeklyUsed?: number;
    weeklyLimit?: number;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        maxOvertimeHoursPerMonth: true,
        maxOvertimeHoursPerWeek: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const result: {
      exceedsLimit: boolean;
      message?: string;
      adjustedHours?: number;
      monthlyUsed?: number;
      monthlyLimit?: number;
      weeklyUsed?: number;
      weeklyLimit?: number;
    } = {
      exceedsLimit: false,
    };

    // Vérifier plafond mensuel
    if (employee.maxOvertimeHoursPerMonth) {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthlyOvertime = await this.prisma.overtime.aggregate({
        where: {
          tenantId,
          employeeId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: {
            in: ['APPROVED', 'PAID', 'RECOVERED'],
          },
        },
        _sum: {
          approvedHours: true,
          hours: true,
        },
      });

      const monthlyUsed =
        monthlyOvertime._sum.approvedHours?.toNumber() ||
        monthlyOvertime._sum.hours?.toNumber() ||
        0;
      const monthlyLimit = employee.maxOvertimeHoursPerMonth.toNumber();

      result.monthlyUsed = monthlyUsed;
      result.monthlyLimit = monthlyLimit;

      if (monthlyUsed + newHours > monthlyLimit) {
        const remaining = monthlyLimit - monthlyUsed;
        if (remaining <= 0) {
          result.exceedsLimit = true;
          result.message = `Plafond mensuel atteint (${monthlyUsed.toFixed(2)}h / ${monthlyLimit.toFixed(2)}h)`;
        } else {
          result.adjustedHours = remaining;
          result.message = `Plafond mensuel partiellement atteint. ${remaining.toFixed(2)}h acceptées, ${(newHours - remaining).toFixed(2)}h rejetées`;
        }
      }
    }

    // Vérifier plafond hebdomadaire
    if (employee.maxOvertimeHoursPerWeek) {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Dimanche
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weeklyOvertime = await this.prisma.overtime.aggregate({
        where: {
          tenantId,
          employeeId,
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
          status: {
            in: ['APPROVED', 'PAID', 'RECOVERED'],
          },
        },
        _sum: {
          approvedHours: true,
          hours: true,
        },
      });

      const weeklyUsed =
        weeklyOvertime._sum.approvedHours?.toNumber() ||
        weeklyOvertime._sum.hours?.toNumber() ||
        0;
      const weeklyLimit = employee.maxOvertimeHoursPerWeek.toNumber();

      result.weeklyUsed = weeklyUsed;
      result.weeklyLimit = weeklyLimit;

      const adjustedHours = result.adjustedHours ?? newHours;

      if (weeklyUsed + adjustedHours > weeklyLimit) {
        const remaining = weeklyLimit - weeklyUsed;
        if (remaining <= 0) {
          result.exceedsLimit = true;
          result.message = `Plafond hebdomadaire atteint (${weeklyUsed.toFixed(2)}h / ${weeklyLimit.toFixed(2)}h)`;
        } else {
          result.adjustedHours = Math.min(remaining, result.adjustedHours ?? newHours);
          result.message = `Plafond hebdomadaire partiellement atteint. ${result.adjustedHours.toFixed(2)}h acceptées, ${(adjustedHours - result.adjustedHours).toFixed(2)}h rejetées`;
        }
      }
    }

    return result;
  }

  async create(tenantId: string, dto: CreateOvertimeDto) {
    // Verify employee belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
      select: {
        id: true,
        isEligibleForOvertime: true,
        maxOvertimeHoursPerMonth: true,
        maxOvertimeHoursPerWeek: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Vérifier l'éligibilité de l'employé
    if (employee.isEligibleForOvertime === false) {
      throw new BadRequestException(
        'Cet employé n\'est pas éligible aux heures supplémentaires',
      );
    }

    // Vérifier si l'employé est en congé ou en récupération pour cette date
    const overtimeDate = new Date(dto.date);
    const leaveCheck = await this.isEmployeeOnLeaveOrRecovery(
      tenantId,
      dto.employeeId,
      overtimeDate,
    );

    if (leaveCheck.isOnLeave) {
      throw new BadRequestException(
        `Impossible de créer des heures supplémentaires : l'employé est ${leaveCheck.reason} pour cette date`,
      );
    }

    // Get tenant settings for default rates and rounding
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    // Determine type: use dto.type if provided, otherwise infer from isNightShift (backward compatibility)
    const overtimeType = dto.type || (dto.isNightShift ? 'NIGHT' : 'STANDARD');

    // Determine rate based on type and tenant configuration
    let rate = dto.rate;
    if (!rate) {
      rate = this.getOvertimeRate(settings, overtimeType);
    }

    // Vérifier les plafonds si configurés
    let hoursToCreate = dto.hours;
    if (employee.maxOvertimeHoursPerMonth || employee.maxOvertimeHoursPerWeek) {
      const limitsCheck = await this.checkOvertimeLimits(
        tenantId,
        dto.employeeId,
        dto.hours,
        new Date(dto.date),
      );

      if (limitsCheck.exceedsLimit) {
        throw new BadRequestException(
          limitsCheck.message || 'Plafond d\'heures supplémentaires atteint',
        );
      }

      // Si le plafond est partiellement atteint, ajuster les heures
      if (limitsCheck.adjustedHours !== undefined && limitsCheck.adjustedHours < dto.hours) {
        hoursToCreate = limitsCheck.adjustedHours;
      }
    }

    // Appliquer l'arrondi aux heures supplémentaires
    const roundingMinutes = settings?.overtimeRounding || 15;
    const roundedHours = this.roundOvertimeHours(hoursToCreate, roundingMinutes);

    return this.prisma.overtime.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hours: roundedHours, // Utiliser les heures ajustées si plafond partiel
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
        convertedToRecoveryDays: true,
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

  /**
   * Annuler l'approbation d'une heure supplémentaire (APPROVED → PENDING)
   * Permet au manager de reconsidérer une approbation
   */
  async revokeApproval(tenantId: string, id: string, userId: string, reason?: string) {
    const overtime = await this.findOne(tenantId, id);

    if (overtime.status !== OvertimeStatus.APPROVED) {
      throw new BadRequestException(
        'Seules les heures supplémentaires approuvées peuvent être annulées'
      );
    }

    // Vérifier qu'il n'y a pas de conversion en cours
    if (overtime.convertedToRecovery || overtime.convertedToRecoveryDays) {
      throw new BadRequestException(
        'Impossible d\'annuler l\'approbation: les heures ont déjà été converties en récupération'
      );
    }

    return this.prisma.overtime.update({
      where: { id },
      data: {
        status: OvertimeStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
        approvedHours: null,
        notes: overtime.notes
          ? `${overtime.notes}\n[Approbation annulée le ${new Date().toISOString().split('T')[0]}${reason ? ': ' + reason : ''}]`
          : `[Approbation annulée le ${new Date().toISOString().split('T')[0]}${reason ? ': ' + reason : ''}]`,
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

  /**
   * Annuler le rejet d'une heure supplémentaire (REJECTED → PENDING)
   * Permet de reconsidérer une demande après appel de l'employé
   */
  async revokeRejection(tenantId: string, id: string, userId: string, reason?: string) {
    const overtime = await this.findOne(tenantId, id);

    if (overtime.status !== OvertimeStatus.REJECTED) {
      throw new BadRequestException(
        'Seules les heures supplémentaires rejetées peuvent être réouvertes'
      );
    }

    return this.prisma.overtime.update({
      where: { id },
      data: {
        status: OvertimeStatus.PENDING,
        rejectionReason: null,
        notes: overtime.notes
          ? `${overtime.notes}\n[Rejet annulé le ${new Date().toISOString().split('T')[0]}${reason ? ': ' + reason : ''}]`
          : `[Rejet annulé le ${new Date().toISOString().split('T')[0]}${reason ? ': ' + reason : ''}]`,
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

  /**
   * Modifier les heures approuvées d'une heure supplémentaire
   * Permet de corriger une erreur de saisie
   */
  async updateApprovedHours(
    tenantId: string,
    id: string,
    userId: string,
    newApprovedHours: number,
    reason?: string,
  ) {
    const overtime = await this.findOne(tenantId, id);

    if (overtime.status !== OvertimeStatus.APPROVED) {
      throw new BadRequestException(
        'Seules les heures supplémentaires approuvées peuvent être modifiées'
      );
    }

    // Vérifier qu'il n'y a pas de conversion en cours
    if (overtime.convertedToRecovery || overtime.convertedToRecoveryDays) {
      throw new BadRequestException(
        'Impossible de modifier: les heures ont déjà été converties en récupération'
      );
    }

    if (newApprovedHours <= 0) {
      throw new BadRequestException('Le nombre d\'heures doit être supérieur à 0');
    }

    const oldHours = Number(overtime.approvedHours || overtime.hours);

    return this.prisma.overtime.update({
      where: { id },
      data: {
        approvedHours: newApprovedHours,
        notes: overtime.notes
          ? `${overtime.notes}\n[Heures modifiées le ${new Date().toISOString().split('T')[0]}: ${oldHours}h → ${newApprovedHours}h${reason ? ' - ' + reason : ''}]`
          : `[Heures modifiées le ${new Date().toISOString().split('T')[0]}: ${oldHours}h → ${newApprovedHours}h${reason ? ' - ' + reason : ''}]`,
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

  /**
   * Récupérer les informations de récupération liées à un overtime
   */
  async getRecoveryInfo(tenantId: string, id: string) {
    const overtime = await this.findOne(tenantId, id);

    if (overtime.status !== OvertimeStatus.RECOVERED) {
      return { hasRecoveryDays: false, recoveryDays: [], hasPastDates: false };
    }

    const overtimeRecoveryLinks = await this.prisma.overtimeRecoveryDay.findMany({
      where: { overtimeId: id },
      include: {
        recoveryDay: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recoveryDays = overtimeRecoveryLinks.map(link => ({
      id: link.recoveryDay.id,
      startDate: link.recoveryDay.startDate,
      endDate: link.recoveryDay.endDate,
      status: link.recoveryDay.status,
      hoursUsed: Number(link.hoursUsed), // hoursUsed est sur OvertimeRecoveryDay
      sourceHours: Number(link.recoveryDay.sourceHours),
      isPast: new Date(link.recoveryDay.startDate) < today,
    }));

    return {
      hasRecoveryDays: recoveryDays.length > 0,
      recoveryDays,
      hasPastDates: recoveryDays.some(rd => rd.isPast),
    };
  }

  /**
   * Annuler la conversion d'une heure supplémentaire (RECOVERED → APPROVED)
   * Restaure les heures et annule le jour de récupération associé
   * @param reason Justification obligatoire si la date de récupération est passée
   */
  async cancelConversion(tenantId: string, id: string, userId: string, reason?: string) {
    const overtime = await this.findOne(tenantId, id);

    if (overtime.status !== OvertimeStatus.RECOVERED) {
      throw new BadRequestException(
        'Seules les heures supplémentaires converties (RECOVERED) peuvent être annulées'
      );
    }

    // Trouver les liens OvertimeRecoveryDay pour cet overtime
    const overtimeRecoveryLinks = await this.prisma.overtimeRecoveryDay.findMany({
      where: { overtimeId: id },
      include: {
        recoveryDay: true,
      },
    });

    if (overtimeRecoveryLinks.length === 0) {
      throw new BadRequestException(
        'Aucune récupération liée trouvée pour ces heures supplémentaires'
      );
    }

    // Vérifier que les recovery days ne sont pas déjà utilisés
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let hasPastDates = false;
    const pastDates: string[] = [];

    for (const link of overtimeRecoveryLinks) {
      if (link.recoveryDay.status === 'USED') {
        throw new BadRequestException(
          `Impossible d'annuler: le jour de récupération du ${link.recoveryDay.startDate.toISOString().split('T')[0]} a déjà été utilisé`
        );
      }

      // Vérifier si la date est passée
      if (new Date(link.recoveryDay.startDate) < today) {
        hasPastDates = true;
        pastDates.push(link.recoveryDay.startDate.toISOString().split('T')[0]);
      }
    }

    // Si dates passées, la justification est obligatoire
    if (hasPastDates && (!reason || reason.trim().length < 10)) {
      throw new BadRequestException(
        `La date de récupération est passée (${pastDates.join(', ')}). Une justification d'au moins 10 caractères est obligatoire.`
      );
    }

    // Effectuer l'annulation dans une transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Récupérer les IDs des recovery days liés
      const recoveryDayIds = [...new Set(overtimeRecoveryLinks.map(link => link.recoveryDayId))];

      // 2. Trouver TOUS les overtimes liés à ces recovery days (pas seulement celui cliqué)
      const allLinkedOvertimeLinks = await tx.overtimeRecoveryDay.findMany({
        where: { recoveryDayId: { in: recoveryDayIds } },
        select: { overtimeId: true },
      });
      const allLinkedOvertimeIds = [...new Set(allLinkedOvertimeLinks.map(link => link.overtimeId))];

      const cancelNote = hasPastDates
        ? `[Annulé le ${new Date().toISOString().split('T')[0]}] Conversion annulée (date passée). Motif: ${reason}`
        : `[Annulé le ${new Date().toISOString().split('T')[0]}] Conversion annulée par le manager`;

      // 3. Annuler les recovery days
      for (const recoveryDayId of recoveryDayIds) {
        await tx.recoveryDay.update({
          where: { id: recoveryDayId },
          data: {
            status: 'CANCELLED',
            notes: cancelNote,
          },
        });
      }

      // 4. Supprimer TOUS les liens OvertimeRecoveryDay pour ces recovery days
      await tx.overtimeRecoveryDay.deleteMany({
        where: { recoveryDayId: { in: recoveryDayIds } },
      });

      // 5. Restaurer TOUS les overtimes liés en APPROVED
      const overtimeNote = hasPastDates
        ? `[Conversion annulée le ${new Date().toISOString().split('T')[0]} - DATE PASSÉE] Motif: ${reason}`
        : `[Conversion annulée le ${new Date().toISOString().split('T')[0]}]`;

      // Mettre à jour tous les overtimes liés
      await tx.overtime.updateMany({
        where: { id: { in: allLinkedOvertimeIds } },
        data: {
          status: OvertimeStatus.APPROVED,
          convertedToRecovery: false,
          convertedToRecoveryDays: false,
          convertedHoursToRecoveryDays: 0,
        },
      });

      // Récupérer l'overtime principal avec ses infos pour le retour
      const updatedOvertime = await tx.overtime.findUnique({
        where: { id },
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

      return {
        overtime: updatedOvertime,
        cancelledRecoveryDays: recoveryDayIds.length,
        restoredOvertimes: allLinkedOvertimeIds.length,
        restoredOvertimeIds: allLinkedOvertimeIds,
        hasPastDates,
        pastDates,
      };
    });
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

  /**
   * Récupère les statistiques du dashboard heures supplémentaires
   */
  async getDashboardStats(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      siteId?: string;
      departmentId?: string;
    },
    userId: string,
    userPermissions: string[],
  ) {
    // Construire le filtre de base
    const where: any = { tenantId };

    if (filters.startDate) {
      where.date = { ...where.date, gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.date = { ...where.date, lte: new Date(filters.endDate) };
    }

    // Filtrer par site/département si spécifié
    if (filters.siteId || filters.departmentId) {
      where.employee = {};
      if (filters.siteId) {
        where.employee.siteId = filters.siteId;
      }
      if (filters.departmentId) {
        where.employee.departmentId = filters.departmentId;
      }
    }

    // Filtrer selon les permissions (comme dans findAll)
    const hasViewAll = userPermissions.includes('overtime.view_all');
    const hasViewDepartment = userPermissions.includes('overtime.view_department');

    if (!hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
      if (hasViewDepartment && managedEmployeeIds.length > 0) {
        where.employeeId = { in: managedEmployeeIds };
      } else {
        // Ne voir que ses propres heures sup
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });
        where.employeeId = employee?.id || 'none';
      }
    }

    // Récupérer toutes les données pour les statistiques
    const overtimes = await this.prisma.overtime.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // 1. Totaux généraux
    const summary = {
      totalRecords: overtimes.length,
      totalHours: 0,
      totalApprovedHours: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      paidCount: 0,
      recoveredCount: 0,
    };

    // 2. Par type (pour pie chart)
    const byType: Record<string, { count: number; hours: number }> = {
      STANDARD: { count: 0, hours: 0 },
      NIGHT: { count: 0, hours: 0 },
      HOLIDAY: { count: 0, hours: 0 },
      EMERGENCY: { count: 0, hours: 0 },
    };

    // 3. Par status (pour pie chart)
    const byStatus: Record<string, { count: number; hours: number }> = {
      PENDING: { count: 0, hours: 0 },
      APPROVED: { count: 0, hours: 0 },
      REJECTED: { count: 0, hours: 0 },
      PAID: { count: 0, hours: 0 },
      RECOVERED: { count: 0, hours: 0 },
    };

    // 4. Par employé (pour bar chart - top 10)
    const byEmployee: Record<string, { name: string; hours: number; count: number }> = {};

    // 5. Par département (pour bar chart)
    const byDepartment: Record<string, { name: string; hours: number; count: number }> = {};

    // 6. Tendance par jour (pour line chart)
    const byDay: Record<string, { date: string; hours: number; count: number }> = {};

    // Parcourir les données
    for (const ot of overtimes) {
      const hours = Number(ot.hours) || 0;
      const approvedHours = Number(ot.approvedHours || ot.hours) || 0;

      // Summary
      summary.totalHours += hours;
      if (ot.status === 'APPROVED' || ot.status === 'PAID' || ot.status === 'RECOVERED') {
        summary.totalApprovedHours += approvedHours;
      }

      switch (ot.status) {
        case 'PENDING': summary.pendingCount++; break;
        case 'APPROVED': summary.approvedCount++; break;
        case 'REJECTED': summary.rejectedCount++; break;
        case 'PAID': summary.paidCount++; break;
        case 'RECOVERED': summary.recoveredCount++; break;
      }

      // By type
      if (byType[ot.type]) {
        byType[ot.type].count++;
        byType[ot.type].hours += hours;
      }

      // By status
      if (byStatus[ot.status]) {
        byStatus[ot.status].count++;
        byStatus[ot.status].hours += hours;
      }

      // By employee
      const empKey = ot.employeeId;
      if (!byEmployee[empKey]) {
        byEmployee[empKey] = {
          name: `${ot.employee.firstName} ${ot.employee.lastName}`,
          hours: 0,
          count: 0,
        };
      }
      byEmployee[empKey].hours += hours;
      byEmployee[empKey].count++;

      // By department
      const deptKey = ot.employee.department?.id || 'unknown';
      const deptName = ot.employee.department?.name || 'Sans département';
      if (!byDepartment[deptKey]) {
        byDepartment[deptKey] = { name: deptName, hours: 0, count: 0 };
      }
      byDepartment[deptKey].hours += hours;
      byDepartment[deptKey].count++;

      // By day (trend)
      const dateKey = ot.date.toISOString().split('T')[0];
      if (!byDay[dateKey]) {
        byDay[dateKey] = { date: dateKey, hours: 0, count: 0 };
      }
      byDay[dateKey].hours += hours;
      byDay[dateKey].count++;
    }

    // Convertir et trier les données
    const typeData = Object.entries(byType)
      .map(([type, data]) => ({ type, ...data }))
      .filter(d => d.count > 0);

    const statusData = Object.entries(byStatus)
      .map(([status, data]) => ({ status, ...data }))
      .filter(d => d.count > 0);

    const employeeData = Object.entries(byEmployee)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10); // Top 10

    const departmentData = Object.entries(byDepartment)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.hours - a.hours);

    const trendData = Object.values(byDay).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return {
      summary: {
        ...summary,
        totalHours: Math.round(summary.totalHours * 100) / 100,
        totalApprovedHours: Math.round(summary.totalApprovedHours * 100) / 100,
      },
      byType: typeData,
      byStatus: statusData,
      topEmployees: employeeData.map(e => ({
        ...e,
        hours: Math.round(e.hours * 100) / 100,
      })),
      byDepartment: departmentData.map(d => ({
        ...d,
        hours: Math.round(d.hours * 100) / 100,
      })),
      trend: trendData.map(t => ({
        ...t,
        hours: Math.round(t.hours * 100) / 100,
      })),
    };
  }

  /**
   * Vérifie si un employé est en congé ou en récupération pour une date donnée
   * @param tenantId L'ID du tenant
   * @param employeeId L'ID de l'employé
   * @param date La date à vérifier
   * @returns Un objet avec isOnLeave et reason si applicable
   */
  async isEmployeeOnLeaveOrRecovery(
    tenantId: string,
    employeeId: string,
    date: Date,
  ): Promise<{ isOnLeave: boolean; reason?: string }> {
    // Vérifier les congés approuvés
    const approvedLeaveStatuses = [
      LeaveStatus.APPROVED,
      LeaveStatus.MANAGER_APPROVED,
      LeaveStatus.HR_APPROVED,
    ];

    const leave = await this.prisma.leave.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: approvedLeaveStatuses },
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: {
        leaveType: { select: { name: true } },
      },
    });

    if (leave) {
      return {
        isOnLeave: true,
        reason: `en congé (${leave.leaveType.name})`,
      };
    }

    // Vérifier les jours de récupération approuvés ou utilisés
    const recoveryDay = await this.prisma.recoveryDay.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED] },
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (recoveryDay) {
      return {
        isOnLeave: true,
        reason: 'en jour de récupération',
      };
    }

    return { isOnLeave: false };
  }
}
