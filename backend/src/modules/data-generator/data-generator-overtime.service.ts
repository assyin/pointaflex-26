import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { OvertimeConfigDto } from './dto/generate-all-data.dto';
import { OvertimeStatus } from '@prisma/client';

@Injectable()
export class DataGeneratorOvertimeService {
  private readonly logger = new Logger(DataGeneratorOvertimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère des heures supplémentaires directement (indépendamment des pointages)
   */
  async generateOvertime(tenantId: string, config: OvertimeConfigDto): Promise<number> {
    this.logger.log(`⏰ Génération de ${config.count || 0} heures supplémentaires pour tenant ${tenantId}`);

    const count = config.count || 10;
    const averageHours = config.averageHours || 2;
    const statusDistribution = config.statusDistribution || {
      PENDING: 30,
      APPROVED: 60,
      REJECTED: 10,
    };

    // Récupérer les employés actifs
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    if (employees.length === 0) {
      this.logger.warn('⚠️ Aucun employé actif trouvé');
      return 0;
    }

    let created = 0;
    const total = Object.values(statusDistribution).reduce((sum: number, val: number) => sum + val, 0);

    for (let i = 0; i < count; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)];

      // Déterminer le statut selon la distribution
      const random = Math.random() * total;
      let status: OvertimeStatus = OvertimeStatus.PENDING;
      let cumulative = 0;

      if (random < (cumulative += statusDistribution.PENDING)) {
        status = OvertimeStatus.PENDING;
      } else if (random < (cumulative += statusDistribution.APPROVED)) {
        status = OvertimeStatus.APPROVED;
      } else {
        status = OvertimeStatus.REJECTED;
      }

      // Générer une date aléatoire dans les 3 derniers mois
      const date = this.generateRandomDate(-90, 0);
      const hours = averageHours + (Math.random() * 4 - 2); // Variation de ±2h
      const hoursValue = Number(Math.max(0.5, Math.min(8, hours)).toFixed(2)); // Entre 0.5h et 8h

      await this.prisma.overtime.create({
        data: {
          tenantId,
          employeeId: employee.id,
          date,
          hours: hoursValue,
          status,
          approvedAt: status === OvertimeStatus.APPROVED ? new Date() : undefined,
          approvedBy: status === OvertimeStatus.APPROVED ? undefined : undefined, // Peut être assigné plus tard
        },
      });

      created++;
      this.orchestrator.incrementEntityCount('Overtime');
    }

    this.logger.log(`✅ ${created} heures supplémentaires créées`);
    return created;
  }

  /**
   * Génère une date aléatoire entre aujourd'hui et n jours dans le passé/futur
   */
  private generateRandomDate(daysAgo: number, daysAhead: number): Date {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + daysAgo);
    const end = new Date(now);
    end.setDate(end.getDate() + daysAhead);
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime);
  }

}

