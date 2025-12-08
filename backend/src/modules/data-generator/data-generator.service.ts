import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { GenerateSingleAttendanceDto, ScenarioType } from './dto/generate-single-attendance.dto';
import { GenerateBulkAttendanceDto } from './dto/generate-bulk-attendance.dto';
import { CleanGeneratedDataDto } from './dto/clean-generated-data.dto';
import { AttendanceType, DeviceType, LeaveStatus, OvertimeStatus } from '@prisma/client';
import { GenerationScenario, GenerationStats, TimePattern } from './interfaces/generation-scenario.interface';
import { getScenarioByName, ALL_SCENARIOS } from './scenarios/scenarios.config';

@Injectable()
export class DataGeneratorService {
  private readonly logger = new Logger(DataGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * Générer un pointage pour un employé pour une journée spécifique
   */
  async generateSingleDay(
    tenantId: string,
    dto: GenerateSingleAttendanceDto,
  ) {
    this.logger.log(`Génération de pointage pour ${dto.employeeId} le ${dto.date} (scénario: ${dto.scenario})`);

    // Vérifier que l'employé existe
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      include: { currentShift: true, site: true },
    });

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    // Récupérer le scénario
    const scenario = this.getScenarioForType(dto.scenario);
    if (!scenario) {
      throw new BadRequestException(`Scenario ${dto.scenario} not found`);
    }

    // Vérifier si l'employé a un shift assigné si requis
    if (scenario.requiresShift && !employee.currentShift) {
      throw new BadRequestException('Employee needs a shift assigned for this scenario');
    }

    // Générer les pointages selon le scénario
    const attendances = await this.generateAttendancesForScenario(
      tenantId,
      employee.id,
      dto.date,
      scenario,
      dto.siteId || employee.siteId,
      employee.currentShift,
    );

    return {
      success: true,
      employee: {
        id: employee.id,
        matricule: employee.matricule,
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      date: dto.date,
      scenario: scenario.name,
      generatedCount: attendances.length,
      attendances,
    };
  }

  /**
   * Générer en masse des pointages pour plusieurs employés et plusieurs jours
   */
  async generateBulk(tenantId: string, dto: GenerateBulkAttendanceDto) {
    this.logger.log(`Génération en masse du ${dto.startDate} au ${dto.endDate}`);

    // Validation des dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Validation de la distribution (total = 100%)
    const total = Object.values(dto.distribution).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException('Distribution percentages must sum to 100');
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
      include: { currentShift: true, site: true },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found');
    }

    this.logger.log(`Génération pour ${employees.length} employés`);

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
      this.logger.log(`${holidays.length} jour(s) férié(s) trouvé(s) dans la période`);
    }

    // Récupérer les congés approuvés si exclusion activée
    const approvedLeaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        status: LeaveStatus.APPROVED,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });
    this.logger.log(`${approvedLeaves.length} congé(s) approuvé(s) trouvé(s) dans la période`);

    const stats = {
      totalGenerated: 0,
      byType: {},
      byScenario: {},
      anomaliesDetected: 0,
      holidaysIgnored: 0,
      weekendsIgnored: 0,
      leavesRespected: 0,
      overtimeGenerated: 0,
      startDate: dto.startDate,
      endDate: dto.endDate,
      employeesCount: employees.length,
    };

    const excludeWeekends = dto.excludeWeekends !== false;
    const generateOvertime = dto.generateOvertime === true;
    const overtimeThreshold = dto.overtimeThreshold || 30; // Minutes

    // Générer pour chaque jour
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0 = dimanche, 6 = samedi

      // Vérifier si c'est un jour férié
      if (excludeHolidays && this.isHoliday(currentDate, holidays)) {
        stats.holidaysIgnored++;
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Vérifier si c'est un weekend
      if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        stats.weekendsIgnored++;
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Générer pour chaque employé
      for (const employee of employees) {
        // Vérifier si l'employé est en congé
        if (this.isEmployeeOnLeave(employee.id, currentDate, approvedLeaves)) {
          stats.leavesRespected++;
          continue;
        }

        // Choisir un scénario selon la distribution
        const scenario = this.pickScenarioByDistribution(dto.distribution);

        try {
          const attendances = await this.generateAttendancesForScenario(
            tenantId,
            employee.id,
            dateStr,
            scenario,
            dto.siteId || employee.siteId,
            employee.currentShift,
          );

          stats.totalGenerated += attendances.length;

          // Compter par scénario
          stats.byScenario[scenario.name] = (stats.byScenario[scenario.name] || 0) + 1;

          // Compter les anomalies
          const anomalies = attendances.filter(a => a.hasAnomaly);
          stats.anomaliesDetected += anomalies.length;

          // Générer les heures supplémentaires si demandé
          if (generateOvertime && attendances.length > 0 && employee.currentShift) {
            const overtimeCreated = await this.calculateAndCreateOvertime(
              tenantId,
              employee,
              dateStr,
              attendances,
              employee.currentShift,
              overtimeThreshold,
            );
            if (overtimeCreated) {
              stats.overtimeGenerated++;
            }
          }

        } catch (error) {
          this.logger.warn(`Erreur lors de la génération pour ${employee.matricule} le ${dateStr}: ${error.message}`);
        }
      }

      // Jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.logger.log(`Génération terminée: ${stats.totalGenerated} pointages créés`);

    return stats;
  }

  /**
   * Supprimer les données générées
   */
  async cleanGeneratedData(tenantId: string, dto: CleanGeneratedDataDto) {
    const where: any = {
      tenantId,
      isGenerated: true,
    };

    if (!dto.deleteAll) {
      if (dto.afterDate) {
        where.timestamp = { gte: new Date(dto.afterDate) };
      }
      if (dto.employeeId) {
        where.employeeId = dto.employeeId;
      }
      if (dto.siteId) {
        where.siteId = dto.siteId;
      }
    }

    const result = await this.prisma.attendance.deleteMany({ where });

    this.logger.log(`${result.count} pointages générés supprimés`);

    return {
      success: true,
      deletedCount: result.count,
    };
  }

  /**
   * Obtenir les statistiques des données générées
   */
  async getStats(tenantId: string): Promise<GenerationStats> {
    const generated = await this.prisma.attendance.findMany({
      where: { tenantId, isGenerated: true },
      select: {
        type: true,
        hasAnomaly: true,
        timestamp: true,
        generatedBy: true,
      },
    });

    const byType: Record<string, number> = {};
    const byScenario: Record<string, number> = {};
    let anomaliesDetected = 0;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const record of generated) {
      // Compter par type
      byType[record.type] = (byType[record.type] || 0) + 1;

      // Compter par scénario
      const scenario = record.generatedBy || 'unknown';
      byScenario[scenario] = (byScenario[scenario] || 0) + 1;

      // Compter les anomalies
      if (record.hasAnomaly) {
        anomaliesDetected++;
      }

      // Dates min/max
      if (!minDate || record.timestamp < minDate) {
        minDate = record.timestamp;
      }
      if (!maxDate || record.timestamp > maxDate) {
        maxDate = record.timestamp;
      }
    }

    return {
      totalGenerated: generated.length,
      byType,
      byScenario,
      anomaliesDetected,
      startDate: minDate ? minDate.toISOString().split('T')[0] : '',
      endDate: maxDate ? maxDate.toISOString().split('T')[0] : '',
    };
  }

  /**
   * Générer les pointages selon un scénario
   */
  private async generateAttendancesForScenario(
    tenantId: string,
    employeeId: string,
    date: string,
    scenario: GenerationScenario,
    siteId: string | null,
    shift: any,
  ) {
    const attendances = [];

    // Si scénario absence, ne rien générer
    if (scenario.patterns.length === 0) {
      return attendances;
    }

    for (const pattern of scenario.patterns) {
      // Calculer le timestamp
      const timestamp = this.calculateTimestamp(date, pattern, shift);

      // Créer le pointage via le service attendance (pour détecter les anomalies)
      const attendance = await this.attendanceService.create(tenantId, {
        employeeId,
        timestamp: timestamp.toISOString(),
        type: pattern.type,
        method: DeviceType.MANUAL,
        siteId,
        rawData: {
          generated: true,
          scenario: scenario.name,
          pattern: pattern.type,
        },
      });

      // Marquer comme généré
      await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          isGenerated: true,
          generatedBy: scenario.name,
        },
      });

      attendances.push(attendance);
    }

    return attendances;
  }

  /**
   * Calculer le timestamp basé sur le pattern et l'heure de shift
   */
  private calculateTimestamp(date: string, pattern: TimePattern, shift: any): Date {
    const baseDate = new Date(date);

    // Utiliser l'heure du shift si disponible et nécessaire
    let [hours, minutes] = pattern.timeOffset.split(':').map(Number);

    // Si un shift est défini et que c'est un pointage IN, utiliser l'heure du shift
    if (shift && pattern.type === AttendanceType.IN) {
      const [shiftHours, shiftMinutes] = shift.startTime.split(':').map(Number);
      hours = shiftHours;
      minutes = shiftMinutes;
    }

    // Appliquer la variance aléatoire
    const varianceMinutes = this.getRandomVariance(pattern.varianceMinutes);
    minutes += varianceMinutes;

    baseDate.setHours(hours, minutes, 0, 0);

    return baseDate;
  }

  /**
   * Obtenir une variance aléatoire entre -max et +max
   */
  private getRandomVariance(maxVariance: number): number {
    return Math.floor(Math.random() * (maxVariance * 2 + 1)) - maxVariance;
  }

  /**
   * Choisir un scénario selon la distribution de probabilités
   */
  private pickScenarioByDistribution(distribution: any): GenerationScenario {
    const random = Math.random() * 100;
    let cumulative = 0;

    const scenarioMapping = {
      normal: 'normal',
      late: 'late',
      earlyLeave: 'earlyLeave',
      anomaly: 'missingOut', // Par défaut, une anomalie = missing out
      mission: 'mission',
      absence: 'absence',
    };

    for (const [key, percentage] of Object.entries(distribution)) {
      cumulative += percentage as number;
      if (random <= cumulative) {
        const scenarioName = scenarioMapping[key] || key;
        return getScenarioByName(scenarioName) || ALL_SCENARIOS[0];
      }
    }

    // Par défaut, retourner le scénario normal
    return ALL_SCENARIOS[0];
  }

  /**
   * Convertir un ScenarioType en GenerationScenario
   */
  private getScenarioForType(type: ScenarioType): GenerationScenario | undefined {
    return getScenarioByName(type);
  }

  /**
   * Vérifier si une date est un jour férié
   */
  private isHoliday(date: Date, holidays: any[]): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.some(h => {
      const holidayDate = new Date(h.date).toISOString().split('T')[0];
      return holidayDate === dateStr;
    });
  }

  /**
   * Vérifier si un employé est en congé à une date donnée
   */
  private isEmployeeOnLeave(employeeId: string, date: Date, leaves: any[]): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return leaves.some(leave => {
      if (leave.employeeId !== employeeId) return false;
      const leaveStart = new Date(leave.startDate).toISOString().split('T')[0];
      const leaveEnd = new Date(leave.endDate).toISOString().split('T')[0];
      return dateStr >= leaveStart && dateStr <= leaveEnd;
    });
  }

  /**
   * Calculer et créer les heures supplémentaires
   */
  private async calculateAndCreateOvertime(
    tenantId: string,
    employee: any,
    date: string,
    attendances: any[],
    shift: any,
    thresholdMinutes: number,
  ): Promise<boolean> {
    try {
      // Trouver les pointages IN et OUT
      const inAttendance = attendances.find(a => a.type === AttendanceType.IN);
      const outAttendance = attendances.find(a => a.type === AttendanceType.OUT);

      if (!inAttendance || !outAttendance) {
        return false;
      }

      // Calculer les heures travaillées
      const workedMinutes = (new Date(outAttendance.timestamp).getTime() - new Date(inAttendance.timestamp).getTime()) / (1000 * 60);
      
      // Calculer les heures prévues du shift
      const [shiftStartHours, shiftStartMinutes] = shift.startTime.split(':').map(Number);
      const [shiftEndHours, shiftEndMinutes] = shift.endTime.split(':').map(Number);
      
      let shiftDurationMinutes = (shiftEndHours * 60 + shiftEndMinutes) - (shiftStartHours * 60 + shiftStartMinutes);
      
      // Gérer le cas d'un shift de nuit (ex: 22h-6h)
      if (shiftDurationMinutes < 0) {
        shiftDurationMinutes += 24 * 60; // Ajouter 24 heures
      }
      
      // Soustraire la pause
      shiftDurationMinutes -= shift.breakDuration || 60;

      // Calculer les heures supplémentaires
      const overtimeMinutes = workedMinutes - shiftDurationMinutes;

      if (overtimeMinutes < thresholdMinutes) {
        return false;
      }

      const overtimeHours = overtimeMinutes / 60;

      // Vérifier si un overtime existe déjà pour cette date
      const existing = await this.prisma.overtime.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          date: new Date(date),
        },
      });

      // Récupérer les paramètres du tenant pour les taux
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
      });

      const rate = shift.isNightShift
        ? Number(settings?.nightShiftRate || 1.5)
        : Number(settings?.overtimeRate || 1.25);

      if (existing) {
        // Mettre à jour l'overtime existant
        await this.prisma.overtime.update({
          where: { id: existing.id },
          data: {
            hours: overtimeHours,
            rate,
            isNightShift: shift.isNightShift || false,
          },
        });
      } else {
        // Créer un nouvel overtime
        await this.prisma.overtime.create({
          data: {
            tenantId,
            employeeId: employee.id,
            date: new Date(date),
            hours: overtimeHours,
            isNightShift: shift.isNightShift || false,
            rate,
            status: OvertimeStatus.PENDING,
          },
        });
      }

      return true;
    } catch (error) {
      this.logger.warn(`Erreur lors du calcul des heures sup pour ${employee.matricule} le ${date}: ${error.message}`);
      return false;
    }
  }
}
