import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplementaryDayDto, SupplementaryDayType } from './dto/create-supplementary-day.dto';
import { ApproveSupplementaryDayDto, ApprovalStatus } from './dto/approve-supplementary-day.dto';
import { OvertimeStatus, SupplementaryDayType as PrismaSupplementaryDayType } from '@prisma/client';

@Injectable()
export class SupplementaryDaysService {
  private readonly logger = new Logger(SupplementaryDaysService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Créer un jour supplémentaire
   */
  async create(tenantId: string, dto: CreateSupplementaryDayDto) {
    // Vérifier que l'employé existe et appartient au tenant
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Employé non trouvé');
    }

    // Vérifier qu'il n'existe pas déjà un jour supplémentaire pour cette date
    const existing = await this.prisma.supplementaryDay.findFirst({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
      },
    });

    if (existing) {
      throw new BadRequestException('Un jour supplémentaire existe déjà pour cette date');
    }

    return this.prisma.supplementaryDay.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hours: dto.hours,
        type: dto.type as PrismaSupplementaryDayType,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
        source: dto.source || 'MANUAL',
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

  /**
   * Récupérer tous les jours supplémentaires avec filtres et pagination
   */
  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    filters: {
      employeeId?: string;
      status?: OvertimeStatus;
      type?: SupplementaryDayType;
      startDate?: string;
      endDate?: string;
      siteId?: string;
      departmentId?: string;
    } = {},
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    // Filtrer par site ou département via l'employé
    if (filters.siteId || filters.departmentId) {
      where.employee = {};
      if (filters.siteId) {
        where.employee.siteId = filters.siteId;
      }
      if (filters.departmentId) {
        where.employee.departmentId = filters.departmentId;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.supplementaryDay.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              site: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.supplementaryDay.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un jour supplémentaire par ID
   */
  async findOne(tenantId: string, id: string) {
    const supplementaryDay = await this.prisma.supplementaryDay.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
            site: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!supplementaryDay) {
      throw new NotFoundException('Jour supplémentaire non trouvé');
    }

    return supplementaryDay;
  }

  /**
   * Approuver ou rejeter un jour supplémentaire
   */
  async approve(tenantId: string, id: string, userId: string, dto: ApproveSupplementaryDayDto) {
    const supplementaryDay = await this.findOne(tenantId, id);

    if (supplementaryDay.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Seuls les jours en attente peuvent être traités');
    }

    const updateData: any = {
      status: dto.status === ApprovalStatus.APPROVED ? OvertimeStatus.APPROVED : OvertimeStatus.REJECTED,
      approvedBy: userId,
      approvedAt: new Date(),
    };

    if (dto.status === ApprovalStatus.APPROVED) {
      updateData.approvedHours = dto.approvedHours ?? supplementaryDay.hours;
    } else {
      updateData.rejectionReason = dto.rejectionReason;
    }

    return this.prisma.supplementaryDay.update({
      where: { id },
      data: updateData,
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
   * Convertir un jour supplémentaire en récupération
   * Même logique que pour les heures supplémentaires
   */
  async convertToRecovery(tenantId: string, id: string) {
    const supplementaryDay = await this.findOne(tenantId, id);

    if (supplementaryDay.status !== OvertimeStatus.APPROVED) {
      throw new BadRequestException('Seuls les jours approuvés peuvent être convertis');
    }

    if (supplementaryDay.convertedToRecovery || supplementaryDay.convertedToRecoveryDays) {
      throw new BadRequestException('Ce jour a déjà été converti en récupération');
    }

    // Marquer comme converti (la création du RecoveryDay se fait via le module flexible)
    return this.prisma.supplementaryDay.update({
      where: { id },
      data: {
        status: OvertimeStatus.RECOVERED,
        convertedToRecovery: true,
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
   * Supprimer un jour supplémentaire (seulement si PENDING)
   */
  async remove(tenantId: string, id: string) {
    const supplementaryDay = await this.findOne(tenantId, id);

    if (supplementaryDay.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Seuls les jours en attente peuvent être supprimés');
    }

    await this.prisma.supplementaryDay.delete({ where: { id } });

    return { message: 'Jour supplémentaire supprimé avec succès' };
  }

  /**
   * Statistiques du dashboard pour les jours supplémentaires
   */
  async getDashboardStats(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      siteId?: string;
      departmentId?: string;
    } = {},
  ) {
    const where: any = { tenantId };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    if (filters.siteId || filters.departmentId) {
      where.employee = {};
      if (filters.siteId) {
        where.employee.siteId = filters.siteId;
      }
      if (filters.departmentId) {
        where.employee.departmentId = filters.departmentId;
      }
    }

    // Statistiques par statut
    const [pending, approved, rejected, recovered] = await Promise.all([
      this.prisma.supplementaryDay.count({ where: { ...where, status: OvertimeStatus.PENDING } }),
      this.prisma.supplementaryDay.count({ where: { ...where, status: OvertimeStatus.APPROVED } }),
      this.prisma.supplementaryDay.count({ where: { ...where, status: OvertimeStatus.REJECTED } }),
      this.prisma.supplementaryDay.count({ where: { ...where, status: OvertimeStatus.RECOVERED } }),
    ]);

    // Total des heures
    const totalHours = await this.prisma.supplementaryDay.aggregate({
      where: { ...where, status: { in: [OvertimeStatus.APPROVED, OvertimeStatus.RECOVERED] } },
      _sum: { approvedHours: true },
    });

    // Par type
    const byType = await this.prisma.supplementaryDay.groupBy({
      by: ['type'],
      where,
      _count: true,
      _sum: { hours: true },
    });

    return {
      counts: {
        pending,
        approved,
        rejected,
        recovered,
        total: pending + approved + rejected + recovered,
      },
      totalApprovedHours: Number(totalHours._sum.approvedHours || 0),
      byType: byType.map(item => ({
        type: item.type,
        count: item._count,
        hours: Number(item._sum.hours || 0),
      })),
    };
  }

  /**
   * Actions de rectification - Annuler l'approbation
   */
  async revokeApproval(tenantId: string, id: string, userId: string, reason?: string) {
    const supplementaryDay = await this.findOne(tenantId, id);

    if (supplementaryDay.status !== OvertimeStatus.APPROVED) {
      throw new BadRequestException('Seuls les jours approuvés peuvent être annulés');
    }

    if (supplementaryDay.convertedToRecovery || supplementaryDay.convertedToRecoveryDays) {
      throw new BadRequestException('Impossible d\'annuler: le jour a déjà été converti en récupération');
    }

    const note = reason
      ? `[Approbation annulée le ${new Date().toISOString().split('T')[0]}] Motif: ${reason}`
      : `[Approbation annulée le ${new Date().toISOString().split('T')[0]}]`;

    return this.prisma.supplementaryDay.update({
      where: { id },
      data: {
        status: OvertimeStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
        approvedHours: null,
        notes: supplementaryDay.notes ? `${supplementaryDay.notes}\n${note}` : note,
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
   * Actions de rectification - Annuler le rejet
   */
  async revokeRejection(tenantId: string, id: string, userId: string, reason?: string) {
    const supplementaryDay = await this.findOne(tenantId, id);

    if (supplementaryDay.status !== OvertimeStatus.REJECTED) {
      throw new BadRequestException('Seuls les jours rejetés peuvent être reconsidérés');
    }

    const note = reason
      ? `[Rejet annulé le ${new Date().toISOString().split('T')[0]}] Motif: ${reason}`
      : `[Rejet annulé le ${new Date().toISOString().split('T')[0]}]`;

    return this.prisma.supplementaryDay.update({
      where: { id },
      data: {
        status: OvertimeStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        notes: supplementaryDay.notes ? `${supplementaryDay.notes}\n${note}` : note,
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

  // ============================================
  // DÉTECTION AUTOMATIQUE DEPUIS POINTAGES
  // ============================================

  /**
   * Détecte si une date est un jour supplémentaire (weekend ou férié)
   */
  async isSupplementaryDay(
    tenantId: string,
    date: Date,
  ): Promise<{ isSupplementary: boolean; type: PrismaSupplementaryDayType | null }> {
    const dayOfWeek = date.getDay(); // 0 = Dimanche, 6 = Samedi

    // Vérifier si c'est un jour férié
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const holiday = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (holiday) {
      return { isSupplementary: true, type: PrismaSupplementaryDayType.HOLIDAY };
    }

    // Vérifier si c'est un weekend
    if (dayOfWeek === 0) {
      return { isSupplementary: true, type: PrismaSupplementaryDayType.WEEKEND_SUNDAY };
    }
    if (dayOfWeek === 6) {
      return { isSupplementary: true, type: PrismaSupplementaryDayType.WEEKEND_SATURDAY };
    }

    return { isSupplementary: false, type: null };
  }

  /**
   * Crée automatiquement un jour supplémentaire à partir d'un pointage OUT
   * Appelé par le service Attendance lors d'un pointage OUT
   */
  async createAutoSupplementaryDay(params: {
    tenantId: string;
    employeeId: string;
    attendanceId: string;
    date: Date;
    checkIn: Date;
    checkOut: Date;
    hoursWorked: number;
  }): Promise<{ created: boolean; supplementaryDay?: any; reason?: string }> {
    const { tenantId, employeeId, attendanceId, date, checkIn, checkOut, hoursWorked } = params;

    try {
      // 1. Déterminer le type de jour supplémentaire
      // SHIFT DE NUIT: Priorité au checkIn (date de début du travail)
      // Exemple: IN samedi 22:00, OUT dimanche 06:00 → WEEKEND_SATURDAY (basé sur samedi)
      // Exemple: IN vendredi 22:00, OUT samedi 06:00 → WEEKEND_SATURDAY (basé sur samedi car vendredi = normal)

      let finalType: PrismaSupplementaryDayType | null = null;
      let referenceDate = checkIn || date;

      // Vérifier d'abord la date du checkIn
      const checkInResult = await this.isSupplementaryDay(tenantId, checkIn || date);

      if (checkInResult.isSupplementary && checkInResult.type) {
        finalType = checkInResult.type;
        referenceDate = checkIn || date;
        this.logger.debug(`[SupplementaryDay] Type basé sur IN: ${finalType}`);
      } else {
        // Si le IN n'est pas un jour supp, vérifier le OUT (cas vendredi soir → samedi matin)
        const checkOutResult = await this.isSupplementaryDay(tenantId, checkOut || date);

        if (checkOutResult.isSupplementary && checkOutResult.type) {
          finalType = checkOutResult.type;
          referenceDate = checkOut || date;
          this.logger.debug(`[SupplementaryDay] Type basé sur OUT: ${finalType}`);
        }
      }

      if (!finalType) {
        return { created: false, reason: 'Ce n\'est pas un weekend ni un jour férié' };
      }

      // 2. Vérifier si l'employé est éligible aux jours supplémentaires
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: {
          id: true,
          isEligibleForOvertime: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!employee) {
        return { created: false, reason: 'Employé non trouvé' };
      }

      if (!employee.isEligibleForOvertime) {
        this.logger.debug(
          `[SupplementaryDay] ${employee.firstName} ${employee.lastName} n'est pas éligible aux jours supplémentaires`,
        );
        return { created: false, reason: 'Employé non éligible' };
      }

      // 3. Vérifier qu'il n'existe pas déjà un jour supplémentaire pour cette date
      // Utiliser referenceDate (date du checkIn ou checkOut selon le cas shift de nuit)
      const startOfDay = new Date(referenceDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(referenceDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await this.prisma.supplementaryDay.findFirst({
        where: {
          tenantId,
          employeeId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (existing) {
        this.logger.debug(
          `[SupplementaryDay] Jour supplémentaire déjà existant pour ${employee.firstName} ${employee.lastName} le ${referenceDate.toISOString().split('T')[0]}`,
        );
        return { created: false, reason: 'Jour supplémentaire déjà existant', supplementaryDay: existing };
      }

      // 4. Vérifier si l'employé est en congé ce jour-là
      const leave = await this.prisma.leave.findFirst({
        where: {
          tenantId,
          employeeId,
          startDate: { lte: referenceDate },
          endDate: { gte: referenceDate },
          status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
        },
      });

      if (leave) {
        this.logger.debug(
          `[SupplementaryDay] ${employee.firstName} ${employee.lastName} est en congé le ${referenceDate.toISOString().split('T')[0]}`,
        );
        return { created: false, reason: 'Employé en congé' };
      }

      // 5. Vérifier seuil minimum (ex: 30 min / 0.5h)
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
      });

      const minimumThreshold = Number(settings?.overtimeMinimumThreshold || 30) / 60; // en heures

      if (hoursWorked < minimumThreshold) {
        this.logger.debug(
          `[SupplementaryDay] Heures insuffisantes (${hoursWorked}h < ${minimumThreshold}h) pour ${employee.firstName} ${employee.lastName}`,
        );
        return { created: false, reason: `Heures insuffisantes (< ${minimumThreshold}h)` };
      }

      // 6. Créer le jour supplémentaire
      const supplementaryDay = await this.prisma.supplementaryDay.create({
        data: {
          tenantId,
          employeeId,
          date: startOfDay,
          hours: hoursWorked,
          type: finalType,
          source: 'AUTO_DETECTED',
          checkIn,
          checkOut,
          attendanceId,
          status: OvertimeStatus.PENDING,
          notes: `Détecté automatiquement depuis pointage`,
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

      this.logger.log(
        `✅ [SupplementaryDay] Créé automatiquement: ${employee.firstName} ${employee.lastName}, ` +
        `${referenceDate.toISOString().split('T')[0]}, ${hoursWorked.toFixed(2)}h, type=${finalType}`,
      );

      return { created: true, supplementaryDay };
    } catch (error) {
      this.logger.error(
        `[SupplementaryDay] Erreur création auto: ${error.message}`,
        error.stack,
      );
      return { created: false, reason: `Erreur: ${error.message}` };
    }
  }

  /**
   * Détecte et crée les jours supplémentaires manquants pour une période
   * Utilisé par le job batch de consolidation
   */
  async detectMissingSupplementaryDays(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ created: number; existing: number; skipped: number; errors: number }> {
    const stats = { created: 0, existing: 0, skipped: 0, errors: 0 };

    // Récupérer tous les pointages OUT de la période avec heures travaillées
    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        type: 'OUT',
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        hoursWorked: { gt: 0 },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isEligibleForOvertime: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.log(
      `[DetectSupplementaryDays] Analyse de ${attendances.length} pointages OUT du ${startDate.toISOString().split('T')[0]} au ${endDate.toISOString().split('T')[0]}`,
    );

    for (const attendance of attendances) {
      const attendanceDate = new Date(attendance.timestamp);

      // Vérifier si c'est un jour supplémentaire
      const { isSupplementary, type } = await this.isSupplementaryDay(tenantId, attendanceDate);

      if (!isSupplementary) {
        continue; // Pas un weekend/férié
      }

      // Trouver le pointage IN correspondant
      const checkInAttendance = await this.prisma.attendance.findFirst({
        where: {
          tenantId,
          employeeId: attendance.employeeId,
          type: 'IN',
          timestamp: {
            gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
            lt: attendance.timestamp,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      const checkIn = checkInAttendance?.timestamp || attendance.timestamp;
      const hoursWorked = Number(attendance.hoursWorked || 0);

      const result = await this.createAutoSupplementaryDay({
        tenantId,
        employeeId: attendance.employeeId,
        attendanceId: attendance.id,
        date: attendanceDate,
        checkIn,
        checkOut: attendance.timestamp,
        hoursWorked,
      });

      if (result.created) {
        stats.created++;
      } else if (result.reason === 'Jour supplémentaire déjà existant') {
        stats.existing++;
      } else if (result.reason?.startsWith('Erreur')) {
        stats.errors++;
      } else {
        stats.skipped++;
      }
    }

    this.logger.log(
      `[DetectSupplementaryDays] Résultat: ${stats.created} créés, ${stats.existing} existants, ${stats.skipped} ignorés, ${stats.errors} erreurs`,
    );

    return stats;
  }
}
