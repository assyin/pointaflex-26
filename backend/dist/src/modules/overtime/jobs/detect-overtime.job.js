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
var DetectOvertimeJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectOvertimeJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
const overtime_service_1 = require("../overtime.service");
let DetectOvertimeJob = DetectOvertimeJob_1 = class DetectOvertimeJob {
    constructor(prisma, overtimeService) {
        this.prisma = prisma;
        this.overtimeService = overtimeService;
        this.logger = new common_1.Logger(DetectOvertimeJob_1.name);
    }
    async detectOvertime() {
        this.logger.log('🔄 Démarrage du job de CONSOLIDATION des heures supplémentaires...');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setHours(23, 59, 59, 999);
            const tenants = await this.prisma.tenant.findMany({
                include: {
                    settings: true,
                },
            });
            this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);
            for (const tenant of tenants) {
                try {
                    await this.consolidateOvertimeForTenant(tenant.id, yesterday, yesterdayEnd);
                }
                catch (error) {
                    this.logger.error(`Erreur lors de la consolidation des heures sup pour le tenant ${tenant.id}:`, error);
                }
            }
            this.logger.log('✅ Consolidation des heures supplémentaires terminée avec succès');
        }
        catch (error) {
            this.logger.error('Erreur lors de la consolidation globale des heures sup:', error);
        }
    }
    async consolidateOvertimeForTenant(tenantId, startDate, endDate) {
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                overtimeMinimumThreshold: true,
                overtimeAutoDetectType: true,
                nightShiftStart: true,
                nightShiftEnd: true,
                overtimeMajorationEnabled: true,
                overtimeRateStandard: true,
                overtimeRateNight: true,
                overtimeRateHoliday: true,
                overtimeRateEmergency: true,
                overtimeAutoApprove: true,
                overtimeAutoApproveMaxHours: true,
                overtimeRate: true,
                nightShiftRate: true,
            },
        });
        const minimumThreshold = settings?.overtimeMinimumThreshold || 30;
        const autoDetectType = settings?.overtimeAutoDetectType !== false;
        const autoApprove = settings?.overtimeAutoApprove === true;
        const autoApproveMaxHours = Number(settings?.overtimeAutoApproveMaxHours) || 4.0;
        const attendancesWithOvertime = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                type: client_1.AttendanceType.OUT,
                overtimeMinutes: {
                    gt: minimumThreshold,
                },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        isEligibleForOvertime: true,
                        maxOvertimeHoursPerMonth: true,
                        maxOvertimeHoursPerWeek: true,
                    },
                },
            },
            orderBy: { timestamp: 'asc' },
        });
        this.logger.log(`🔍 Vérification de ${attendancesWithOvertime.length} pointage(s) avec heures sup pour le tenant ${tenantId}...`);
        let holidays = new Set();
        if (autoDetectType) {
            const holidayRecords = await this.prisma.holiday.findMany({
                where: {
                    tenantId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                select: { date: true },
            });
            holidays = new Set(holidayRecords.map(h => h.date.toISOString().split('T')[0]));
            this.logger.debug(`${holidays.size} jour(s) férié(s) trouvé(s) pour la période`);
        }
        let createdCount = 0;
        let existingCount = 0;
        let skippedCount = 0;
        for (const attendance of attendancesWithOvertime) {
            try {
                if (attendance.employee.isEligibleForOvertime === false) {
                    this.logger.debug(`Skipping overtime pour ${attendance.employee.firstName} ${attendance.employee.lastName} (non éligible)`);
                    skippedCount++;
                    continue;
                }
                const attendanceDate = new Date(attendance.timestamp.toISOString().split('T')[0]);
                const leaveCheck = await this.isEmployeeOnLeaveOrRecovery(tenantId, attendance.employeeId, attendanceDate);
                if (leaveCheck.isOnLeave) {
                    this.logger.debug(`Skipping overtime pour ${attendance.employee.firstName} ${attendance.employee.lastName} (${leaveCheck.reason})`);
                    skippedCount++;
                    continue;
                }
                const existingOvertime = await this.prisma.overtime.findFirst({
                    where: {
                        tenantId,
                        employeeId: attendance.employeeId,
                        date: new Date(attendance.timestamp.toISOString().split('T')[0]),
                    },
                });
                if (existingOvertime) {
                    existingCount++;
                    continue;
                }
                this.logger.warn(`⚠️ [CONSOLIDATION] Overtime manquant détecté pour ${attendance.employee.firstName} ${attendance.employee.lastName} le ${attendance.timestamp.toISOString().split('T')[0]} - Création...`);
                const overtimeHours = (attendance.overtimeMinutes || 0) / 60;
                let hoursToCreate = overtimeHours;
                if (attendance.employee.maxOvertimeHoursPerMonth ||
                    attendance.employee.maxOvertimeHoursPerWeek) {
                    const limitsCheck = await this.overtimeService.checkOvertimeLimits(tenantId, attendance.employeeId, overtimeHours, new Date(attendance.timestamp.toISOString().split('T')[0]));
                    if (limitsCheck.exceedsLimit) {
                        this.logger.warn(`Plafond atteint pour ${attendance.employee.firstName} ${attendance.employee.lastName}. Overtime non créé.`);
                        skippedCount++;
                        continue;
                    }
                    if (limitsCheck.adjustedHours !== undefined && limitsCheck.adjustedHours < overtimeHours) {
                        hoursToCreate = limitsCheck.adjustedHours;
                        this.logger.warn(`Plafond partiel pour ${attendance.employee.firstName} ${attendance.employee.lastName}. ${hoursToCreate.toFixed(2)}h créées au lieu de ${overtimeHours.toFixed(2)}h`);
                    }
                }
                let overtimeType = 'STANDARD';
                const dateStr = attendance.timestamp.toISOString().split('T')[0];
                if (autoDetectType) {
                    if (holidays.has(dateStr)) {
                        overtimeType = 'HOLIDAY';
                        this.logger.debug(`Type HOLIDAY détecté pour ${dateStr} (jour férié)`);
                    }
                    else if (this.isNightShiftTime(attendance.timestamp, settings)) {
                        overtimeType = 'NIGHT';
                        this.logger.debug(`Type NIGHT détecté pour ${attendance.timestamp.toISOString()}`);
                    }
                }
                const rate = this.overtimeService.getOvertimeRate(settings, overtimeType);
                const shouldAutoApprove = autoApprove && hoursToCreate <= autoApproveMaxHours;
                const status = shouldAutoApprove ? client_1.OvertimeStatus.APPROVED : client_1.OvertimeStatus.PENDING;
                const statusNote = shouldAutoApprove ? ' - Auto-approuvé' : '';
                await this.prisma.overtime.create({
                    data: {
                        tenantId,
                        employeeId: attendance.employeeId,
                        date: new Date(dateStr),
                        hours: hoursToCreate,
                        approvedHours: shouldAutoApprove ? hoursToCreate : null,
                        type: overtimeType,
                        rate,
                        isNightShift: overtimeType === 'NIGHT',
                        status,
                        approvedAt: shouldAutoApprove ? new Date() : null,
                        notes: `[CONSOLIDATION] Créé par le job de filet de sécurité depuis le pointage du ${attendance.timestamp.toLocaleDateString('fr-FR')}${overtimeType !== 'STANDARD' ? ` (${overtimeType})` : ''}${statusNote}`,
                    },
                });
                createdCount++;
                const statusEmoji = shouldAutoApprove ? '✅' : '⏳';
                const statusText = shouldAutoApprove ? 'auto-approuvé' : 'en attente';
                this.logger.log(`${statusEmoji} Overtime ${statusText} pour ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.matricule}): ${hoursToCreate.toFixed(2)}h`);
            }
            catch (error) {
                this.logger.error(`Erreur lors de la création de l'Overtime pour le pointage ${attendance.id}:`, error);
                skippedCount++;
            }
        }
        if (createdCount > 0) {
            this.logger.warn(`⚠️ [CONSOLIDATION] ${createdCount} overtime(s) manquant(s) créé(s) par le filet de sécurité`);
        }
        this.logger.log(`📊 Consolidation pour tenant ${tenantId}: ${existingCount} déjà créé(s) en temps réel, ${createdCount} récupéré(s), ${skippedCount} ignoré(s).`);
    }
    isNightShiftTime(timestamp, settings) {
        const nightStart = settings?.nightShiftStart || '21:00';
        const nightEnd = settings?.nightShiftEnd || '06:00';
        const [startHour, startMin] = nightStart.split(':').map(Number);
        const [endHour, endMin] = nightEnd.split(':').map(Number);
        const hour = timestamp.getHours();
        const minute = timestamp.getMinutes();
        const currentMinutes = hour * 60 + minute;
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
        else {
            return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        }
    }
    async isEmployeeOnLeaveOrRecovery(tenantId, employeeId, date) {
        const approvedLeaveStatuses = [
            client_1.LeaveStatus.APPROVED,
            client_1.LeaveStatus.MANAGER_APPROVED,
            client_1.LeaveStatus.HR_APPROVED,
        ];
        const leave = await this.prisma.leave.findFirst({
            where: {
                tenantId,
                employeeId,
                status: { in: approvedLeaveStatuses },
                startDate: { lte: date },
                endDate: { gte: date },
            },
            include: {
                leaveType: { select: { name: true } },
            },
        });
        if (leave) {
            return {
                isOnLeave: true,
                reason: `en congé (${leave.leaveType.name})`,
            };
        }
        const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
                tenantId,
                employeeId,
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED] },
                startDate: { lte: date },
                endDate: { gte: date },
            },
        });
        if (recoveryDay) {
            return {
                isOnLeave: true,
                reason: 'en jour de récupération',
            };
        }
        return { isOnLeave: false };
    }
};
exports.DetectOvertimeJob = DetectOvertimeJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DetectOvertimeJob.prototype, "detectOvertime", null);
exports.DetectOvertimeJob = DetectOvertimeJob = DetectOvertimeJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        overtime_service_1.OvertimeService])
], DetectOvertimeJob);
//# sourceMappingURL=detect-overtime.job.js.map