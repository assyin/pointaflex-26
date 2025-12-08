import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DataGeneratorShiftsService {
  private readonly logger = new Logger(DataGeneratorShiftsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Générer des shifts et les assigner aux employés
   */
  async generateShifts(tenantId: string, dto: any) {
    this.logger.log(`Génération de shifts pour le tenant ${tenantId}`);

    const stats = {
      shiftsCreated: 0,
      shiftsAssigned: 0,
      schedulesCreated: 0,
      employeesProcessed: 0,
    };

    // 1. Créer des shifts par défaut si demandé
    let shifts = await this.prisma.shift.findMany({
      where: { tenantId },
    });

    if (dto.createDefaultShifts !== false && shifts.length === 0) {
      this.logger.log('Création des shifts par défaut...');
      
      const defaultShifts = [
        {
          name: 'Équipe du Matin',
          code: 'MATIN',
          startTime: '08:00',
          endTime: '17:00',
          breakDuration: 60,
          isNightShift: false,
          color: '#3b82f6',
        },
        {
          name: 'Équipe du Soir',
          code: 'SOIR',
          startTime: '14:00',
          endTime: '22:00',
          breakDuration: 60,
          isNightShift: false,
          color: '#f59e0b',
        },
        {
          name: 'Équipe de Nuit',
          code: 'NUIT',
          startTime: '22:00',
          endTime: '06:00',
          breakDuration: 60,
          isNightShift: true,
          color: '#6366f1',
        },
      ];

      for (const shiftData of defaultShifts) {
        const shift = await this.prisma.shift.create({
          data: {
            ...shiftData,
            tenantId,
          },
        });
        shifts.push(shift);
        stats.shiftsCreated++;
      }

      this.logger.log(`${stats.shiftsCreated} shifts créés`);
    }

    if (shifts.length === 0) {
      throw new BadRequestException('Aucun shift disponible. Créez des shifts d\'abord.');
    }

    // 2. Récupérer les employés actifs
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
      },
    });

    if (employees.length === 0) {
      throw new BadRequestException('Aucun employé actif trouvé');
    }

    this.logger.log(`${employees.length} employés trouvés`);

    // 3. Assigner des shifts aux employés selon la distribution
    if (dto.distribution && Object.keys(dto.distribution).length > 0) {
      // Vérifier que la distribution est valide
      const total = Object.values(dto.distribution).reduce<number>((sum, val) => sum + Number(val), 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new BadRequestException('La somme des pourcentages de distribution doit être égale à 100');
      }

      // Créer un tableau de shifts avec leurs poids
      const shiftWeights: Array<{ shift: any; weight: number }> = [];
      for (const [shiftId, percentage] of Object.entries(dto.distribution)) {
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) {
          throw new BadRequestException(`Shift avec ID ${shiftId} non trouvé`);
        }
        shiftWeights.push({ shift, weight: Number(percentage) });
      }

      // Assigner les shifts
      for (const employee of employees) {
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const { shift, weight } of shiftWeights) {
          cumulative += weight;
          if (random <= cumulative) {
            await this.prisma.employee.update({
              where: { id: employee.id },
              data: { currentShiftId: shift.id },
            });
            stats.shiftsAssigned++;
            break;
          }
        }
      }
    } else {
      // Distribution équitable par défaut
      const shiftsPerEmployee = Math.ceil(shifts.length / employees.length);
      let shiftIndex = 0;

      for (const employee of employees) {
        const shift = shifts[shiftIndex % shifts.length];
        await this.prisma.employee.update({
          where: { id: employee.id },
          data: { currentShiftId: shift.id },
        });
        stats.shiftsAssigned++;
        shiftIndex++;
      }
    }

    this.logger.log(`${stats.shiftsAssigned} shifts assignés`);

    // NOTE: La création de plannings a été déplacée vers le générateur de plannings dédié
    // Utilisez le générateur de plannings séparé pour créer des plannings après avoir assigné les shifts
    // Cette option est conservée pour compatibilité mais dépréciée
    if (dto.createSchedules && dto.scheduleStartDate && dto.scheduleEndDate) {
      this.logger.warn(
        '⚠️ La création de plannings via le générateur de shifts est dépréciée. ' +
        'Utilisez le générateur de plannings dédié (/data-generator/schedules/generate) pour une meilleure flexibilité.'
      );
      
      const startDate = new Date(dto.scheduleStartDate);
      const endDate = new Date(dto.scheduleEndDate);

      if (startDate > endDate) {
        throw new BadRequestException('La date de début doit être avant la date de fin');
      }

      this.logger.log(`Création de plannings du ${dto.scheduleStartDate} au ${dto.scheduleEndDate}`);

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        for (const employee of employees) {
          if (!employee.currentShiftId) continue;

          // Vérifier si un planning existe déjà
          const existing = await this.prisma.schedule.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              date: new Date(dateStr),
            },
          });

          if (!existing) {
            await this.prisma.schedule.create({
              data: {
                tenantId,
                employeeId: employee.id,
                shiftId: employee.currentShiftId,
                date: new Date(dateStr),
              },
            });
            stats.schedulesCreated++;
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      this.logger.log(`${stats.schedulesCreated} plannings créés`);
    }

    stats.employeesProcessed = employees.length;

    return {
      success: true,
      ...stats,
      shifts: shifts.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    };
  }

  /**
   * Obtenir les statistiques des shifts
   */
  async getShiftsStats(tenantId: string) {
    const shifts = await this.prisma.shift.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            employees: true,
            schedules: true,
          },
        },
      },
    });

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        currentShiftId: true,
      },
    });

    const employeesWithShift = employees.filter(e => e.currentShiftId !== null).length;
    const employeesWithoutShift = employees.length - employeesWithShift;

    return {
      totalShifts: shifts.length,
      totalEmployees: employees.length,
      employeesWithShift,
      employeesWithoutShift,
      shifts: shifts.map(shift => ({
        id: shift.id,
        name: shift.name,
        code: shift.code,
        startTime: shift.startTime,
        endTime: shift.endTime,
        employeesCount: shift._count.employees,
        schedulesCount: shift._count.schedules,
      })),
    };
  }
}

