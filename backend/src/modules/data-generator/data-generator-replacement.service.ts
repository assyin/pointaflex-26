import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { ReplacementsConfigDto } from './dto/generate-all-data.dto';
import { ReplacementStatus } from '@prisma/client';

@Injectable()
export class DataGeneratorReplacementService {
  private readonly logger = new Logger(DataGeneratorReplacementService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère des remplacements de shift
   */
  async generateReplacements(tenantId: string, config: ReplacementsConfigDto): Promise<number> {
    this.logger.log(`🔄 Génération de ${config.count || 0} remplacements pour tenant ${tenantId}`);

    const count = config.count || 10;
    const statusDistribution = config.statusDistribution || {
      PENDING: 20,
      APPROVED: 70,
      REJECTED: 10,
    };

    // Récupérer les plannings existants
    const schedules = await this.prisma.schedule.findMany({
      where: { tenantId },
      include: {
        employee: true,
        shift: true,
      },
      take: count * 2, // Prendre plus pour avoir du choix
    });

    if (schedules.length === 0) {
      this.logger.warn('⚠️ Aucun planning trouvé, impossible de créer des remplacements');
      return 0;
    }

    // Récupérer les employés disponibles pour remplacement
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    if (employees.length < 2) {
      this.logger.warn('⚠️ Pas assez d\'employés pour créer des remplacements');
      return 0;
    }

    let created = 0;
    const total = Object.values(statusDistribution).reduce((sum: number, val: number) => sum + val, 0);

    for (let i = 0; i < Math.min(count, schedules.length); i++) {
      const schedule = schedules[i];
      const originalEmployee = schedule.employee;

      // Trouver un employé de remplacement différent
      const replacementEmployees = employees.filter((e) => e.id !== originalEmployee.id);
      if (replacementEmployees.length === 0) continue;

      const replacementEmployee = replacementEmployees[Math.floor(Math.random() * replacementEmployees.length)];

      // Déterminer le statut selon la distribution
      const random = Math.random() * total;
      let status: ReplacementStatus = ReplacementStatus.PENDING;
      let cumulative = 0;

      if (random < (cumulative += statusDistribution.PENDING)) {
        status = ReplacementStatus.PENDING;
      } else if (random < (cumulative += statusDistribution.APPROVED)) {
        status = ReplacementStatus.APPROVED;
      } else {
        status = ReplacementStatus.REJECTED;
      }

      await this.prisma.shiftReplacement.create({
        data: {
          tenantId,
          date: schedule.date,
          shiftId: schedule.shiftId,
          originalEmployeeId: originalEmployee.id,
          replacementEmployeeId: replacementEmployee.id,
          reason: this.generateReason(),
          status: status,
          approvedAt: status === ReplacementStatus.APPROVED ? new Date() : undefined,
        },
      });

      created++;
      this.orchestrator.incrementEntityCount('ShiftReplacement');
    }

    this.logger.log(`✅ ${created} remplacements créés`);
    return created;
  }

  /**
   * Génère une raison réaliste pour le remplacement
   */
  private generateReason(): string {
    const reasons = [
      'Congé maladie',
      'Congé personnel',
      'Formation',
      'Mission',
      'Rendez-vous médical',
      'Urgence familiale',
      'Remplacement demandé',
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }
}

