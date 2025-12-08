import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class DataGeneratorLeavesService {
  private readonly logger = new Logger(DataGeneratorLeavesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Générer des congés pour les employés
   */
  async generateLeaves(tenantId: string, dto: any) {
    this.logger.log(`Génération de congés pour le tenant ${tenantId}`);

    const stats = {
      leaveTypesCreated: 0,
      leavesCreated: 0,
      leavesSkipped: 0,
      employeesProcessed: 0,
    };

    // 1. Créer des types de congés par défaut s'ils n'existent pas
    const defaultLeaveTypes = [
      { name: 'Congé Annuel', code: 'CA', isPaid: true, requiresDocument: false },
      { name: 'Maladie', code: 'MAL', isPaid: true, requiresDocument: true },
      { name: 'Maternité', code: 'MAT', isPaid: true, requiresDocument: true },
      { name: 'Congé Sans Solde', code: 'CSS', isPaid: false, requiresDocument: false },
    ];

    const existingLeaveTypes = await this.prisma.leaveType.findMany({
      where: { tenantId },
    });

    const leaveTypesMap = new Map(existingLeaveTypes.map(lt => [lt.code, lt]));

    for (const defaultType of defaultLeaveTypes) {
      if (!leaveTypesMap.has(defaultType.code)) {
        const leaveType = await this.prisma.leaveType.create({
          data: {
            ...defaultType,
            tenantId,
          },
        });
        leaveTypesMap.set(defaultType.code, leaveType);
        stats.leaveTypesCreated++;
      }
    }

    const availableLeaveTypes = Array.from(leaveTypesMap.values());

    if (availableLeaveTypes.length === 0) {
      throw new BadRequestException('Aucun type de congé disponible');
    }

    // Filtrer par leaveTypeIds si spécifié
    let leaveTypesToUse = availableLeaveTypes;
    if (dto.leaveTypeIds && dto.leaveTypeIds.length > 0) {
      leaveTypesToUse = availableLeaveTypes.filter(lt => dto.leaveTypeIds.includes(lt.id));
      if (leaveTypesToUse.length === 0) {
        throw new BadRequestException('Aucun type de congé valide trouvé parmi les IDs spécifiés');
      }
    }

    this.logger.log(`${leaveTypesToUse.length} type(s) de congé disponible(s)`);

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

    this.logger.log(`${employees.length} employé(s) trouvé(s)`);

    // 3. Sélectionner les employés selon le pourcentage
    const percentage = dto.percentage || 30;
    const numberOfEmployees = Math.ceil((employees.length * percentage) / 100);
    const selectedEmployees = this.shuffleArray([...employees]).slice(0, numberOfEmployees);

    this.logger.log(`${selectedEmployees.length} employé(s) sélectionné(s) pour générer des congés`);

    // 4. Générer des congés pour chaque employé sélectionné
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('La date de début doit être avant la date de fin');
    }

    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDays = dto.averageDaysPerEmployee || 5;
    const status = dto.autoApprove !== false ? LeaveStatus.APPROVED : LeaveStatus.PENDING;

    for (const employee of selectedEmployees) {
      // Générer 1-3 congés par employé
      const numberOfLeaves = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numberOfLeaves; i++) {
        // Choisir un type de congé aléatoire
        const leaveType = leaveTypesToUse[Math.floor(Math.random() * leaveTypesToUse.length)];

        // Générer des dates aléatoires dans la période
        const randomDay = Math.floor(Math.random() * periodDays);
        const leaveStartDate = new Date(startDate);
        leaveStartDate.setDate(leaveStartDate.getDate() + randomDay);

        // Durée aléatoire entre 1 et averageDays
        const duration = Math.floor(Math.random() * averageDays) + 1;
        const leaveEndDate = new Date(leaveStartDate);
        leaveEndDate.setDate(leaveEndDate.getDate() + duration - 1);

        // S'assurer que la date de fin ne dépasse pas la période
        if (leaveEndDate > endDate) {
          leaveEndDate.setTime(endDate.getTime());
          leaveStartDate.setTime(leaveEndDate.getTime() - (duration - 1) * 24 * 60 * 60 * 1000);
          if (leaveStartDate < startDate) {
            leaveStartDate.setTime(startDate.getTime());
          }
        }

        // Vérifier s'il y a un chevauchement avec un congé existant
        const overlapping = await this.prisma.leave.findFirst({
          where: {
            employeeId: employee.id,
            status: {
              notIn: [LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
            },
            OR: [
              {
                startDate: { lte: leaveEndDate },
                endDate: { gte: leaveStartDate },
              },
            ],
          },
        });

        if (overlapping) {
          stats.leavesSkipped++;
          continue;
        }

        // Créer le congé
        await this.prisma.leave.create({
          data: {
            tenantId,
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            startDate: leaveStartDate,
            endDate: leaveEndDate,
            days: duration,
            status,
            reason: `Congé généré automatiquement - ${leaveType.name}`,
          },
        });

        stats.leavesCreated++;
      }
    }

    stats.employeesProcessed = selectedEmployees.length;

    this.logger.log(`${stats.leavesCreated} congé(s) créé(s), ${stats.leavesSkipped} ignoré(s) (chevauchement)`);

    return {
      success: true,
      ...stats,
    };
  }

  /**
   * Obtenir les statistiques des congés
   */
  async getLeavesStats(tenantId: string) {
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            leaves: true,
          },
        },
      },
    });

    const leaves = await this.prisma.leave.findMany({
      where: { tenantId },
      select: {
        status: true,
        days: true,
      },
    });

    const byStatus: { [status: string]: number } = {};
    let totalDays = 0;

    leaves.forEach(leave => {
      byStatus[leave.status] = (byStatus[leave.status] || 0) + 1;
      totalDays += Number(leave.days);
    });

    return {
      totalLeaveTypes: leaveTypes.length,
      totalLeaves: leaves.length,
      totalDays,
      byStatus,
      leaveTypes: leaveTypes.map(lt => ({
        id: lt.id,
        name: lt.name,
        code: lt.code,
        isPaid: lt.isPaid,
        leavesCount: lt._count.leaves,
      })),
    };
  }

  /**
   * Mélanger un tableau (algorithme Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

