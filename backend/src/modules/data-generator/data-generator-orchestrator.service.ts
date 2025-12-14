import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GenerateAllDataDto } from './dto/generate-all-data.dto';
import { GenerationStats, GenerationProgress } from './interfaces/generation-stats.interface';
import { DataGeneratorStructureService } from './data-generator-structure.service';
import { DataGeneratorRBACService } from './data-generator-rbac.service';
import { DataGeneratorEmployeeService } from './data-generator-employee.service';
import { DataGeneratorHierarchyService } from './data-generator-hierarchy.service';
import { DataGeneratorShiftsService } from './data-generator-shifts.service';
import { DataGeneratorHolidaysService } from './data-generator-holidays.service';
import { DataGeneratorLeavesService } from './data-generator-leaves.service';
import { DataGeneratorSchedulesService } from './data-generator-schedules.service';
import { DataGeneratorService } from './data-generator.service';
import { DataGeneratorOvertimeService } from './data-generator-overtime.service';
import { DataGeneratorRecoveryService } from './data-generator-recovery.service';
import { DataGeneratorDeviceService } from './data-generator-device.service';
import { DataGeneratorReplacementService } from './data-generator-replacement.service';
import { DataGeneratorNotificationService } from './data-generator-notification.service';

@Injectable()
export class DataGeneratorOrchestratorService {
  private readonly logger = new Logger(DataGeneratorOrchestratorService.name);
  private stats: GenerationStats;
  private progress: GenerationProgress;
  private startTime: Date;
  private stopOnError: boolean = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorStructureService))
    private readonly structureService: DataGeneratorStructureService,
    @Inject(forwardRef(() => DataGeneratorRBACService))
    private readonly rbacService: DataGeneratorRBACService,
    @Inject(forwardRef(() => DataGeneratorEmployeeService))
    private readonly employeeService: DataGeneratorEmployeeService,
    @Inject(forwardRef(() => DataGeneratorHierarchyService))
    private readonly hierarchyService: DataGeneratorHierarchyService,
    private readonly shiftsService: DataGeneratorShiftsService,
    private readonly holidaysService: DataGeneratorHolidaysService,
    private readonly leavesService: DataGeneratorLeavesService,
    private readonly schedulesService: DataGeneratorSchedulesService,
    private readonly attendanceService: DataGeneratorService,
    private readonly overtimeService: DataGeneratorOvertimeService,
    private readonly recoveryService: DataGeneratorRecoveryService,
    private readonly deviceService: DataGeneratorDeviceService,
    private readonly replacementService: DataGeneratorReplacementService,
    private readonly notificationService: DataGeneratorNotificationService,
  ) {
    this.initializeStats();
  }

  /**
   * Génère toutes les données selon la configuration
   */
  async generateAll(tenantId: string, dto: GenerateAllDataDto): Promise<GenerationStats> {
    this.logger.log(`🚀 Démarrage de la génération complète pour tenant ${tenantId}`);
    this.startTime = new Date();
    this.initializeStats();
    this.stopOnError = dto.options?.stopOnError ?? false;

    try {
      // Étape 1: Tenant & Settings
      if (dto.tenant) {
        await this.executeStep('Tenant & Settings', async () => {
          // Le tenant existe déjà (on utilise celui du user connecté)
          // On peut juste mettre à jour les settings si nécessaire
          this.logger.log('✅ Tenant existe déjà');
        });
      }

      // Étape 2: RBAC - Vérification rôles système
      if (dto.rbac) {
        await this.executeStep('RBAC - Vérification rôles système', async () => {
          await this.validateSystemRoles(tenantId);
        });
      }

      // Étape 3: RBAC - Vérification permissions
      if (dto.rbac) {
        await this.executeStep('RBAC - Vérification permissions', async () => {
          await this.validatePermissions(tenantId);
        });
      }

      // Étape 4: RBAC - Rôles personnalisés (si demandé)
      if (dto.rbac?.generateCustomRoles && dto.rbac.customRoles) {
        await this.executeStep('RBAC - Rôles personnalisés', async () => {
          await this.rbacService.generateCustomRoles(tenantId, dto.rbac.customRoles || []);
        });
      }

      // Étape 5-8: Structure Organisationnelle
      if (dto.structure) {
        await this.executeStep('Structure - Sites', async () => {
          await this.structureService.generateSites(tenantId, dto.structure);
        });

        await this.executeStep('Structure - Départements', async () => {
          await this.structureService.generateDepartments(tenantId, dto.structure);
        });

        await this.executeStep('Structure - Positions', async () => {
          await this.structureService.generatePositions(tenantId, dto.structure);
        });

        await this.executeStep('Structure - Équipes', async () => {
          await this.structureService.generateTeams(tenantId, dto.structure);
        });
      }

      // Étape 9: Users & RBAC Assignments
      if (dto.rbac) {
        await this.executeStep('Users & RBAC Assignments', async () => {
          const result = await this.rbacService.generateUsers(tenantId, dto.rbac);
          // Stocker les informations des utilisateurs créés
          if (result.users && result.users.length > 0) {
            if (!this.stats.createdUsers) {
              this.stats.createdUsers = [];
            }
            this.stats.createdUsers.push(...result.users);
          }
        });
      }

      // Étape 10: Employees
      if (dto.employees) {
        await this.executeStep('Employees', async () => {
          await this.employeeService.generateEmployees(tenantId, dto.employees);
        });
      }

      // Étape 11: Hiérarchie Managers
      if (dto.structure?.assignManagers) {
        await this.executeStep('Hiérarchie Managers', async () => {
          await this.hierarchyService.configureHierarchy(tenantId, dto.structure.managerDistribution);
        });
      }

      // Étape 12: Shifts
      if (dto.shifts) {
        await this.executeStep('Shifts', async () => {
          await this.shiftsService.generateShifts(tenantId, {
            createDefaultShifts: dto.shifts.createDefault,
            customShifts: dto.shifts.custom,
            assignToEmployees: dto.shifts.assignToEmployees,
            distribution: dto.shifts.distribution,
          });
        });
      }

      // Étape 13: Holidays
      if (dto.holidays) {
        await this.executeStep('Holidays', async () => {
          await this.holidaysService.generateHolidays(tenantId, {
            generateMoroccoHolidays: dto.holidays.generateMoroccoHolidays,
            startYear: dto.holidays.startYear || new Date().getFullYear(),
            endYear: dto.holidays.endYear || new Date().getFullYear() + 1,
            customHolidays: dto.holidays.customHolidays,
          });
        });
      }

      // Étape 14: LeaveTypes (créés automatiquement dans generateLeaves)
      // Pas besoin d'étape séparée, les LeaveTypes sont créés dans l'étape 17

      // Étape 15: Devices
      if (dto.devices) {
        await this.executeStep('Devices', async () => {
          await this.deviceService.generateDevices(tenantId, dto.devices);
        });
      }

      // Étape 16: Schedules
      if (dto.schedules) {
        await this.executeStep('Schedules', async () => {
          // Calculer le pourcentage d'employés à traiter
          const employees = await this.prisma.employee.findMany({
            where: { tenantId, isActive: true },
          });
          const employeeCount = Math.ceil((employees.length * (dto.schedules.coverage || 100)) / 100);
          const employeeIds = employees.slice(0, employeeCount).map((e) => e.id);

          await this.schedulesService.generateSchedules(tenantId, {
            startDate: dto.schedules.startDate,
            endDate: dto.schedules.endDate,
            employeeIds,
            excludeHolidays: dto.schedules.excludeHolidays,
            excludeWeekends: dto.schedules.excludeWeekends,
            distribution: dto.schedules.distribution,
          });
        });
      }

      // Étape 17: Leaves
      if (dto.leaves) {
        await this.executeStep('Leaves', async () => {
          // Définir les dates par défaut si non fournies
          const now = new Date();
          const startDate = dto.leaves.startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; // Début de l'année
          const endDate = dto.leaves.endDate || new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]; // Fin de l'année

          await this.leavesService.generateLeaves(tenantId, {
            startDate,
            endDate,
            percentage: dto.leaves.percentage,
            averageDaysPerEmployee: dto.leaves.averageDaysPerEmployee,
            distribution: dto.leaves.distribution,
            autoApprove: dto.leaves.workflow?.autoApprove,
            approvalDistribution: dto.leaves.workflow?.approvalDistribution,
          });
        });
      }

      // Étape 18: Attendance
      if (dto.attendance) {
        await this.executeStep('Attendance', async () => {
          const distribution = dto.attendance.distribution || {
            normal: 70,
            late: 15,
            earlyLeave: 5,
            anomaly: 5,
            mission: 3,
            absence: 2,
          };
          
          // Convertir anomalies en anomaly si nécessaire
          const normalizedDistribution = {
            normal: distribution.normal || 70,
            late: distribution.late || 15,
            earlyLeave: distribution.earlyLeave || 5,
            anomaly: (distribution as any).anomaly || (distribution as any).anomalies || 5,
            mission: distribution.mission || 3,
            absence: distribution.absence || 2,
          };
          
          await this.attendanceService.generateBulk(tenantId, {
            startDate: dto.attendance.startDate,
            endDate: dto.attendance.endDate,
            distribution: normalizedDistribution,
            excludeHolidays: dto.attendance.excludeHolidays,
            excludeWeekends: dto.attendance.excludeWeekends,
            generateOvertime: dto.attendance.generateOvertime,
            overtimeThreshold: dto.attendance.overtimeThreshold,
          });
        });
      }

      // Étape 19: Overtime (via Attendance) - Déjà généré dans l'étape 18 si generateOvertime est activé
      // Pas besoin d'étape séparée, l'overtime est calculé automatiquement depuis les pointages

      // Étape 20: Overtime (Direct)
      if (dto.overtime) {
        await this.executeStep('Overtime (Direct)', async () => {
          await this.overtimeService.generateOvertime(tenantId, dto.overtime);
        });
      }

      // Étape 21: Recovery
      if (dto.recovery) {
        await this.executeStep('Recovery', async () => {
          await this.recoveryService.generateRecovery(tenantId, dto.recovery);
        });
      }

      // Étape 22: Replacements
      if (dto.replacements) {
        await this.executeStep('Replacements', async () => {
          await this.replacementService.generateReplacements(tenantId, dto.replacements);
        });
      }

      // Étape 23: Notifications
      if (dto.notifications) {
        await this.executeStep('Notifications', async () => {
          await this.notificationService.generateNotifications(tenantId, dto.notifications);
        });
      }

      // Calculer la durée totale
      const endTime = new Date();
      this.stats.duration = Math.round((endTime.getTime() - this.startTime.getTime()) / 1000);

      this.logger.log(`✅ Génération complète terminée en ${this.stats.duration}s`);
      this.logger.log(`📊 Total: ${this.stats.totalEntities} entités générées`);

      return this.stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erreur lors de la génération: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      this.addError('Génération globale', errorMessage);
      
      // Retourner les stats même en cas d'erreur (si stopOnError est false)
      if (!this.stopOnError) {
        return this.stats;
      }
      throw error;
    }
  }

  /**
   * Valide que les rôles système existent
   */
  private async validateSystemRoles(tenantId: string): Promise<void> {
    const systemRoles = ['SUPER_ADMIN', 'ADMIN_RH', 'MANAGER', 'EMPLOYEE'];
    const existingRoles = await this.prisma.role.findMany({
      where: {
        OR: [
          { tenantId: null }, // Rôles système (tenantId null)
          { tenantId },
        ],
        name: { in: systemRoles },
      },
    });

    if (existingRoles.length < systemRoles.length) {
      const missingRoles = systemRoles.filter(
        (role) => !existingRoles.some((r) => r.name === role),
      );
      this.addWarning(
        'RBAC - Vérification rôles système',
        `Rôles système manquants: ${missingRoles.join(', ')}. Exécutez 'npm run init:rbac' d'abord.`,
      );
    } else {
      this.logger.log('✅ Tous les rôles système existent');
    }
  }

  /**
   * Valide que les permissions existent
   */
  private async validatePermissions(tenantId: string): Promise<void> {
    const permissionCount = await this.prisma.permission.count();
    if (permissionCount === 0) {
      this.addWarning(
        'RBAC - Vérification permissions',
        'Aucune permission trouvée. Exécutez \'npm run init:rbac\' d\'abord.',
      );
    } else {
      this.logger.log(`✅ ${permissionCount} permissions trouvées`);
    }
  }

  /**
   * Exécute une étape avec gestion d'erreurs
   */
  private async executeStep(
    stepName: string,
    stepFunction: () => Promise<void>,
  ): Promise<void> {
    const stepIndex = this.stats.steps.findIndex((s) => s.name === stepName);
    if (stepIndex >= 0) {
      this.stats.steps[stepIndex].status = 'running';
    } else {
      this.stats.steps.push({
        name: stepName,
        status: 'running',
      });
    }

    this.updateProgress(stepName);

    try {
      const stepStartTime = Date.now();
      await stepFunction();
      const stepDuration = Math.round((Date.now() - stepStartTime) / 1000);

      if (stepIndex >= 0) {
        this.stats.steps[stepIndex].status = 'completed';
        this.stats.steps[stepIndex].duration = stepDuration;
      }

      this.logger.log(`✅ Étape '${stepName}' terminée en ${stepDuration}s`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (stepIndex >= 0) {
        this.stats.steps[stepIndex].status = 'failed';
        this.stats.steps[stepIndex].error = errorMessage;
      }
      this.addError(stepName, errorMessage);
      this.logger.error(`❌ Erreur dans l'étape '${stepName}': ${errorMessage}`, error instanceof Error ? error.stack : undefined);

      // Si stopOnError est activé, on arrête
      if (this.stopOnError) {
        throw error;
      }
      // Sinon, on continue mais on enregistre l'erreur
    }
  }

  /**
   * Initialise les statistiques
   */
  private initializeStats(): void {
    this.stats = {
      totalEntities: 0,
      entitiesByType: {},
      duration: 0,
      errors: [],
      warnings: [],
      steps: [],
      createdUsers: [],
    };

    this.progress = {
      currentStep: '',
      totalSteps: 0,
      completedSteps: 0,
      progress: 0,
      currentStepProgress: 0,
    };
  }

  /**
   * Met à jour la progression
   */
  private updateProgress(currentStep: string): void {
    this.progress.currentStep = currentStep;
    this.progress.totalSteps = this.stats.steps.length;
    this.progress.completedSteps = this.stats.steps.filter(
      (s) => s.status === 'completed',
    ).length;
    this.progress.progress = Math.round(
      (this.progress.completedSteps / Math.max(this.progress.totalSteps, 1)) * 100,
    );
  }

  /**
   * Ajoute une erreur
   */
  private addError(step: string, error: string): void {
    this.stats.errors.push({
      step,
      error,
      timestamp: new Date(),
    });
  }

  /**
   * Ajoute un avertissement
   */
  private addWarning(step: string, warning: string): void {
    this.stats.warnings.push({
      step,
      warning,
      timestamp: new Date(),
    });
    this.logger.warn(`⚠️ ${step}: ${warning}`);
  }

  /**
   * Incrémente le compteur d'entités générées
   */
  incrementEntityCount(entityType: string, count: number = 1): void {
    this.stats.totalEntities += count;
    this.stats.entitiesByType[entityType] = (this.stats.entitiesByType[entityType] || 0) + count;
  }

  /**
   * Récupère les statistiques actuelles
   */
  getStats(): GenerationStats {
    return this.stats;
  }

  /**
   * Récupère la progression actuelle
   */
  getProgress(): GenerationProgress {
    return this.progress;
  }
}

