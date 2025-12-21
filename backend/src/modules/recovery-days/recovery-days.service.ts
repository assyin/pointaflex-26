import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRecoveryDayDto, ConvertOvertimeToRecoveryDayDto, UpdateRecoveryDayDto } from './dto/create-recovery-day.dto';
import { RecoveryDayStatus, OvertimeStatus } from '@prisma/client';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';

@Injectable()
export class RecoveryDaysService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcule le solde cumulé des heures supplémentaires approuvées et non converties
   */
  async getCumulativeBalance(tenantId: string, employeeId: string) {
    // Vérifier que l'employé existe
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const dailyWorkingHours = Number(settings?.dailyWorkingHours || 7.33);
    const conversionRate = Number(settings?.recoveryConversionRate || 1.0);

    // Récupérer tous les overtime approuvés
    const allOvertimeRecords = await this.prisma.overtime.findMany({
      where: {
        tenantId,
        employeeId,
        status: OvertimeStatus.APPROVED,
      },
      select: {
        id: true,
        hours: true,
        approvedHours: true,
        convertedHoursToRecovery: true,
        convertedHoursToRecoveryDays: true,
        date: true,
      },
      orderBy: { date: 'asc' }, // FIFO
    });

    // Calculer le solde cumulé
    let cumulativeHours = 0;
    const overtimeDetails = [];

    allOvertimeRecords.forEach((record) => {
      const approvedHours = Number(record.approvedHours || record.hours || 0);
      const convertedToRecovery = Number(record.convertedHoursToRecovery || 0);
      const convertedToRecoveryDays = Number(record.convertedHoursToRecoveryDays || 0);
      
      const availableHours = approvedHours - convertedToRecovery - convertedToRecoveryDays;
      
      if (availableHours > 0) {
        cumulativeHours += availableHours;
        overtimeDetails.push({
          id: record.id,
          date: record.date,
          approvedHours,
          convertedToRecovery,
          convertedToRecoveryDays,
          availableHours,
        });
      }
    });

    // Calculer le nombre de jours possibles
    const possibleDays = (cumulativeHours * conversionRate) / dailyWorkingHours;

    return {
      employeeId,
      cumulativeHours: Math.round(cumulativeHours * 100) / 100,
      dailyWorkingHours,
      conversionRate,
      possibleDays: Math.round(possibleDays * 100) / 100,
      overtimeDetails,
    };
  }

  /**
   * Convertit le solde cumulé d'heures supp en journées de récupération
   */
  async convertFromOvertime(
    tenantId: string,
    userId: string,
    dto: ConvertOvertimeToRecoveryDayDto,
  ) {
    // Vérifier que l'employé existe
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Récupérer le solde cumulé
    const balance = await this.getCumulativeBalance(tenantId, dto.employeeId);

    // Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const dailyWorkingHours = Number(settings?.dailyWorkingHours || 7.33);
    const conversionRate = Number(settings?.recoveryConversionRate || 1.0);

    // Calculer les heures nécessaires pour les jours demandés
    const requiredHours = (dto.days * dailyWorkingHours) / conversionRate;

    // Vérifier que le solde est suffisant
    if (requiredHours > balance.cumulativeHours) {
      throw new BadRequestException(
        `Solde insuffisant. Disponible: ${balance.cumulativeHours}h, Requis: ${requiredHours.toFixed(2)}h pour ${dto.days} jours`,
      );
    }

    // Valider les dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('La date de début doit être antérieure à la date de fin');
    }

    // Vérifier les chevauchements avec les congés
    await this.validateNoConflicts(tenantId, dto.employeeId, startDate, endDate);

    // Récupérer les overtime disponibles (FIFO)
    const allOvertimeRecords = await this.prisma.overtime.findMany({
      where: {
        tenantId,
        employeeId: dto.employeeId,
        status: OvertimeStatus.APPROVED,
      },
      orderBy: { date: 'asc' },
    });

    // Filtrer ceux qui ont encore des heures disponibles
    const overtimeRecords = allOvertimeRecords.filter((record) => {
      const approvedHours = Number(record.approvedHours || record.hours || 0);
      const convertedToRecovery = record.convertedToRecovery ? Number(record.convertedHoursToRecovery || 0) : 0;
      const convertedToRecoveryDays = record.convertedToRecoveryDays ? Number(record.convertedHoursToRecoveryDays || 0) : 0;
      const availableHours = approvedHours - convertedToRecovery - convertedToRecoveryDays;
      return availableHours > 0;
    });

    // Créer la journée de récupération
    const recoveryDay = await this.prisma.recoveryDay.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        startDate,
        endDate,
        days: dto.days,
        sourceHours: requiredHours,
        conversionRate,
        status: RecoveryDayStatus.PENDING,
        notes: dto.notes,
      },
    });

    // Attribuer les heures supp (FIFO)
    let remainingHours = requiredHours;
    const overtimeRecoveryDayLinks = [];

    for (const overtime of overtimeRecords) {
      if (remainingHours <= 0) break;

      const approvedHours = Number(overtime.approvedHours || overtime.hours || 0);
      const convertedToRecovery = Number(overtime.convertedHoursToRecovery || 0);
      const convertedToRecoveryDays = Number(overtime.convertedHoursToRecoveryDays || 0);
      const availableHours = approvedHours - convertedToRecovery - convertedToRecoveryDays;

      if (availableHours > 0) {
        const hoursToUse = Math.min(remainingHours, availableHours);

        // Créer le lien
        const link = await this.prisma.overtimeRecoveryDay.create({
          data: {
            overtimeId: overtime.id,
            recoveryDayId: recoveryDay.id,
            hoursUsed: hoursToUse,
          },
        });

        overtimeRecoveryDayLinks.push(link);

        // Mettre à jour l'overtime
        const newConvertedHours = convertedToRecoveryDays + hoursToUse;
        const isFullyConverted = newConvertedHours >= approvedHours;

        await this.prisma.overtime.update({
          where: { id: overtime.id },
          data: {
            convertedToRecoveryDays: isFullyConverted,
            convertedHoursToRecoveryDays: newConvertedHours,
            status: isFullyConverted ? OvertimeStatus.RECOVERED : overtime.status,
          },
        });

        remainingHours -= hoursToUse;
      }
    }

    return {
      ...recoveryDay,
      overtimeSources: overtimeRecoveryDayLinks,
    };
  }

  /**
   * Valide qu'il n'y a pas de conflits avec les congés ou autres récupérations
   */
  private async validateNoConflicts(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Vérifier les chevauchements avec les congés approuvés
    const conflictingLeaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: ['APPROVED', 'HR_APPROVED', 'MANAGER_APPROVED'],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (conflictingLeaves.length > 0) {
      const dates = conflictingLeaves
        .map(
          (l) =>
            `${l.startDate.toISOString().split('T')[0]} - ${l.endDate.toISOString().split('T')[0]}`,
        )
        .join(', ');
      throw new ConflictException(
        `Conflit avec des congés existants : ${dates}. Veuillez choisir d'autres dates.`,
      );
    }

    // Vérifier les chevauchements avec d'autres récupérations approuvées
    const conflictingRecoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId,
        status: {
          in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.PENDING],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (conflictingRecoveryDays.length > 0) {
      const dates = conflictingRecoveryDays
        .map(
          (rd) =>
            `${rd.startDate.toISOString().split('T')[0]} - ${rd.endDate.toISOString().split('T')[0]}`,
        )
        .join(', ');
      throw new ConflictException(
        `Conflit avec des récupérations existantes : ${dates}. Veuillez choisir d'autres dates.`,
      );
    }
  }

  /**
   * Crée une journée de récupération manuelle (sans conversion depuis heures supp)
   */
  async create(tenantId: string, dto: CreateRecoveryDayDto) {
    // Vérifier que l'employé existe
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('La date de début doit être antérieure à la date de fin');
    }

    // Valider les conflits
    await this.validateNoConflicts(tenantId, dto.employeeId, startDate, endDate);

    return this.prisma.recoveryDay.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        startDate,
        endDate,
        days: dto.days,
        sourceHours: dto.sourceHours || 0,
        conversionRate: dto.conversionRate,
        status: RecoveryDayStatus.PENDING,
        notes: dto.notes,
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
   * Liste les journées de récupération
   */
  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: {
      employeeId?: string;
      status?: RecoveryDayStatus;
      startDate?: string;
      endDate?: string;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Filtrer par permissions
    const hasViewAll = userPermissions?.includes('overtime.view_all');
    const hasViewOwn = userPermissions?.includes('overtime.view_own');

    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      if (managerLevel.type === 'DEPARTMENT' || managerLevel.type === 'SITE') {
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
      } else if (hasViewOwn) {
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });
        if (employee) {
          where.employeeId = employee.id;
        } else {
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

    if (filters?.startDate || filters?.endDate) {
      where.OR = [];
      if (filters.startDate) {
        where.OR.push({
          endDate: { gte: new Date(filters.startDate) },
        });
      }
      if (filters.endDate) {
        where.OR.push({
          startDate: { lte: new Date(filters.endDate) },
        });
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.recoveryDay.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
            },
          },
          overtimeSources: {
            include: {
              overtime: {
                select: {
                  id: true,
                  date: true,
                  hours: true,
                  approvedHours: true,
                },
              },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.recoveryDay.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupère une journée de récupération par ID
   */
  async findOne(tenantId: string, id: string) {
    const recoveryDay = await this.prisma.recoveryDay.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
          },
        },
        overtimeSources: {
          include: {
            overtime: {
              select: {
                id: true,
                date: true,
                hours: true,
                approvedHours: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!recoveryDay) {
      throw new NotFoundException('Recovery day not found');
    }

    return recoveryDay;
  }

  /**
   * Met à jour une journée de récupération
   */
  async update(tenantId: string, id: string, dto: UpdateRecoveryDayDto) {
    const recoveryDay = await this.findOne(tenantId, id);

    // Seulement si PENDING
    if (recoveryDay.status !== RecoveryDayStatus.PENDING) {
      throw new BadRequestException('Can only update pending recovery days');
    }

    const updateData: any = {};

    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }
    if (dto.days !== undefined) {
      updateData.days = dto.days;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Valider les dates si modifiées
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate || recoveryDay.startDate;
      const endDate = updateData.endDate || recoveryDay.endDate;

      if (startDate > endDate) {
        throw new BadRequestException('La date de début doit être antérieure à la date de fin');
      }

      // Valider les conflits (exclure la récupération actuelle)
      await this.validateNoConflicts(tenantId, recoveryDay.employeeId, startDate, endDate);
    }

    return this.prisma.recoveryDay.update({
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
   * Approuve une journée de récupération
   */
  async approve(tenantId: string, id: string, userId: string) {
    const recoveryDay = await this.findOne(tenantId, id);

    if (recoveryDay.status !== RecoveryDayStatus.PENDING) {
      throw new BadRequestException('Can only approve pending recovery days');
    }

    return this.prisma.recoveryDay.update({
      where: { id },
      data: {
        status: RecoveryDayStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
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
   * Annule une journée de récupération (retourne les heures au solde)
   */
  async cancel(tenantId: string, id: string) {
    const recoveryDay = await this.findOne(tenantId, id);

    if (recoveryDay.status === RecoveryDayStatus.USED) {
      throw new BadRequestException('Cannot cancel used recovery days');
    }

    // Récupérer les liens avec les overtime
    const overtimeLinks = await this.prisma.overtimeRecoveryDay.findMany({
      where: { recoveryDayId: id },
      include: { overtime: true },
    });

    // Retourner les heures au solde pour chaque overtime
    for (const link of overtimeLinks) {
      const overtime = link.overtime;
      const currentConverted = Number(overtime.convertedHoursToRecoveryDays || 0);
      const hoursToReturn = Number(link.hoursUsed);

      const newConverted = Math.max(0, currentConverted - hoursToReturn);
      const isFullyConverted = newConverted <= 0;

      await this.prisma.overtime.update({
        where: { id: overtime.id },
        data: {
          convertedToRecoveryDays: !isFullyConverted,
          convertedHoursToRecoveryDays: newConverted,
          status: isFullyConverted && overtime.status === OvertimeStatus.RECOVERED
            ? OvertimeStatus.APPROVED
            : overtime.status,
        },
      });
    }

    // Supprimer les liens
    await this.prisma.overtimeRecoveryDay.deleteMany({
      where: { recoveryDayId: id },
    });

    // Marquer comme annulé
    return this.prisma.recoveryDay.update({
      where: { id },
      data: {
        status: RecoveryDayStatus.CANCELLED,
      },
    });
  }

  /**
   * Récupère les journées de récupération d'un employé
   */
  async getEmployeeRecoveryDays(
    tenantId: string,
    employeeId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      tenantId,
      employeeId,
    };

    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        where.OR.push({
          endDate: { gte: new Date(startDate) },
        });
      }
      if (endDate) {
        where.OR.push({
          startDate: { lte: new Date(endDate) },
        });
      }
    }

    return this.prisma.recoveryDay.findMany({
      where,
      include: {
        overtimeSources: {
          include: {
            overtime: {
              select: {
                id: true,
                date: true,
                hours: true,
                approvedHours: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Récupère le solde et l'historique des journées de récupération d'un employé
   */
  async getEmployeeBalance(tenantId: string, employeeId: string) {
    const recoveryDays = await this.getEmployeeRecoveryDays(tenantId, employeeId);

    const totalDays = recoveryDays.reduce((sum, rd) => sum + Number(rd.days), 0);
    const approvedDays = recoveryDays
      .filter((rd) => rd.status === RecoveryDayStatus.APPROVED)
      .reduce((sum, rd) => sum + Number(rd.days), 0);
    const usedDays = recoveryDays
      .filter((rd) => rd.status === RecoveryDayStatus.USED)
      .reduce((sum, rd) => sum + Number(rd.days), 0);
    const pendingDays = recoveryDays
      .filter((rd) => rd.status === RecoveryDayStatus.PENDING)
      .reduce((sum, rd) => sum + Number(rd.days), 0);

    return {
      employeeId,
      totalDays,
      approvedDays,
      usedDays,
      pendingDays,
      availableDays: approvedDays - usedDays,
      recoveryDays,
    };
  }
}
