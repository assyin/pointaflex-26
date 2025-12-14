"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DataGeneratorOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_structure_service_1 = require("./data-generator-structure.service");
const data_generator_rbac_service_1 = require("./data-generator-rbac.service");
const data_generator_employee_service_1 = require("./data-generator-employee.service");
const data_generator_hierarchy_service_1 = require("./data-generator-hierarchy.service");
const data_generator_shifts_service_1 = require("./data-generator-shifts.service");
const data_generator_holidays_service_1 = require("./data-generator-holidays.service");
const data_generator_leaves_service_1 = require("./data-generator-leaves.service");
const data_generator_schedules_service_1 = require("./data-generator-schedules.service");
const data_generator_service_1 = require("./data-generator.service");
const data_generator_overtime_service_1 = require("./data-generator-overtime.service");
const data_generator_recovery_service_1 = require("./data-generator-recovery.service");
const data_generator_device_service_1 = require("./data-generator-device.service");
const data_generator_replacement_service_1 = require("./data-generator-replacement.service");
const data_generator_notification_service_1 = require("./data-generator-notification.service");
let DataGeneratorOrchestratorService = DataGeneratorOrchestratorService_1 = class DataGeneratorOrchestratorService {
    constructor(prisma, structureService, rbacService, employeeService, hierarchyService, shiftsService, holidaysService, leavesService, schedulesService, attendanceService, overtimeService, recoveryService, deviceService, replacementService, notificationService) {
        this.prisma = prisma;
        this.structureService = structureService;
        this.rbacService = rbacService;
        this.employeeService = employeeService;
        this.hierarchyService = hierarchyService;
        this.shiftsService = shiftsService;
        this.holidaysService = holidaysService;
        this.leavesService = leavesService;
        this.schedulesService = schedulesService;
        this.attendanceService = attendanceService;
        this.overtimeService = overtimeService;
        this.recoveryService = recoveryService;
        this.deviceService = deviceService;
        this.replacementService = replacementService;
        this.notificationService = notificationService;
        this.logger = new common_1.Logger(DataGeneratorOrchestratorService_1.name);
        this.stopOnError = false;
        this.initializeStats();
    }
    async generateAll(tenantId, dto) {
        this.logger.log(`🚀 Démarrage de la génération complète pour tenant ${tenantId}`);
        this.startTime = new Date();
        this.initializeStats();
        this.stopOnError = dto.options?.stopOnError ?? false;
        try {
            if (dto.tenant) {
                await this.executeStep('Tenant & Settings', async () => {
                    this.logger.log('✅ Tenant existe déjà');
                });
            }
            if (dto.rbac) {
                await this.executeStep('RBAC - Vérification rôles système', async () => {
                    await this.validateSystemRoles(tenantId);
                });
            }
            if (dto.rbac) {
                await this.executeStep('RBAC - Vérification permissions', async () => {
                    await this.validatePermissions(tenantId);
                });
            }
            if (dto.rbac?.generateCustomRoles && dto.rbac.customRoles) {
                await this.executeStep('RBAC - Rôles personnalisés', async () => {
                    await this.rbacService.generateCustomRoles(tenantId, dto.rbac.customRoles || []);
                });
            }
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
            if (dto.rbac) {
                await this.executeStep('Users & RBAC Assignments', async () => {
                    const result = await this.rbacService.generateUsers(tenantId, dto.rbac);
                    if (result.users && result.users.length > 0) {
                        if (!this.stats.createdUsers) {
                            this.stats.createdUsers = [];
                        }
                        this.stats.createdUsers.push(...result.users);
                    }
                });
            }
            if (dto.employees) {
                await this.executeStep('Employees', async () => {
                    await this.employeeService.generateEmployees(tenantId, dto.employees);
                });
            }
            if (dto.structure?.assignManagers) {
                await this.executeStep('Hiérarchie Managers', async () => {
                    await this.hierarchyService.configureHierarchy(tenantId, dto.structure.managerDistribution);
                });
            }
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
            if (dto.devices) {
                await this.executeStep('Devices', async () => {
                    await this.deviceService.generateDevices(tenantId, dto.devices);
                });
            }
            if (dto.schedules) {
                await this.executeStep('Schedules', async () => {
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
            if (dto.leaves) {
                await this.executeStep('Leaves', async () => {
                    const now = new Date();
                    const startDate = dto.leaves.startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
                    const endDate = dto.leaves.endDate || new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
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
                    const normalizedDistribution = {
                        normal: distribution.normal || 70,
                        late: distribution.late || 15,
                        earlyLeave: distribution.earlyLeave || 5,
                        anomaly: distribution.anomaly || distribution.anomalies || 5,
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
            if (dto.overtime) {
                await this.executeStep('Overtime (Direct)', async () => {
                    await this.overtimeService.generateOvertime(tenantId, dto.overtime);
                });
            }
            if (dto.recovery) {
                await this.executeStep('Recovery', async () => {
                    await this.recoveryService.generateRecovery(tenantId, dto.recovery);
                });
            }
            if (dto.replacements) {
                await this.executeStep('Replacements', async () => {
                    await this.replacementService.generateReplacements(tenantId, dto.replacements);
                });
            }
            if (dto.notifications) {
                await this.executeStep('Notifications', async () => {
                    await this.notificationService.generateNotifications(tenantId, dto.notifications);
                });
            }
            const endTime = new Date();
            this.stats.duration = Math.round((endTime.getTime() - this.startTime.getTime()) / 1000);
            this.logger.log(`✅ Génération complète terminée en ${this.stats.duration}s`);
            this.logger.log(`📊 Total: ${this.stats.totalEntities} entités générées`);
            return this.stats;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Erreur lors de la génération: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            this.addError('Génération globale', errorMessage);
            if (!this.stopOnError) {
                return this.stats;
            }
            throw error;
        }
    }
    async validateSystemRoles(tenantId) {
        const systemRoles = ['SUPER_ADMIN', 'ADMIN_RH', 'MANAGER', 'EMPLOYEE'];
        const existingRoles = await this.prisma.role.findMany({
            where: {
                OR: [
                    { tenantId: null },
                    { tenantId },
                ],
                name: { in: systemRoles },
            },
        });
        if (existingRoles.length < systemRoles.length) {
            const missingRoles = systemRoles.filter((role) => !existingRoles.some((r) => r.name === role));
            this.addWarning('RBAC - Vérification rôles système', `Rôles système manquants: ${missingRoles.join(', ')}. Exécutez 'npm run init:rbac' d'abord.`);
        }
        else {
            this.logger.log('✅ Tous les rôles système existent');
        }
    }
    async validatePermissions(tenantId) {
        const permissionCount = await this.prisma.permission.count();
        if (permissionCount === 0) {
            this.addWarning('RBAC - Vérification permissions', 'Aucune permission trouvée. Exécutez \'npm run init:rbac\' d\'abord.');
        }
        else {
            this.logger.log(`✅ ${permissionCount} permissions trouvées`);
        }
    }
    async executeStep(stepName, stepFunction) {
        const stepIndex = this.stats.steps.findIndex((s) => s.name === stepName);
        if (stepIndex >= 0) {
            this.stats.steps[stepIndex].status = 'running';
        }
        else {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (stepIndex >= 0) {
                this.stats.steps[stepIndex].status = 'failed';
                this.stats.steps[stepIndex].error = errorMessage;
            }
            this.addError(stepName, errorMessage);
            this.logger.error(`❌ Erreur dans l'étape '${stepName}': ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            if (this.stopOnError) {
                throw error;
            }
        }
    }
    initializeStats() {
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
    updateProgress(currentStep) {
        this.progress.currentStep = currentStep;
        this.progress.totalSteps = this.stats.steps.length;
        this.progress.completedSteps = this.stats.steps.filter((s) => s.status === 'completed').length;
        this.progress.progress = Math.round((this.progress.completedSteps / Math.max(this.progress.totalSteps, 1)) * 100);
    }
    addError(step, error) {
        this.stats.errors.push({
            step,
            error,
            timestamp: new Date(),
        });
    }
    addWarning(step, warning) {
        this.stats.warnings.push({
            step,
            warning,
            timestamp: new Date(),
        });
        this.logger.warn(`⚠️ ${step}: ${warning}`);
    }
    incrementEntityCount(entityType, count = 1) {
        this.stats.totalEntities += count;
        this.stats.entitiesByType[entityType] = (this.stats.entitiesByType[entityType] || 0) + count;
    }
    getStats() {
        return this.stats;
    }
    getProgress() {
        return this.progress;
    }
};
exports.DataGeneratorOrchestratorService = DataGeneratorOrchestratorService;
exports.DataGeneratorOrchestratorService = DataGeneratorOrchestratorService = DataGeneratorOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_structure_service_1.DataGeneratorStructureService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_rbac_service_1.DataGeneratorRBACService))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_employee_service_1.DataGeneratorEmployeeService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_hierarchy_service_1.DataGeneratorHierarchyService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_structure_service_1.DataGeneratorStructureService,
        data_generator_rbac_service_1.DataGeneratorRBACService,
        data_generator_employee_service_1.DataGeneratorEmployeeService,
        data_generator_hierarchy_service_1.DataGeneratorHierarchyService,
        data_generator_shifts_service_1.DataGeneratorShiftsService,
        data_generator_holidays_service_1.DataGeneratorHolidaysService,
        data_generator_leaves_service_1.DataGeneratorLeavesService,
        data_generator_schedules_service_1.DataGeneratorSchedulesService,
        data_generator_service_1.DataGeneratorService,
        data_generator_overtime_service_1.DataGeneratorOvertimeService,
        data_generator_recovery_service_1.DataGeneratorRecoveryService,
        data_generator_device_service_1.DataGeneratorDeviceService,
        data_generator_replacement_service_1.DataGeneratorReplacementService,
        data_generator_notification_service_1.DataGeneratorNotificationService])
], DataGeneratorOrchestratorService);
//# sourceMappingURL=data-generator-orchestrator.service.js.map