import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { RecoveryConfigDto } from './dto/generate-all-data.dto';
import { OvertimeStatus } from '@prisma/client';

@Injectable()
export class DataGeneratorRecoveryService {
  private readonly logger = new Logger(DataGeneratorRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère des heures de récupération
   */
  async generateRecovery(tenantId: string, config: RecoveryConfigDto): Promise<number> {
    this.logger.log(`🔄 Génération de récupération pour tenant ${tenantId}`);

    const count = config.count || 5;
    const convertFromOvertime = config.convertFromOvertime !== false;
    const conversionRate = config.conversionRate || 20; // 20% par défaut

    let created = 0;

    // Option 1: Convertir depuis overtime
    if (convertFromOvertime) {
      const overtimeToConvert = await this.prisma.overtime.findMany({
        where: {
          tenantId,
          status: OvertimeStatus.APPROVED,
        },
        take: Math.ceil((count * 100) / conversionRate),
      });

      for (const overtime of overtimeToConvert.slice(0, count)) {
        // Convertir Decimal en number
        let hours: number;
        if (typeof overtime.hours === 'number') {
          hours = overtime.hours;
        } else if (typeof overtime.hours === 'string') {
          hours = parseFloat(overtime.hours);
        } else if (overtime.hours && typeof overtime.hours === 'object' && 'toNumber' in overtime.hours) {
          hours = (overtime.hours as any).toNumber();
        } else {
          hours = Number(overtime.hours);
        }
        const hoursValue = Number(hours.toFixed(2));
        
        await this.prisma.recovery.create({
          data: {
            tenantId,
            employeeId: overtime.employeeId,
            hours: hoursValue,
            source: 'OVERTIME',
            usedHours: 0,
            remainingHours: hoursValue,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expire dans 1 an
          },
        });

        created++;
        this.orchestrator.incrementEntityCount('Recovery');
      }

      this.logger.log(`✅ ${created} récupérations créées depuis overtime`);
    } else {
      // Option 2: Générer directement
      const employees = await this.prisma.employee.findMany({
        where: { tenantId, isActive: true },
      });

      if (employees.length === 0) {
        this.logger.warn('⚠️ Aucun employé actif trouvé');
        return 0;
      }

      for (let i = 0; i < count; i++) {
        const employee = employees[Math.floor(Math.random() * employees.length)];
        const hours = 1 + Math.random() * 4; // Entre 1h et 5h
        const hoursValue = Number(Math.max(0.5, Math.min(8, hours)).toFixed(2));

        await this.prisma.recovery.create({
          data: {
            tenantId,
            employeeId: employee.id,
            hours: hoursValue,
            source: 'MANUAL',
            usedHours: 0,
            remainingHours: hoursValue,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expire dans 1 an
          },
        });

        created++;
        this.orchestrator.incrementEntityCount('Recovery');
      }

      this.logger.log(`✅ ${created} récupérations créées directement`);
    }

    return created;
  }

}

