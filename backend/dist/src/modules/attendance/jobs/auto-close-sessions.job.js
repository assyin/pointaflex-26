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
var AutoCloseSessionsJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoCloseSessionsJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let AutoCloseSessionsJob = AutoCloseSessionsJob_1 = class AutoCloseSessionsJob {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AutoCloseSessionsJob_1.name);
    }
    parseTimeString(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return { hours: hours || 0, minutes: minutes || 0 };
    }
    async autoCloseSessions() {
        this.logger.log('🔄 Démarrage de la clôture automatique des sessions orphelines...');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const endOfYesterday = new Date(yesterday);
            endOfYesterday.setHours(23, 59, 59, 999);
            const tenants = await this.prisma.tenant.findMany({
                include: {
                    settings: true,
                },
            });
            this.logger.log(`Traitement de ${tenants.length} tenant(s)...`);
            let totalClosed = 0;
            for (const tenant of tenants) {
                try {
                    const autoCloseEnabled = tenant.settings?.autoCloseOrphanSessions ?? true;
                    if (!autoCloseEnabled) {
                        this.logger.log(`⏭️ Tenant ${tenant.id}: Clôture automatique désactivée`);
                        continue;
                    }
                    const autoCloseSettings = {
                        defaultCloseTime: tenant.settings?.autoCloseDefaultTime || '23:59',
                        overtimeBuffer: tenant.settings?.autoCloseOvertimeBuffer ?? 0,
                        checkApprovedOvertime: tenant.settings?.autoCloseCheckApprovedOvertime ?? true,
                    };
                    const closedCount = await this.closeOrphanSessionsForTenant(tenant.id, yesterday, endOfYesterday, autoCloseSettings);
                    totalClosed += closedCount;
                }
                catch (error) {
                    this.logger.error(`Erreur lors de la clôture des sessions pour le tenant ${tenant.id}:`, error);
                }
            }
            this.logger.log(`✅ Clôture automatique terminée: ${totalClosed} session(s) clôturée(s)`);
        }
        catch (error) {
            this.logger.error('Erreur lors de la clôture automatique des sessions:', error);
        }
    }
    async closeOrphanSessionsForTenant(tenantId, startDate, endDate, settings) {
        const { defaultCloseTime, overtimeBuffer, checkApprovedOvertime } = settings;
        const orphanIns = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                type: client_1.AttendanceType.IN,
                timestamp: { gte: startDate, lte: endDate },
                hasAnomaly: true,
                anomalyType: 'MISSING_OUT',
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        currentShiftId: true,
                        currentShift: {
                            select: {
                                endTime: true,
                            },
                        },
                    },
                },
            },
            orderBy: { timestamp: 'asc' },
        });
        this.logger.log(`Tenant ${tenantId}: ${orphanIns.length} session(s) orpheline(s) à clôturer`);
        let closedCount = 0;
        for (const inRecord of orphanIns) {
            try {
                const existingOut = await this.prisma.attendance.findFirst({
                    where: {
                        tenantId,
                        employeeId: inRecord.employeeId,
                        type: client_1.AttendanceType.OUT,
                        timestamp: {
                            gt: inRecord.timestamp,
                            lte: endDate,
                        },
                    },
                });
                if (existingOut) {
                    await this.prisma.attendance.update({
                        where: { id: inRecord.id },
                        data: {
                            hasAnomaly: false,
                            anomalyType: null,
                            anomalyNote: null,
                        },
                    });
                    this.logger.log(`🧹 Anomalie MISSING_OUT nettoyée pour ${inRecord.employee.matricule} (OUT trouvé)`);
                    continue;
                }
                let autoOutTime;
                let autoOutNote;
                let hasOvertimeConflict = false;
                let overtimeInfo = null;
                const inDate = new Date(inRecord.timestamp);
                const startOfInDay = new Date(inDate);
                startOfInDay.setHours(0, 0, 0, 0);
                const endOfInDay = new Date(inDate);
                endOfInDay.setHours(23, 59, 59, 999);
                if (checkApprovedOvertime) {
                    const approvedOvertime = await this.prisma.overtime.findFirst({
                        where: {
                            tenantId,
                            employeeId: inRecord.employeeId,
                            date: { gte: startOfInDay, lte: endOfInDay },
                            status: 'APPROVED',
                        },
                        orderBy: { hours: 'desc' },
                    });
                    if (approvedOvertime) {
                        overtimeInfo = {
                            status: 'APPROVED',
                            hours: Number(approvedOvertime.hours),
                        };
                        this.logger.log(`📊 Overtime APPROVED trouvé pour ${inRecord.employee.matricule}: ${approvedOvertime.hours}h`);
                    }
                    else {
                        const pendingOvertime = await this.prisma.overtime.findFirst({
                            where: {
                                tenantId,
                                employeeId: inRecord.employeeId,
                                date: { gte: startOfInDay, lte: endOfInDay },
                                status: 'PENDING',
                            },
                            orderBy: { hours: 'desc' },
                        });
                        if (pendingOvertime) {
                            hasOvertimeConflict = true;
                            overtimeInfo = {
                                status: 'PENDING',
                                hours: Number(pendingOvertime.hours),
                            };
                            this.logger.log(`⚠️ Overtime PENDING trouvé pour ${inRecord.employee.matricule}: ${pendingOvertime.hours}h - Vérification RH requise`);
                        }
                    }
                }
                const schedule = await this.prisma.schedule.findFirst({
                    where: {
                        tenantId,
                        employeeId: inRecord.employeeId,
                        date: { gte: startOfInDay, lte: endOfInDay },
                        status: 'PUBLISHED',
                    },
                    include: {
                        shift: true,
                    },
                });
                let baseEndTime;
                let baseEndTimeStr;
                if (schedule?.shift?.endTime) {
                    const endTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                    baseEndTime = new Date(inDate);
                    baseEndTime.setHours(endTime.hours, endTime.minutes, 0, 0);
                    baseEndTimeStr = schedule.customEndTime || schedule.shift.endTime;
                    const startTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                    if (endTime.hours < startTime.hours) {
                        baseEndTime.setDate(baseEndTime.getDate() + 1);
                    }
                }
                else if (inRecord.employee.currentShift?.endTime) {
                    const endTime = this.parseTimeString(inRecord.employee.currentShift.endTime);
                    baseEndTime = new Date(inDate);
                    baseEndTime.setHours(endTime.hours, endTime.minutes, 0, 0);
                    baseEndTimeStr = inRecord.employee.currentShift.endTime;
                }
                else {
                    const defaultTime = this.parseTimeString(defaultCloseTime);
                    baseEndTime = new Date(inDate);
                    baseEndTime.setHours(defaultTime.hours, defaultTime.minutes, 0, 0);
                    baseEndTimeStr = defaultCloseTime;
                }
                if (overtimeInfo?.status === 'APPROVED' && overtimeInfo.hours > 0) {
                    autoOutTime = new Date(baseEndTime.getTime() + overtimeInfo.hours * 60 * 60 * 1000);
                    autoOutNote = `OUT automatique créé avec ${overtimeInfo.hours}h d'heures supplémentaires approuvées. Fin shift: ${baseEndTimeStr}, OUT calculé: ${autoOutTime.toLocaleTimeString('fr-FR')}. Badge oublié détecté par le système.`;
                }
                else if (overtimeBuffer > 0) {
                    autoOutTime = new Date(baseEndTime.getTime() + overtimeBuffer * 60 * 1000);
                    autoOutNote = `OUT automatique créé à fin de shift (${baseEndTimeStr}) + buffer overtime (${overtimeBuffer} min). Badge oublié détecté par le système.`;
                }
                else {
                    autoOutTime = baseEndTime;
                    if (schedule?.shift?.endTime) {
                        autoOutNote = `OUT automatique créé à l'heure de fin de shift (${baseEndTimeStr}). Badge oublié détecté par le système.`;
                    }
                    else if (inRecord.employee.currentShift?.endTime) {
                        autoOutNote = `OUT automatique créé à l'heure de fin de shift par défaut (${baseEndTimeStr}). Badge oublié détecté par le système.`;
                    }
                    else {
                        autoOutNote = `OUT automatique créé à ${defaultCloseTime} (pas de shift défini, heure configurée). Badge oublié détecté par le système.`;
                    }
                }
                let anomalyType = 'AUTO_CORRECTION';
                if (hasOvertimeConflict) {
                    anomalyType = 'AUTO_CLOSED_CHECK_OVERTIME';
                    autoOutNote += ` ⚠️ ATTENTION: Heures supplémentaires PENDING (${overtimeInfo?.hours}h) - Vérification RH requise pour ajuster si nécessaire.`;
                }
                await this.prisma.attendance.create({
                    data: {
                        tenantId,
                        employeeId: inRecord.employeeId,
                        deviceId: inRecord.deviceId,
                        siteId: inRecord.siteId,
                        timestamp: autoOutTime,
                        type: client_1.AttendanceType.OUT,
                        method: client_1.DeviceType.MANUAL,
                        hasAnomaly: true,
                        anomalyType: anomalyType,
                        anomalyNote: autoOutNote,
                        rawData: {
                            autoGenerated: true,
                            originalInId: inRecord.id,
                            generatedAt: new Date().toISOString(),
                            reason: 'MISSING_OUT_AUTO_CLOSE',
                            overtimeInfo: overtimeInfo,
                            overtimeBuffer: overtimeBuffer,
                            baseEndTime: baseEndTime.toISOString(),
                            hasOvertimeConflict: hasOvertimeConflict,
                        },
                    },
                });
                const inAnomalyType = hasOvertimeConflict ? 'AUTO_CLOSED_CHECK_OVERTIME' : 'AUTO_CLOSED';
                await this.prisma.attendance.update({
                    where: { id: inRecord.id },
                    data: {
                        hasAnomaly: true,
                        anomalyType: inAnomalyType,
                        anomalyNote: `Session clôturée automatiquement à ${autoOutTime.toLocaleTimeString('fr-FR')}. ${autoOutNote}`,
                    },
                });
                closedCount++;
                const logIcon = hasOvertimeConflict ? '⚠️' : '✅';
                this.logger.log(`${logIcon} Session clôturée: ${inRecord.employee.firstName} ${inRecord.employee.lastName} (${inRecord.employee.matricule}) - IN à ${inRecord.timestamp.toLocaleString('fr-FR')} → OUT à ${autoOutTime.toLocaleString('fr-FR')}${hasOvertimeConflict ? ' (OVERTIME CONFLICT - À VÉRIFIER)' : ''}`);
            }
            catch (error) {
                this.logger.error(`Erreur lors de la clôture de la session ${inRecord.id}:`, error);
            }
        }
        return closedCount;
    }
};
exports.AutoCloseSessionsJob = AutoCloseSessionsJob;
__decorate([
    (0, schedule_1.Cron)('0 2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AutoCloseSessionsJob.prototype, "autoCloseSessions", null);
exports.AutoCloseSessionsJob = AutoCloseSessionsJob = AutoCloseSessionsJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AutoCloseSessionsJob);
//# sourceMappingURL=auto-close-sessions.job.js.map