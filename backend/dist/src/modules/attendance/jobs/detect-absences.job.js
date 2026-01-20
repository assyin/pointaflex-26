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
var DetectAbsencesJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectAbsencesJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../../database/prisma.service");
const client_1 = require("@prisma/client");
let DetectAbsencesJob = DetectAbsencesJob_1 = class DetectAbsencesJob {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DetectAbsencesJob_1.name);
    }
    async detectAbsences() {
        this.logger.log('Démarrage de la détection des absences...');
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
            for (const tenant of tenants) {
                try {
                    await this.detectAbsencesForTenant(tenant.id, yesterday, endOfYesterday);
                }
                catch (error) {
                    this.logger.error(`Erreur lors de la détection des absences pour le tenant ${tenant.id}:`, error);
                }
            }
            this.logger.log('Détection des absences terminée avec succès');
        }
        catch (error) {
            this.logger.error('Erreur lors de la détection des absences:', error);
        }
    }
    async detectAbsencesForTenant(tenantId, startDate, endDate) {
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                workingDays: true,
                requireScheduleForAttendance: true,
            },
        });
        const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6];
        const requireScheduleForAttendance = settings?.requireScheduleForAttendance ?? true;
        const schedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                date: { gte: startDate, lte: endDate },
                status: 'PUBLISHED',
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        isActive: true,
                    },
                },
                shift: {
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                    },
                },
            },
        });
        let absenceCount = 0;
        for (const schedule of schedules) {
            if (!schedule.employee.isActive) {
                continue;
            }
            const dayOfWeek = schedule.date.getDay();
            const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
            if (!workingDays.includes(normalizedDayOfWeek)) {
                continue;
            }
            const hasAttendance = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: schedule.employeeId,
                    type: client_1.AttendanceType.IN,
                    timestamp: {
                        gte: new Date(schedule.date.setHours(0, 0, 0, 0)),
                        lte: new Date(schedule.date.setHours(23, 59, 59, 999)),
                    },
                },
            });
            if (!hasAttendance) {
                const leave = await this.prisma.leave.findFirst({
                    where: {
                        tenantId,
                        employeeId: schedule.employeeId,
                        startDate: { lte: schedule.date },
                        endDate: { gte: schedule.date },
                        status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
                    },
                });
                if (!leave) {
                    await this.createAbsenceRecord(tenantId, schedule);
                    absenceCount++;
                }
            }
        }
        const employeesWithDefaultShift = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
                currentShiftId: { not: null },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
                isActive: true,
                currentShift: {
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                    },
                },
            },
        });
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
            if (workingDays.includes(normalizedDayOfWeek)) {
                for (const employee of employeesWithDefaultShift) {
                    const specificSchedule = await this.prisma.schedule.findFirst({
                        where: {
                            tenantId,
                            employeeId: employee.id,
                            date: {
                                gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                                lte: new Date(currentDate.setHours(23, 59, 59, 999)),
                            },
                        },
                    });
                    if (!specificSchedule) {
                        const hasAttendance = await this.prisma.attendance.findFirst({
                            where: {
                                tenantId,
                                employeeId: employee.id,
                                type: client_1.AttendanceType.IN,
                                timestamp: {
                                    gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                                    lte: new Date(currentDate.setHours(23, 59, 59, 999)),
                                },
                            },
                        });
                        if (!hasAttendance) {
                            const leave = await this.prisma.leave.findFirst({
                                where: {
                                    tenantId,
                                    employeeId: employee.id,
                                    startDate: { lte: currentDate },
                                    endDate: { gte: currentDate },
                                    status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
                                },
                            });
                            if (!leave) {
                                await this.createAbsenceRecord(tenantId, {
                                    employeeId: employee.id,
                                    date: new Date(currentDate),
                                    shift: employee.currentShift,
                                    customStartTime: null,
                                    employee: {
                                        id: employee.id,
                                        firstName: employee.firstName,
                                        lastName: employee.lastName,
                                        matricule: employee.matricule,
                                        isActive: employee.isActive,
                                    },
                                });
                                absenceCount++;
                            }
                        }
                    }
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (absenceCount > 0) {
            this.logger.log(`${absenceCount} absence(s) détectée(s) pour le tenant ${tenantId}`);
        }
    }
    async createAbsenceRecord(tenantId, schedule) {
        try {
            const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
            const absenceTimestamp = new Date(schedule.date);
            absenceTimestamp.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
            const startOfDay = new Date(schedule.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(schedule.date);
            endOfDay.setHours(23, 59, 59, 999);
            const existingAbsence = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: schedule.employeeId,
                    timestamp: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    anomalyType: 'ABSENCE',
                    isGenerated: true,
                    generatedBy: 'ABSENCE_DETECTION_JOB',
                },
            });
            if (existingAbsence) {
                return;
            }
            const TOLERANCE_MINUTES = 30;
            const toleranceStart = new Date(absenceTimestamp.getTime() - TOLERANCE_MINUTES * 60 * 1000);
            const toleranceEnd = new Date(absenceTimestamp.getTime() + TOLERANCE_MINUTES * 60 * 1000);
            const existingRealPunch = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: schedule.employeeId,
                    timestamp: {
                        gte: toleranceStart,
                        lte: toleranceEnd,
                    },
                    OR: [
                        { isGenerated: false },
                        { isGenerated: null },
                    ],
                    NOT: {
                        anomalyType: 'DEBOUNCE_BLOCKED',
                    },
                },
            });
            if (existingRealPunch) {
                this.logger.debug(`Pointage réel trouvé pour ${schedule.employee.firstName} ${schedule.employee.lastName} à ${existingRealPunch.timestamp.toISOString()} - Absence NON créée`);
                return;
            }
            const anyRealPunchToday = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: schedule.employeeId,
                    timestamp: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                    OR: [
                        { isGenerated: false },
                        { isGenerated: null },
                    ],
                    NOT: {
                        anomalyType: 'DEBOUNCE_BLOCKED',
                    },
                },
            });
            if (anyRealPunchToday) {
                this.logger.debug(`Pointage réel trouvé ailleurs dans la journée pour ${schedule.employee.firstName} ${schedule.employee.lastName} - Absence NON créée`);
                return;
            }
            await this.prisma.attendance.create({
                data: {
                    tenantId,
                    employeeId: schedule.employeeId,
                    timestamp: absenceTimestamp,
                    type: client_1.AttendanceType.IN,
                    method: client_1.DeviceType.MANUAL,
                    hasAnomaly: true,
                    anomalyType: 'ABSENCE',
                    anomalyNote: 'Absence complète détectée : aucun pointage enregistré pour cette journée',
                    isGenerated: true,
                    generatedBy: 'ABSENCE_DETECTION_JOB',
                },
            });
            this.logger.debug(`Absence créée pour ${schedule.employee.firstName} ${schedule.employee.lastName} (${schedule.employee.matricule}) le ${schedule.date.toISOString().split('T')[0]}`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de la création de l'absence pour l'employé ${schedule.employeeId}:`, error);
        }
    }
    parseTimeString(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return { hours: hours || 0, minutes: minutes || 0 };
    }
    async detectTechnicalAbsences(tenantId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const failedAttempts = await this.prisma.attendanceAttempt.findMany({
            where: {
                tenantId,
                timestamp: { gte: startOfDay, lte: endOfDay },
                status: 'FAILED',
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        isActive: true,
                    },
                },
            },
            distinct: ['employeeId'],
        });
        for (const attempt of failedAttempts) {
            if (!attempt.employee.isActive) {
                continue;
            }
            const hasSuccess = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: attempt.employeeId,
                    timestamp: { gte: startOfDay, lte: endOfDay },
                },
            });
            if (!hasSuccess) {
                const schedule = await this.prisma.schedule.findFirst({
                    where: {
                        tenantId,
                        employeeId: attempt.employeeId,
                        date: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                        status: 'PUBLISHED',
                    },
                    include: {
                        shift: true,
                    },
                });
                if (schedule) {
                    const leave = await this.prisma.leave.findFirst({
                        where: {
                            tenantId,
                            employeeId: attempt.employeeId,
                            startDate: { lte: date },
                            endDate: { gte: date },
                            status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
                        },
                    });
                    if (!leave) {
                        await this.createAbsenceRecord(tenantId, {
                            employeeId: attempt.employeeId,
                            date,
                            shift: schedule.shift,
                            customStartTime: schedule.customStartTime,
                            employee: attempt.employee,
                        });
                    }
                }
            }
        }
    }
};
exports.DetectAbsencesJob = DetectAbsencesJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DetectAbsencesJob.prototype, "detectAbsences", null);
exports.DetectAbsencesJob = DetectAbsencesJob = DetectAbsencesJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DetectAbsencesJob);
//# sourceMappingURL=detect-absences.job.js.map