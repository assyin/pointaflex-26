import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DataGeneratorSchedulesService {
  private readonly logger = new Logger(DataGeneratorSchedulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Générer des plannings pour une période donnée
   */
  async generateSchedules(tenantId: string, dto: any) {
    this.logger.log(`Génération de plannings pour le tenant ${tenantId} du ${dto.startDate} au ${dto.endDate}`);

    const stats = {
      schedulesCreated: 0,
      schedulesSkipped: 0,
      employeesProcessed: 0,
      weekendsExcluded: 0,
      holidaysExcluded: 0,
    };

    // Validation des dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      throw new BadRequestException('La date de début doit être antérieure à la date de fin');
    }

    // Récupérer les employés
    let employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(dto.employeeIds && dto.employeeIds.length > 0
          ? { id: { in: dto.employeeIds } }
          : {}),
      },
      include: {
        currentShift: true,
      },
    });

    if (employees.length === 0) {
      throw new BadRequestException('Aucun employé actif trouvé');
    }

    // Récupérer les shifts
    let shifts = await this.prisma.shift.findMany({
      where: {
        tenantId,
        ...(dto.shiftIds && dto.shiftIds.length > 0
          ? { id: { in: dto.shiftIds } }
          : {}),
      },
    });

    if (shifts.length === 0) {
      throw new BadRequestException('Aucun shift trouvé. Veuillez d\'abord créer des shifts.');
    }

    // Récupérer les jours fériés si exclusion activée
    const excludeHolidays = dto.excludeHolidays !== false;
    let holidays: any[] = [];
    if (excludeHolidays) {
      holidays = await this.prisma.holiday.findMany({
        where: {
          tenantId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      this.logger.log(`${holidays.length} jours fériés trouvés pour exclusion`);
    }

    // Récupérer les plannings existants pour éviter les doublons
    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        employeeId: true,
        date: true,
        shiftId: true,
      },
    });

    const existingMap = new Map<string, boolean>();
    existingSchedules.forEach(s => {
      const key = `${s.employeeId}-${s.date.toISOString().split('T')[0]}-${s.shiftId}`;
      existingMap.set(key, true);
    });

    // Distribution des shifts
    const shiftDistribution = dto.shiftDistribution || {};
    const workDaysPercentage = dto.workDaysPercentage || 80;
    const excludeWeekends = dto.excludeWeekends !== false;

    // Générer les dates
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Vérifier si c'est un weekend
      if (excludeWeekends && isWeekend) {
        stats.weekendsExcluded++;
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Vérifier si c'est un jour férié
      const isHoliday = holidays.some(h => {
        const holidayDate = new Date(h.date);
        return holidayDate.toDateString() === currentDate.toDateString();
      });

      if (excludeHolidays && isHoliday) {
        stats.holidaysExcluded++;
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.logger.log(`${dates.length} jours à traiter (après exclusions)`);

    // Générer les plannings pour chaque employé
    for (const employee of employees) {
      stats.employeesProcessed++;

      // PRIORITÉ 1: Utiliser le shift déjà assigné à l'employé (currentShift)
      // C'est la méthode principale - utilise les shifts déjà assignés lors de la génération de shifts
      let assignedShift = employee.currentShift;
      
      // Si l'employé a un shift assigné, l'utiliser directement
      if (assignedShift) {
        this.logger.debug(`Utilisation du shift assigné (${assignedShift.name}) pour l'employé ${employee.id}`);
      } else {
        // PRIORITÉ 2: Si pas de shift assigné et distribution spécifiée, utiliser la distribution
        if (Object.keys(shiftDistribution).length > 0) {
          const random = Math.random() * 100;
          let cumulative = 0;
          for (const [shiftId, percentage] of Object.entries(shiftDistribution)) {
            cumulative += Number(percentage);
            if (random <= cumulative) {
              assignedShift = shifts.find(s => s.id === shiftId);
              this.logger.debug(`Assignation via distribution: ${assignedShift?.name} pour l'employé ${employee.id}`);
              break;
            }
          }
        }

        // PRIORITÉ 3: Si shiftIds spécifiés, prendre un shift aléatoire parmi ceux-là
        if (!assignedShift && dto.shiftIds && dto.shiftIds.length > 0) {
          const availableShifts = shifts.filter(s => dto.shiftIds!.includes(s.id));
          if (availableShifts.length > 0) {
            assignedShift = availableShifts[Math.floor(Math.random() * availableShifts.length)];
            this.logger.debug(`Assignation aléatoire parmi shifts sélectionnés: ${assignedShift.name} pour l'employé ${employee.id}`);
          }
        }

        // PRIORITÉ 4: Si toujours pas de shift, prendre un shift aléatoire parmi tous
        if (!assignedShift) {
          if (shifts.length === 0) {
            this.logger.warn(`Aucun shift disponible pour l'employé ${employee.id} - employé ignoré`);
            continue;
          }
          assignedShift = shifts[Math.floor(Math.random() * shifts.length)];
          this.logger.debug(`Assignation aléatoire: ${assignedShift.name} pour l'employé ${employee.id}`);
        }
      }

      // Si l'employé n'a toujours pas de shift, on le saute
      if (!assignedShift) {
        this.logger.warn(`Impossible d'assigner un shift à l'employé ${employee.id} - employé ignoré`);
        continue;
      }

      // Générer les plannings pour cet employé
      for (const date of dates) {
        // Probabilité de travailler ce jour (workDaysPercentage)
        if (Math.random() * 100 > workDaysPercentage) {
          continue;
        }

        const dateKey = date.toISOString().split('T')[0];
        const existingKey = `${employee.id}-${dateKey}-${assignedShift.id}`;

        // Vérifier si le planning existe déjà
        if (existingMap.has(existingKey)) {
          stats.schedulesSkipped++;
          continue;
        }

        // Créer le planning
        try {
          await this.prisma.schedule.create({
            data: {
              tenantId,
              employeeId: employee.id,
              shiftId: assignedShift.id,
              date: new Date(date),
            },
          });

          stats.schedulesCreated++;
          existingMap.set(existingKey, true);
        } catch (error: any) {
          this.logger.warn(`Erreur lors de la création du planning pour ${employee.id} le ${dateKey}: ${error.message}`);
          stats.schedulesSkipped++;
        }
      }
    }

    this.logger.log(
      `Génération terminée: ${stats.schedulesCreated} créés, ${stats.schedulesSkipped} ignorés, ` +
      `${stats.weekendsExcluded} weekends exclus, ${stats.holidaysExcluded} jours fériés exclus`
    );

    return {
      success: true,
      ...stats,
    };
  }

  /**
   * Obtenir les statistiques des plannings
   */
  async getSchedulesStats(tenantId: string) {
    const totalSchedules = await this.prisma.schedule.count({
      where: { tenantId },
    });

    const schedulesByShift = await this.prisma.schedule.groupBy({
      by: ['shiftId'],
      where: { tenantId },
      _count: true,
    });

    const schedulesByEmployee = await this.prisma.schedule.groupBy({
      by: ['employeeId'],
      where: { tenantId },
      _count: true,
    });

    // Récupérer les noms des shifts
    const shiftIds = schedulesByShift.map(s => s.shiftId);
    const shifts = await this.prisma.shift.findMany({
      where: {
        id: { in: shiftIds },
        tenantId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    const shiftMap = new Map(shifts.map(s => [s.id, s]));

    return {
      totalSchedules,
      byShift: schedulesByShift.map(s => ({
        shiftId: s.shiftId,
        shiftName: shiftMap.get(s.shiftId)?.name || 'Inconnu',
        shiftCode: shiftMap.get(s.shiftId)?.code || '',
        count: s._count,
      })),
      employeesWithSchedules: schedulesByEmployee.length,
      averageSchedulesPerEmployee: schedulesByEmployee.length > 0
        ? Math.round(totalSchedules / schedulesByEmployee.length)
        : 0,
    };
  }

  /**
   * Supprimer tous les plannings générés
   */
  async cleanSchedules(tenantId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const result = await this.prisma.schedule.deleteMany({ where });

    return {
      success: true,
      deletedCount: result.count,
    };
  }
}

