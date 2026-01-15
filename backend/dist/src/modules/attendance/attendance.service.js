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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const matricule_util_1 = require("../../common/utils/matricule.util");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let AttendanceService = class AttendanceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    roundOvertimeHours(hours, roundingMinutes) {
        if (roundingMinutes <= 0)
            return hours;
        const totalMinutes = hours * 60;
        const roundedMinutes = Math.round(totalMinutes / roundingMinutes) * roundingMinutes;
        return roundedMinutes / 60;
    }
    getOvertimeRate(settings, overtimeType) {
        const majorationEnabled = settings?.overtimeMajorationEnabled !== false;
        if (!majorationEnabled)
            return 1.0;
        switch (overtimeType) {
            case 'NIGHT':
                return Number(settings?.overtimeRateNight ?? settings?.nightShiftRate ?? 1.50);
            case 'HOLIDAY':
                return Number(settings?.overtimeRateHoliday ?? settings?.holidayOvertimeRate ?? 2.00);
            case 'EMERGENCY':
                return Number(settings?.overtimeRateEmergency ?? 1.30);
            case 'STANDARD':
            default:
                return Number(settings?.overtimeRateStandard ?? settings?.overtimeRate ?? 1.25);
        }
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
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    async createAutoOvertime(tenantId, attendance, overtimeMinutes) {
        try {
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
            if (overtimeMinutes <= minimumThreshold) {
                console.log(`[AutoOvertime] ${overtimeMinutes}min <= seuil ${minimumThreshold}min, pas de création`);
                return;
            }
            const employee = await this.prisma.employee.findUnique({
                where: { id: attendance.employeeId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    matricule: true,
                    isEligibleForOvertime: true,
                    maxOvertimeHoursPerMonth: true,
                    maxOvertimeHoursPerWeek: true,
                },
            });
            if (!employee || employee.isEligibleForOvertime === false) {
                console.log(`[AutoOvertime] Employé non éligible: ${employee?.firstName} ${employee?.lastName}`);
                return;
            }
            const attendanceDate = new Date(attendance.timestamp.toISOString().split('T')[0]);
            const approvedLeaveStatuses = [client_1.LeaveStatus.APPROVED, client_1.LeaveStatus.MANAGER_APPROVED, client_1.LeaveStatus.HR_APPROVED];
            const leave = await this.prisma.leave.findFirst({
                where: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    status: { in: approvedLeaveStatuses },
                    startDate: { lte: attendanceDate },
                    endDate: { gte: attendanceDate },
                },
            });
            if (leave) {
                console.log(`[AutoOvertime] Employé en congé, pas de création`);
                return;
            }
            const recoveryDay = await this.prisma.recoveryDay.findFirst({
                where: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    status: { in: ['APPROVED', 'USED'] },
                    startDate: { lte: attendanceDate },
                    endDate: { gte: attendanceDate },
                },
            });
            if (recoveryDay) {
                console.log(`[AutoOvertime] Employé en jour de récupération, pas de création`);
                return;
            }
            const existingOvertime = await this.prisma.overtime.findFirst({
                where: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    date: attendanceDate,
                },
            });
            if (existingOvertime) {
                console.log(`[AutoOvertime] Overtime existe déjà pour ${employee.firstName} ${employee.lastName} le ${attendanceDate.toISOString().split('T')[0]}`);
                return;
            }
            const overtimeHours = overtimeMinutes / 60;
            const autoDetectType = settings?.overtimeAutoDetectType !== false;
            let overtimeType = 'STANDARD';
            const dateStr = attendanceDate.toISOString().split('T')[0];
            if (autoDetectType) {
                const holiday = await this.prisma.holiday.findFirst({
                    where: {
                        tenantId,
                        date: attendanceDate,
                    },
                });
                if (holiday) {
                    overtimeType = 'HOLIDAY';
                }
                else if (this.isNightShiftTime(attendance.timestamp, settings)) {
                    overtimeType = 'NIGHT';
                }
            }
            const rate = this.getOvertimeRate(settings, overtimeType);
            const autoApprove = settings?.overtimeAutoApprove === true;
            const autoApproveMaxHours = Number(settings?.overtimeAutoApproveMaxHours) || 4.0;
            const shouldAutoApprove = autoApprove && overtimeHours <= autoApproveMaxHours;
            const status = shouldAutoApprove ? client_1.OvertimeStatus.APPROVED : client_1.OvertimeStatus.PENDING;
            const overtime = await this.prisma.overtime.create({
                data: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    date: attendanceDate,
                    hours: overtimeHours,
                    approvedHours: shouldAutoApprove ? overtimeHours : null,
                    type: overtimeType,
                    rate,
                    isNightShift: overtimeType === 'NIGHT',
                    status,
                    approvedAt: shouldAutoApprove ? new Date() : null,
                    notes: `Créé automatiquement depuis pointage du ${attendance.timestamp.toLocaleDateString('fr-FR')}${overtimeType !== 'STANDARD' ? ` (${overtimeType})` : ''}${shouldAutoApprove ? ' - Auto-approuvé' : ''}`,
                },
            });
            const statusEmoji = shouldAutoApprove ? '✅' : '⏳';
            const statusText = shouldAutoApprove ? 'auto-approuvé' : 'en attente';
            console.log(`[AutoOvertime] ${statusEmoji} Overtime ${statusText} créé pour ${employee.firstName} ${employee.lastName} (${employee.matricule}): ${overtimeHours.toFixed(2)}h de type ${overtimeType}`);
        }
        catch (error) {
            console.error(`[AutoOvertime] Erreur lors de la création automatique:`, error);
        }
    }
    async create(tenantId, createAttendanceDto) {
        let attemptId = null;
        try {
            const attempt = await this.prisma.attendanceAttempt.create({
                data: {
                    tenantId,
                    employeeId: createAttendanceDto.employeeId,
                    deviceId: createAttendanceDto.deviceId || null,
                    timestamp: new Date(createAttendanceDto.timestamp),
                    type: createAttendanceDto.type,
                    method: createAttendanceDto.method,
                    status: 'SUCCESS',
                    rawData: createAttendanceDto.rawData || null,
                },
            });
            attemptId = attempt.id;
        }
        catch (error) {
            console.error('Erreur lors du logging de la tentative:', error);
        }
        try {
            const employee = await this.prisma.employee.findFirst({
                where: {
                    id: createAttendanceDto.employeeId,
                    tenantId,
                },
            });
            if (!employee) {
                if (attemptId) {
                    await this.prisma.attendanceAttempt.update({
                        where: { id: attemptId },
                        data: {
                            status: 'FAILED',
                            errorCode: 'EMPLOYEE_NOT_FOUND',
                            errorMessage: 'Employee not found',
                        },
                    });
                }
                throw new common_1.NotFoundException('Employee not found');
            }
            await this.validateBreakPunch(tenantId, createAttendanceDto.type);
            await this.validateScheduleOrShift(tenantId, createAttendanceDto.employeeId, new Date(createAttendanceDto.timestamp), createAttendanceDto.type);
            const debounceSettings = await this.prisma.tenantSettings.findUnique({
                where: { tenantId },
                select: { doublePunchToleranceMinutes: true },
            });
            const DEBOUNCE_MINUTES = debounceSettings?.doublePunchToleranceMinutes ?? 4;
            const punchTimestamp = new Date(createAttendanceDto.timestamp);
            console.log(`🔍 [DEBOUNCE-DEBUG] tenantId: ${tenantId}`);
            console.log(`🔍 [DEBOUNCE-DEBUG] employeeId: ${createAttendanceDto.employeeId}`);
            console.log(`🔍 [DEBOUNCE-DEBUG] punchTimestamp: ${punchTimestamp.toISOString()}`);
            console.log(`🔍 [DEBOUNCE-DEBUG] DEBOUNCE_MINUTES: ${DEBOUNCE_MINUTES}`);
            const existingCount = await this.prisma.attendance.count({
                where: { tenantId, employeeId: createAttendanceDto.employeeId },
            });
            console.log(`🔍 [DEBOUNCE-DEBUG] existingPunchCount: ${existingCount}`);
            const lastPunch = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: createAttendanceDto.employeeId,
                    OR: [
                        { anomalyType: null },
                        { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
                    ],
                },
                orderBy: { timestamp: 'desc' },
            });
            console.log(`🔍 [DEBOUNCE-DEBUG] lastPunch: ${lastPunch ? lastPunch.timestamp.toISOString() : 'NULL'}`);
            if (lastPunch) {
                const diffMinutes = (punchTimestamp.getTime() - lastPunch.timestamp.getTime()) / (1000 * 60);
                console.log(`🔍 [DEBOUNCE-DEBUG] diffMinutes: ${diffMinutes.toFixed(2)} (condition: >= 0 && < ${DEBOUNCE_MINUTES})`);
                if (diffMinutes >= 0 && diffMinutes < DEBOUNCE_MINUTES) {
                    console.log(`⚠️ [DEBOUNCE-MANUAL] Badge ignoré pour ${employee.matricule}: ${diffMinutes.toFixed(1)} min depuis le dernier (< ${DEBOUNCE_MINUTES} min)`);
                    const debounceRecord = await this.prisma.attendance.create({
                        data: {
                            tenantId,
                            employeeId: createAttendanceDto.employeeId,
                            siteId: createAttendanceDto.siteId || null,
                            deviceId: createAttendanceDto.deviceId || null,
                            timestamp: punchTimestamp,
                            type: createAttendanceDto.type,
                            method: createAttendanceDto.method,
                            hasAnomaly: true,
                            anomalyType: 'DEBOUNCE_BLOCKED',
                            anomalyNote: `Badge ignoré (anti-rebond manuel): ${diffMinutes.toFixed(1)} min depuis le dernier pointage (seuil: ${DEBOUNCE_MINUTES} min)`,
                            rawData: {
                                source: 'DEBOUNCE_LOG_MANUAL',
                                blockedReason: 'DEBOUNCE',
                                previousPunchId: lastPunch.id,
                                threshold: DEBOUNCE_MINUTES,
                                actualDiff: diffMinutes,
                            },
                        },
                        include: {
                            employee: {
                                select: { id: true, matricule: true, firstName: true, lastName: true, photo: true },
                            },
                            site: true,
                            device: true,
                        },
                    });
                    console.log(`📋 [DEBOUNCE-MANUAL] Enregistrement informatif créé: ${debounceRecord.id}`);
                    return {
                        ...debounceRecord,
                        _debounced: true,
                        _debounceInfo: {
                            reason: 'DEBOUNCE',
                            message: `Pointage enregistré comme informatif: trop proche du précédent (${diffMinutes.toFixed(1)} min < ${DEBOUNCE_MINUTES} min)`,
                            previousPunchId: lastPunch.id,
                            previousPunchTime: lastPunch.timestamp,
                            configuredTolerance: DEBOUNCE_MINUTES,
                        },
                    };
                }
            }
            const anomaly = await this.detectAnomalies(tenantId, createAttendanceDto.employeeId, new Date(createAttendanceDto.timestamp), createAttendanceDto.type);
            if (anomaly.isInformativeDoublePunch) {
                console.log(`ℹ️ [INFORMATIF] ${anomaly.informativeNote} - Employé: ${createAttendanceDto.employeeId}`);
            }
            const metrics = await this.calculateMetrics(tenantId, createAttendanceDto.employeeId, new Date(createAttendanceDto.timestamp), createAttendanceDto.type);
            const attendance = await this.prisma.attendance.create({
                data: {
                    ...createAttendanceDto,
                    tenantId,
                    timestamp: new Date(createAttendanceDto.timestamp),
                    hasAnomaly: anomaly.hasAnomaly,
                    anomalyType: anomaly.type,
                    anomalyNote: anomaly.note,
                    hoursWorked: metrics.hoursWorked ? new library_1.Decimal(metrics.hoursWorked) : null,
                    lateMinutes: metrics.lateMinutes,
                    earlyLeaveMinutes: metrics.earlyLeaveMinutes,
                    overtimeMinutes: metrics.overtimeMinutes,
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            matricule: true,
                            firstName: true,
                            lastName: true,
                            photo: true,
                            userId: true,
                            department: {
                                select: {
                                    id: true,
                                    managerId: true,
                                },
                            },
                            site: {
                                select: {
                                    id: true,
                                    siteManagers: {
                                        select: {
                                            managerId: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    site: true,
                    device: true,
                },
            });
            if (anomaly.hasAnomaly) {
                await this.notifyManagersOfAnomaly(tenantId, attendance);
            }
            if (createAttendanceDto.type === client_2.AttendanceType.OUT && metrics.overtimeMinutes && metrics.overtimeMinutes > 0) {
                await this.createAutoOvertime(tenantId, attendance, metrics.overtimeMinutes);
            }
            if (createAttendanceDto.type === client_2.AttendanceType.OUT) {
                const timestamp = new Date(createAttendanceDto.timestamp);
                const startOfDay = new Date(timestamp);
                startOfDay.setHours(0, 0, 0, 0);
                const inWithMissingOut = await this.prisma.attendance.findFirst({
                    where: {
                        tenantId,
                        employeeId: createAttendanceDto.employeeId,
                        type: client_2.AttendanceType.IN,
                        timestamp: { gte: startOfDay, lt: timestamp },
                        hasAnomaly: true,
                        anomalyType: 'MISSING_OUT',
                    },
                    orderBy: { timestamp: 'desc' },
                });
                if (inWithMissingOut) {
                    await this.prisma.attendance.update({
                        where: { id: inWithMissingOut.id },
                        data: {
                            hasAnomaly: false,
                            anomalyType: null,
                            anomalyNote: null,
                        },
                    });
                    console.log(`✅ [Create] Anomalie MISSING_OUT effacée sur IN ${inWithMissingOut.id}`);
                }
            }
            return attendance;
        }
        catch (error) {
            if (attemptId) {
                try {
                    await this.prisma.attendanceAttempt.update({
                        where: { id: attemptId },
                        data: {
                            status: 'FAILED',
                            errorCode: error.code || 'UNKNOWN_ERROR',
                            errorMessage: error.message || 'Unknown error occurred',
                        },
                    });
                }
                catch (updateError) {
                    console.error('Erreur lors de la mise à jour du log:', updateError);
                }
            }
            throw error;
        }
    }
    async getPunchCountForDay(tenantId, employeeId, date, deviceId, apiKey, punchTime) {
        if (deviceId) {
            const device = await this.prisma.attendanceDevice.findFirst({
                where: { deviceId, tenantId },
                select: { id: true, apiKey: true },
            });
            if (!device) {
                throw new Error(`Device ${deviceId} not found for tenant ${tenantId}`);
            }
            if (apiKey && device.apiKey && device.apiKey !== apiKey) {
                throw new Error('Invalid API key');
            }
        }
        const employee = await (0, matricule_util_1.findEmployeeByMatriculeFlexible)(this.prisma, tenantId, employeeId);
        if (!employee) {
            return { count: 0, forceType: null };
        }
        const nightShiftSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                nightShiftEnd: true,
                nightShiftStart: true,
            },
        });
        const nightShiftEndStr = nightShiftSettings?.nightShiftEnd || '06:00';
        const [nightEndHour] = nightShiftEndStr.split(':').map(Number);
        const NIGHT_SHIFT_MORNING_THRESHOLD = nightEndHour + 4;
        const punchDateTime = punchTime ? new Date(punchTime) : null;
        const punchHour = punchDateTime ? punchDateTime.getUTCHours() : null;
        if (punchHour !== null && punchHour < NIGHT_SHIFT_MORNING_THRESHOLD) {
            const yesterday = new Date(date);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            const startOfYesterday = new Date(`${yesterdayStr}T00:00:00.000Z`);
            const endOfYesterday = new Date(`${yesterdayStr}T23:59:59.999Z`);
            const lastInYesterday = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    type: 'IN',
                    timestamp: {
                        gte: startOfYesterday,
                        lte: endOfYesterday,
                    },
                },
                orderBy: { timestamp: 'desc' },
                include: {
                    employee: {
                        select: {
                            currentShift: {
                                select: { isNightShift: true, endTime: true },
                            },
                        },
                    },
                },
            });
            if (lastInYesterday) {
                const matchingOut = await this.prisma.attendance.findFirst({
                    where: {
                        tenantId,
                        employeeId: employee.id,
                        type: 'OUT',
                        timestamp: {
                            gt: lastInYesterday.timestamp,
                        },
                    },
                });
                if (!matchingOut) {
                    const isNightShiftEmployee = lastInYesterday.employee?.currentShift?.isNightShift === true;
                    const inHour = lastInYesterday.timestamp.getUTCHours();
                    const nightStartHour = parseInt((nightShiftSettings?.nightShiftStart || '21:00').split(':')[0]);
                    const isLateInTime = inHour >= nightStartHour || inHour < nightEndHour;
                    if (isNightShiftEmployee || isLateInTime) {
                        console.log(`🌙 [NIGHT SHIFT] Session ouverte depuis ${lastInYesterday.timestamp.toISOString()} - Forçage OUT pour ${employee.matricule} [isNightShift: ${isNightShiftEmployee}, inHour: ${inHour}, nightEnd: ${nightShiftEndStr}]`);
                        return {
                            count: 1,
                            forceType: 'OUT',
                            reason: 'NIGHT_SHIFT_DETECTION',
                            openSessionFrom: lastInYesterday.timestamp,
                            nightShiftConfig: {
                                nightShiftEnd: nightShiftEndStr,
                                isNightShiftEmployee,
                                inHour,
                            },
                        };
                    }
                }
            }
        }
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.999Z`);
        const count = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId: employee.id,
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });
        return { count, forceType: null };
    }
    async handleWebhookFast(tenantId, deviceId, webhookData, apiKey) {
        const device = await this.prisma.attendanceDevice.findFirst({
            where: { deviceId, tenantId },
            select: { id: true, apiKey: true, siteId: true },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        if (device.apiKey && device.apiKey !== apiKey) {
            throw new common_1.ForbiddenException('Invalid API Key');
        }
        let employee = await (0, matricule_util_1.findEmployeeByMatriculeFlexible)(this.prisma, tenantId, webhookData.employeeId);
        if (!employee) {
            throw new common_1.NotFoundException(`Employee ${webhookData.employeeId} not found`);
        }
        const punchTime = new Date(webhookData.timestamp);
        const existingPunch = await this.prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId: employee.id,
                timestamp: punchTime,
            },
        });
        if (existingPunch) {
            return {
                status: 'duplicate',
                reason: 'EXACT_DUPLICATE',
                message: `Pointage ignoré: un pointage identique existe déjà à ${punchTime.toISOString()}`,
                existingAttendanceId: existingPunch.id,
            };
        }
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { doublePunchToleranceMinutes: true },
        });
        const DEBOUNCE_MINUTES = settings?.doublePunchToleranceMinutes ?? 2;
        const lastPunch = await this.prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId: employee.id,
                NOT: { anomalyType: 'DEBOUNCE_BLOCKED' },
            },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true, type: true },
        });
        if (lastPunch) {
            const diffMinutes = (punchTime.getTime() - lastPunch.timestamp.getTime()) / 60000;
            if (diffMinutes >= 0 && diffMinutes < DEBOUNCE_MINUTES) {
                console.log(`⚠️ [DEBOUNCE] Badge ignoré pour ${employee.matricule}: ${diffMinutes.toFixed(1)} min depuis le dernier (< ${DEBOUNCE_MINUTES} min) [Config: ${DEBOUNCE_MINUTES} min]`);
                const debounceRecord = await this.prisma.attendance.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        deviceId: device.id,
                        siteId: device.siteId,
                        timestamp: punchTime,
                        type: webhookData.type,
                        method: webhookData.method,
                        hasAnomaly: true,
                        anomalyType: 'DEBOUNCE_BLOCKED',
                        anomalyNote: `Badge ignoré (anti-rebond): ${diffMinutes.toFixed(1)} min depuis le dernier pointage (seuil: ${DEBOUNCE_MINUTES} min)`,
                        needsApproval: false,
                        rawData: {
                            source: 'DEBOUNCE_LOG',
                            blockedReason: 'DEBOUNCE',
                            timeSinceLastPunch: diffMinutes,
                            threshold: DEBOUNCE_MINUTES,
                            lastPunchTime: lastPunch.timestamp,
                            lastPunchType: lastPunch.type,
                        },
                    },
                });
                console.log(`📋 [DEBOUNCE] Enregistrement informatif créé: ${debounceRecord.id}`);
                return {
                    status: 'logged_info',
                    reason: 'DEBOUNCE',
                    message: `Pointage enregistré comme informatif: trop proche du précédent (${diffMinutes.toFixed(1)} min < ${DEBOUNCE_MINUTES} min)`,
                    attendanceId: debounceRecord.id,
                    lastPunchTime: lastPunch.timestamp,
                    lastPunchType: lastPunch.type,
                    configuredTolerance: DEBOUNCE_MINUTES,
                };
            }
        }
        const getSourceFromMethod = (method) => {
            switch (method) {
                case client_2.DeviceType.FINGERPRINT:
                case client_2.DeviceType.FACE_RECOGNITION:
                case client_2.DeviceType.RFID_BADGE:
                    return 'TERMINAL_ZKTECO';
                case client_2.DeviceType.MOBILE_GPS:
                    return 'MOBILE_APP';
                case client_2.DeviceType.MANUAL:
                    return 'MANUAL';
                case client_2.DeviceType.QR_CODE:
                case client_2.DeviceType.PIN_CODE:
                    return 'TERMINAL_OTHER';
                default:
                    return 'UNKNOWN';
            }
        };
        const standardizedRawData = {
            source: getSourceFromMethod(webhookData.method),
            originalData: webhookData.rawData || null,
            inOutDetection: {
                method: 'ALTERNATION',
                receivedType: webhookData.type,
                processedAt: new Date().toISOString(),
            },
            receivedAt: new Date().toISOString(),
            deviceId: device.id,
        };
        const attendance = await this.prisma.attendance.create({
            data: {
                tenantId,
                employeeId: employee.id,
                deviceId: device.id,
                siteId: device.siteId,
                timestamp: new Date(webhookData.timestamp),
                type: webhookData.type,
                method: webhookData.method,
                rawData: standardizedRawData,
            },
        });
        this.prisma.attendanceDevice.update({
            where: { id: device.id },
            data: { lastSync: new Date() },
        }).catch(() => { });
        setImmediate(async () => {
            try {
                const metrics = await this.calculateMetrics(tenantId, employee.id, new Date(webhookData.timestamp), webhookData.type);
                const anomaly = await this.detectAnomalies(tenantId, employee.id, new Date(webhookData.timestamp), webhookData.type);
                const hasAnomalyFlag = anomaly?.hasAnomaly === true;
                const anomalyTypeValue = hasAnomalyFlag ? anomaly.type : null;
                await this.prisma.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        hoursWorked: metrics.hoursWorked,
                        lateMinutes: metrics.lateMinutes,
                        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
                        overtimeMinutes: metrics.overtimeMinutes,
                        hasAnomaly: hasAnomalyFlag,
                        anomalyType: anomalyTypeValue,
                    },
                });
                if (webhookData.type === client_2.AttendanceType.OUT) {
                    const timestamp = new Date(webhookData.timestamp);
                    const startOfDay = new Date(timestamp);
                    startOfDay.setHours(0, 0, 0, 0);
                    const inWithMissingOut = await this.prisma.attendance.findFirst({
                        where: {
                            tenantId,
                            employeeId: employee.id,
                            type: client_2.AttendanceType.IN,
                            timestamp: { gte: startOfDay, lt: timestamp },
                            hasAnomaly: true,
                            anomalyType: 'MISSING_OUT',
                        },
                        orderBy: { timestamp: 'desc' },
                    });
                    if (inWithMissingOut) {
                        await this.prisma.attendance.update({
                            where: { id: inWithMissingOut.id },
                            data: {
                                hasAnomaly: false,
                                anomalyType: null,
                                anomalyNote: null,
                            },
                        });
                        console.log(`✅ [WebhookFast] Anomalie MISSING_OUT effacée sur IN ${inWithMissingOut.id} pour ${employee.matricule}`);
                    }
                }
                console.log(`✅ [WebhookFast] Métriques calculées pour ${employee.matricule}`);
            }
            catch (error) {
                console.error(`❌ [WebhookFast] Erreur calcul métriques:`, error.message);
            }
        });
        return {
            success: true,
            attendanceId: attendance.id,
            employee: {
                id: employee.id,
                matricule: employee.matricule,
                name: `${employee.firstName} ${employee.lastName}`,
            },
            timestamp: webhookData.timestamp,
            type: webhookData.type,
        };
    }
    async handleWebhook(tenantId, deviceId, webhookData, apiKey) {
        const device = await this.prisma.attendanceDevice.findFirst({
            where: { deviceId, tenantId },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        if (device.apiKey) {
            if (!apiKey) {
                throw new common_1.ForbiddenException('API Key required for this device');
            }
            if (device.apiKey !== apiKey) {
                throw new common_1.ForbiddenException('Invalid API Key');
            }
        }
        let employee = await this.prisma.employee.findFirst({
            where: {
                tenantId,
                id: webhookData.employeeId,
            },
        });
        if (!employee) {
            try {
                const mapping = await this.prisma.terminalMatriculeMapping.findFirst({
                    where: {
                        tenantId,
                        terminalMatricule: webhookData.employeeId,
                        isActive: true,
                    },
                    include: {
                        employee: true,
                    },
                });
                if (mapping) {
                    employee = mapping.employee;
                    console.log(`[AttendanceService] ✅ Employé trouvé via mapping terminal: ${mapping.terminalMatricule} → ${mapping.officialMatricule} (${employee.firstName} ${employee.lastName})`);
                }
            }
            catch (error) {
                console.error(`[AttendanceService] Erreur lors de la recherche dans le mapping terminal:`, error);
            }
        }
        if (!employee) {
            try {
                employee = await (0, matricule_util_1.findEmployeeByMatriculeFlexible)(this.prisma, tenantId, webhookData.employeeId);
            }
            catch (error) {
                console.error(`[AttendanceService] Erreur lors de la recherche flexible du matricule ${webhookData.employeeId}:`, error);
            }
        }
        if (!employee) {
            throw new common_1.NotFoundException(`Employee ${webhookData.employeeId} not found`);
        }
        const punchTime = new Date(webhookData.timestamp);
        const existingPunch = await this.prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId: employee.id,
                timestamp: punchTime,
            },
        });
        if (existingPunch) {
            return {
                status: 'duplicate',
                reason: 'EXACT_DUPLICATE',
                message: `Pointage ignoré: un pointage identique existe déjà à ${punchTime.toISOString()}`,
                existingAttendanceId: existingPunch.id,
            };
        }
        const debounceSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { doublePunchToleranceMinutes: true },
        });
        const DEBOUNCE_MINUTES = debounceSettings?.doublePunchToleranceMinutes ?? 2;
        const lastPunch = await this.prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId: employee.id,
                NOT: { anomalyType: 'DEBOUNCE_BLOCKED' },
            },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true, type: true },
        });
        if (lastPunch) {
            const diffMinutes = (punchTime.getTime() - lastPunch.timestamp.getTime()) / 60000;
            if (diffMinutes >= 0 && diffMinutes < DEBOUNCE_MINUTES) {
                console.log(`⚠️ [DEBOUNCE] Badge ignoré pour ${employee.matricule}: ${diffMinutes.toFixed(1)} min depuis le dernier (< ${DEBOUNCE_MINUTES} min) [Config: ${DEBOUNCE_MINUTES} min]`);
                const debounceRecord = await this.prisma.attendance.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        deviceId: device.id,
                        siteId: device.siteId,
                        timestamp: punchTime,
                        type: webhookData.type,
                        method: webhookData.method,
                        hasAnomaly: true,
                        anomalyType: 'DEBOUNCE_BLOCKED',
                        anomalyNote: `Badge ignoré (anti-rebond): ${diffMinutes.toFixed(1)} min depuis le dernier pointage (seuil: ${DEBOUNCE_MINUTES} min)`,
                        needsApproval: false,
                        rawData: {
                            source: 'DEBOUNCE_LOG',
                            blockedReason: 'DEBOUNCE',
                            timeSinceLastPunch: diffMinutes,
                            threshold: DEBOUNCE_MINUTES,
                            lastPunchTime: lastPunch.timestamp,
                            lastPunchType: lastPunch.type,
                        },
                    },
                });
                console.log(`📋 [DEBOUNCE] Enregistrement informatif créé: ${debounceRecord.id}`);
                return {
                    status: 'logged_info',
                    reason: 'DEBOUNCE',
                    message: `Pointage enregistré comme informatif: trop proche du précédent (${diffMinutes.toFixed(1)} min < ${DEBOUNCE_MINUTES} min)`,
                    attendanceId: debounceRecord.id,
                    lastPunchTime: lastPunch.timestamp,
                    lastPunchType: lastPunch.type,
                    configuredTolerance: DEBOUNCE_MINUTES,
                };
            }
        }
        await this.validateBreakPunch(tenantId, webhookData.type);
        const anomaly = await this.detectAnomalies(tenantId, employee.id, new Date(webhookData.timestamp), webhookData.type);
        if (anomaly.isInformativeDoublePunch) {
            console.log(`ℹ️ [INFORMATIF] ${anomaly.informativeNote} - Employé: ${employee.matricule} (${employee.firstName} ${employee.lastName})`);
        }
        const metrics = await this.calculateMetrics(tenantId, employee.id, new Date(webhookData.timestamp), webhookData.type);
        await this.prisma.attendanceDevice.update({
            where: { id: device.id },
            data: { lastSync: new Date() },
        });
        const getSourceFromMethodWebhook = (method) => {
            switch (method) {
                case client_2.DeviceType.FINGERPRINT:
                case client_2.DeviceType.FACE_RECOGNITION:
                case client_2.DeviceType.RFID_BADGE:
                    return 'TERMINAL_ZKTECO';
                case client_2.DeviceType.MOBILE_GPS:
                    return 'MOBILE_APP';
                case client_2.DeviceType.MANUAL:
                    return 'MANUAL';
                case client_2.DeviceType.QR_CODE:
                case client_2.DeviceType.PIN_CODE:
                    return 'TERMINAL_OTHER';
                default:
                    return 'UNKNOWN';
            }
        };
        const standardizedRawDataWebhook = {
            source: getSourceFromMethodWebhook(webhookData.method),
            originalData: webhookData.rawData || null,
            inOutDetection: {
                method: 'ALTERNATION',
                receivedType: webhookData.type,
                processedAt: new Date().toISOString(),
            },
            receivedAt: new Date().toISOString(),
            deviceId: device.id,
        };
        const attendance = await this.prisma.attendance.create({
            data: {
                tenantId,
                employeeId: employee.id,
                deviceId: device.id,
                siteId: device.siteId,
                timestamp: new Date(webhookData.timestamp),
                type: webhookData.type,
                method: webhookData.method,
                rawData: standardizedRawDataWebhook,
                hasAnomaly: anomaly.hasAnomaly,
                anomalyType: anomaly.type,
                anomalyNote: anomaly.note,
                hoursWorked: metrics.hoursWorked ? new library_1.Decimal(metrics.hoursWorked) : null,
                lateMinutes: metrics.lateMinutes,
                earlyLeaveMinutes: metrics.earlyLeaveMinutes,
                overtimeMinutes: metrics.overtimeMinutes,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        userId: true,
                        department: {
                            select: {
                                id: true,
                                managerId: true,
                            },
                        },
                        site: {
                            select: {
                                id: true,
                                siteManagers: {
                                    select: {
                                        managerId: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (anomaly.hasAnomaly) {
            await this.notifyManagersOfAnomaly(tenantId, attendance);
        }
        if (webhookData.type === client_2.AttendanceType.OUT && metrics.overtimeMinutes && metrics.overtimeMinutes > 0) {
            await this.createAutoOvertime(tenantId, attendance, metrics.overtimeMinutes);
        }
        if (webhookData.type === client_2.AttendanceType.OUT) {
            const timestamp = new Date(webhookData.timestamp);
            const startOfDay = new Date(timestamp);
            startOfDay.setHours(0, 0, 0, 0);
            const inWithMissingOut = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    type: client_2.AttendanceType.IN,
                    timestamp: { gte: startOfDay, lt: timestamp },
                    hasAnomaly: true,
                    anomalyType: 'MISSING_OUT',
                },
                orderBy: { timestamp: 'desc' },
            });
            if (inWithMissingOut) {
                await this.prisma.attendance.update({
                    where: { id: inWithMissingOut.id },
                    data: {
                        hasAnomaly: false,
                        anomalyType: null,
                        anomalyNote: null,
                    },
                });
                console.log(`✅ [Webhook] Anomalie MISSING_OUT effacée sur IN ${inWithMissingOut.id} pour ${employee.matricule}`);
            }
        }
        return attendance;
    }
    async findAll(tenantId, filters, userId, userPermissions) {
        console.log('🔍 [findAll] =====================================');
        console.log('🔍 [findAll] tenantId:', tenantId);
        console.log('🔍 [findAll] filters:', JSON.stringify(filters));
        console.log('🔍 [findAll] userId:', userId);
        console.log('🔍 [findAll] userPermissions:', userPermissions);
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('attendance.view_all');
        const hasViewOwn = userPermissions?.includes('attendance.view_own');
        const hasViewTeam = userPermissions?.includes('attendance.view_team');
        const hasViewDepartment = userPermissions?.includes('attendance.view_department');
        const hasViewSite = userPermissions?.includes('attendance.view_site');
        console.log('🔍 [findAll] Permissions - hasViewAll:', hasViewAll, 'hasViewOwn:', hasViewOwn);
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return [];
                }
                where.employeeId = { in: managedEmployeeIds };
            }
            else if (managerLevel.type === 'SITE') {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return [];
                }
                where.employeeId = { in: managedEmployeeIds };
            }
            else if (managerLevel.type === 'TEAM') {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { teamId: true },
                });
                if (employee?.teamId) {
                    const teamMembers = await this.prisma.employee.findMany({
                        where: { teamId: employee.teamId, tenantId },
                        select: { id: true },
                    });
                    where.employeeId = {
                        in: teamMembers.map(m => m.id),
                    };
                }
                else {
                    return [];
                }
            }
            else if (!hasViewAll && hasViewOwn) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                if (employee) {
                    where.employeeId = employee.id;
                }
                else {
                    return [];
                }
            }
        }
        if (filters?.employeeId)
            where.employeeId = filters.employeeId;
        if (filters?.siteId)
            where.siteId = filters.siteId;
        if (filters?.hasAnomaly !== undefined)
            where.hasAnomaly = filters.hasAnomaly;
        if (filters?.type)
            where.type = filters.type;
        where.OR = [
            { anomalyType: null },
            { anomalyType: { not: 'DEBOUNCE_BLOCKED' } },
        ];
        if (filters?.startDate || filters?.endDate) {
            where.timestamp = {};
            if (filters.startDate) {
                where.timestamp.gte = new Date(filters.startDate + 'T00:00:00.000Z');
            }
            if (filters.endDate) {
                where.timestamp.lte = new Date(filters.endDate + 'T23:59:59.999Z');
            }
        }
        const page = filters?.page || 1;
        const limit = filters?.limit || 500;
        const skip = (page - 1) * limit;
        const shouldPaginate = filters?.page !== undefined || filters?.limit !== undefined;
        const maxLimit = shouldPaginate ? limit : Math.min(limit, 1000);
        console.log('🔍 [findAll] WHERE clause:', JSON.stringify(where, (key, value) => {
            if (value instanceof Date)
                return value.toISOString();
            return value;
        }, 2));
        console.log('🔍 [findAll] Pagination - page:', page, 'limit:', maxLimit, 'skip:', skip);
        const [data, total] = await Promise.all([
            this.prisma.attendance.findMany({
                where,
                skip: shouldPaginate ? skip : undefined,
                take: maxLimit,
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    tenantId: true,
                    employeeId: true,
                    siteId: true,
                    deviceId: true,
                    timestamp: true,
                    type: true,
                    method: true,
                    latitude: true,
                    longitude: true,
                    hasAnomaly: true,
                    anomalyType: true,
                    anomalyNote: true,
                    isCorrected: true,
                    correctedBy: true,
                    correctedAt: true,
                    correctionNote: true,
                    hoursWorked: true,
                    lateMinutes: true,
                    earlyLeaveMinutes: true,
                    overtimeMinutes: true,
                    needsApproval: true,
                    approvalStatus: true,
                    approvedBy: true,
                    approvedAt: true,
                    rawData: true,
                    generatedBy: true,
                    isGenerated: true,
                    employee: {
                        select: {
                            id: true,
                            matricule: true,
                            firstName: true,
                            lastName: true,
                            photo: true,
                            currentShift: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                    startTime: true,
                                    endTime: true,
                                },
                            },
                        },
                    },
                    site: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                    device: {
                        select: {
                            id: true,
                            name: true,
                            deviceId: true,
                            deviceType: true,
                        },
                    },
                },
                orderBy: { timestamp: 'desc' },
            }),
            this.prisma.attendance.count({ where }),
        ]);
        console.log('🔍 [findAll] RESULTS - data.length:', data.length, 'total:', total);
        if (data.length === 0 && total === 0) {
            console.log('🔍 [findAll] ⚠️ AUCUN RÉSULTAT - Vérifiez la clause WHERE');
        }
        const transformedData = data.map(record => ({
            ...record,
            hoursWorked: record.hoursWorked ? Number(record.hoursWorked) : null,
        }));
        if (shouldPaginate) {
            return {
                data: transformedData,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        return transformedData;
    }
    async remove(tenantId, id, userId, userPermissions) {
        const attendance = await this.prisma.attendance.findUnique({
            where: { id },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        departmentId: true,
                        siteId: true,
                        userId: true,
                    },
                },
            },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('Pointage non trouvé');
        }
        if (attendance.tenantId !== tenantId) {
            throw new common_1.ForbiddenException('Accès non autorisé à ce pointage');
        }
        if (attendance.method !== client_2.DeviceType.MANUAL) {
            throw new common_1.BadRequestException('Seuls les pointages manuels peuvent être supprimés. Les pointages provenant de dispositifs biométriques ne peuvent pas être supprimés.');
        }
        if (userPermissions && userId) {
            const hasViewAll = userPermissions.includes('attendance.view_all');
            const hasDelete = userPermissions.includes('attendance.delete') || userPermissions.includes('attendance.edit');
            if (!hasDelete) {
                throw new common_1.ForbiddenException('Vous n\'avez pas la permission de supprimer des pointages');
            }
            if (!hasViewAll) {
                const hasViewOwn = userPermissions.includes('attendance.view_own');
                const hasViewTeam = userPermissions.includes('attendance.view_team');
                const hasViewDepartment = userPermissions.includes('attendance.view_department');
                const hasViewSite = userPermissions.includes('attendance.view_site');
                if (hasViewOwn && attendance.employee.userId === userId) {
                }
                else if (hasViewTeam || hasViewDepartment || hasViewSite) {
                    const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
                    const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                    if (!managedEmployeeIds.includes(attendance.employeeId)) {
                        throw new common_1.ForbiddenException('Vous ne pouvez supprimer que les pointages de vos employés');
                    }
                }
                else {
                    throw new common_1.ForbiddenException('Vous n\'avez pas la permission de supprimer ce pointage');
                }
            }
        }
        if (attendance.type === client_2.AttendanceType.OUT && attendance.overtimeMinutes && attendance.overtimeMinutes > 0) {
            const attendanceDate = new Date(attendance.timestamp.toISOString().split('T')[0]);
            const approvedOvertime = await this.prisma.overtime.findFirst({
                where: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    date: attendanceDate,
                    status: client_1.OvertimeStatus.APPROVED,
                },
            });
            if (approvedOvertime) {
                throw new common_1.BadRequestException(`Impossible de supprimer ce pointage : les heures supplémentaires associées (${approvedOvertime.hours.toFixed(2)}h) ont déjà été approuvées. Veuillez d'abord annuler l'approbation de l'overtime.`);
            }
            const deletedOvertime = await this.prisma.overtime.deleteMany({
                where: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    date: attendanceDate,
                    status: client_1.OvertimeStatus.PENDING,
                },
            });
            if (deletedOvertime.count > 0) {
                console.log(`[AutoOvertime] 🗑️ Overtime PENDING supprimé suite à la suppression du pointage OUT pour ${attendance.employee.firstName} ${attendance.employee.lastName}`);
            }
        }
        try {
            await this.prisma.attendance.delete({
                where: { id },
            });
            return {
                success: true,
                message: 'Pointage supprimé avec succès',
            };
        }
        catch (error) {
            console.error('Erreur lors de la suppression du pointage:', error);
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException('Pointage non trouvé');
            }
            throw new common_1.BadRequestException(`Erreur lors de la suppression du pointage: ${error.message || 'Erreur inconnue'}`);
        }
    }
    async findOne(tenantId, id) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        photo: true,
                        position: true,
                        department: true,
                        team: true,
                    },
                },
                site: true,
                device: true,
            },
        });
        if (!attendance) {
            throw new common_1.NotFoundException(`Attendance record ${id} not found`);
        }
        return attendance;
    }
    async correctAttendance(tenantId, id, correctionDto, userId, userPermissions) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        departmentId: true,
                        siteId: true,
                        teamId: true,
                    },
                },
            },
        });
        if (!attendance) {
            throw new common_1.NotFoundException(`Attendance record ${id} not found`);
        }
        if (userId && userPermissions) {
            const hasViewAll = userPermissions.includes('attendance.view_all');
            if (!hasViewAll) {
                const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
                if (managerLevel.type) {
                    const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                    if (!managedEmployeeIds.includes(attendance.employeeId)) {
                        throw new common_1.ForbiddenException('Vous ne pouvez corriger que les pointages des employés de votre périmètre');
                    }
                }
                else {
                    const hasViewOwn = userPermissions.includes('attendance.view_own');
                    if (hasViewOwn) {
                        const employee = await this.prisma.employee.findFirst({
                            where: { userId, tenantId },
                            select: { id: true },
                        });
                        if (employee?.id !== attendance.employeeId) {
                            throw new common_1.ForbiddenException('Vous ne pouvez corriger que vos propres pointages');
                        }
                    }
                    else {
                        throw new common_1.ForbiddenException('Vous n\'avez pas la permission de corriger ce pointage');
                    }
                }
            }
        }
        const newTimestamp = correctionDto.correctedTimestamp
            ? new Date(correctionDto.correctedTimestamp)
            : attendance.timestamp;
        const timestampChanged = correctionDto.correctedTimestamp &&
            new Date(correctionDto.correctedTimestamp).getTime() !== attendance.timestamp.getTime();
        let finalHasAnomaly = attendance.hasAnomaly;
        let finalAnomalyType = attendance.anomalyType;
        if (timestampChanged) {
            const anomaly = await this.detectAnomalies(tenantId, attendance.employeeId, newTimestamp, attendance.type);
            if (anomaly.isInformativeDoublePunch) {
                console.log(`ℹ️ [INFORMATIF] ${anomaly.informativeNote} - Employé: ${attendance.employeeId}`);
            }
            finalHasAnomaly = anomaly.hasAnomaly;
            finalAnomalyType = anomaly.type;
        }
        const metrics = await this.calculateMetrics(tenantId, attendance.employeeId, newTimestamp, attendance.type);
        const isManagerCorrection = await this.isManagerCorrectingOthersAttendance(userId, attendance.employeeId, tenantId, userPermissions || []);
        const needsApproval = false;
        const correctorId = correctionDto.correctedBy || userId;
        const fullCorrectionNote = correctionDto.reasonCode
            ? `[${correctionDto.reasonCode}] ${correctionDto.correctionNote}`
            : correctionDto.correctionNote;
        const updatedAttendance = await this.prisma.attendance.update({
            where: { id },
            data: {
                isCorrected: true,
                correctedBy: correctorId,
                correctedAt: new Date(),
                correctionNote: fullCorrectionNote,
                timestamp: newTimestamp,
                hasAnomaly: finalHasAnomaly,
                anomalyType: finalAnomalyType,
                hoursWorked: metrics.hoursWorked ? new library_1.Decimal(metrics.hoursWorked) : null,
                lateMinutes: metrics.lateMinutes,
                earlyLeaveMinutes: metrics.earlyLeaveMinutes,
                overtimeMinutes: metrics.overtimeMinutes,
                needsApproval: false,
                approvalStatus: 'APPROVED',
                approvedBy: isManagerCorrection ? correctorId : null,
                approvedAt: isManagerCorrection ? new Date() : null,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        userId: true,
                    },
                },
            },
        });
        if (isManagerCorrection && updatedAttendance.employee.userId) {
            await this.notifyEmployeeOfManagerCorrection(tenantId, updatedAttendance, correctorId, correctionDto.reasonCode, correctionDto.correctionNote);
        }
        if (attendance.type === client_2.AttendanceType.OUT && metrics.overtimeMinutes && metrics.overtimeMinutes > 0) {
            await this.createAutoOvertime(tenantId, updatedAttendance, metrics.overtimeMinutes);
        }
        return updatedAttendance;
    }
    async isManagerCorrectingOthersAttendance(userId, employeeId, tenantId, permissions) {
        if (!userId)
            return false;
        const hasCorrectPermission = permissions.includes('attendance.correct') ||
            permissions.includes('attendance.view_all');
        if (!hasCorrectPermission)
            return false;
        const userEmployee = await this.prisma.employee.findFirst({
            where: { userId, tenantId },
            select: { id: true },
        });
        return userEmployee?.id !== employeeId;
    }
    requiresApproval(attendance, newTimestamp, correctionNote) {
        const timeDiff = Math.abs(newTimestamp.getTime() - attendance.timestamp.getTime()) / (1000 * 60 * 60);
        if (timeDiff > 2) {
            return true;
        }
        if (attendance.anomalyType === 'ABSENCE' ||
            attendance.anomalyType === 'UNPLANNED_PUNCH' ||
            attendance.anomalyType === 'INSUFFICIENT_REST') {
            return true;
        }
        return false;
    }
    async notifyManagersOfAnomaly(tenantId, attendance) {
        try {
            const managerIds = new Set();
            if (attendance.employee?.department?.managerId) {
                managerIds.add(attendance.employee.department.managerId);
            }
            if (attendance.employee?.site?.siteManagers) {
                attendance.employee.site.siteManagers.forEach((sm) => {
                    managerIds.add(sm.managerId);
                });
            }
            for (const managerId of managerIds) {
                const manager = await this.prisma.employee.findUnique({
                    where: { id: managerId },
                    select: { userId: true, firstName: true, lastName: true },
                });
                if (manager?.userId) {
                    await this.prisma.notification.create({
                        data: {
                            tenantId,
                            employeeId: managerId,
                            type: client_2.NotificationType.ATTENDANCE_ANOMALY,
                            title: 'Nouvelle anomalie de pointage détectée',
                            message: `Anomalie ${attendance.anomalyType} détectée pour ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.matricule})`,
                            metadata: {
                                attendanceId: attendance.id,
                                anomalyType: attendance.anomalyType,
                                employeeId: attendance.employeeId,
                            },
                        },
                    });
                }
            }
        }
        catch (error) {
            console.error('Erreur lors de la notification des managers:', error);
        }
    }
    async notifyEmployeeOfCorrection(tenantId, attendance) {
        try {
            if (!attendance.employee?.userId)
                return;
            await this.prisma.notification.create({
                data: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    type: client_2.NotificationType.ATTENDANCE_CORRECTED,
                    title: 'Votre pointage a été corrigé',
                    message: `Votre pointage du ${new Date(attendance.timestamp).toLocaleDateString('fr-FR')} a été corrigé par un manager.`,
                    metadata: {
                        attendanceId: attendance.id,
                        correctedAt: attendance.correctedAt,
                    },
                },
            });
        }
        catch (error) {
            console.error('Erreur lors de la notification de l\'employé:', error);
        }
    }
    async notifyEmployeeOfManagerCorrection(tenantId, attendance, correctedByUserId, reasonCode, correctionNote) {
        try {
            if (!attendance.employee?.userId)
                return;
            const corrector = await this.prisma.user.findUnique({
                where: { id: correctedByUserId },
                select: { firstName: true, lastName: true },
            });
            const correctorName = corrector
                ? `${corrector.firstName} ${corrector.lastName}`
                : 'Un manager';
            const dateStr = new Date(attendance.timestamp).toLocaleDateString('fr-FR');
            const timeStr = new Date(attendance.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            const reasonLabels = {
                FORGOT_BADGE: 'Oubli de badge',
                DEVICE_FAILURE: 'Panne terminal',
                EXTERNAL_MEETING: 'Réunion externe',
                MANAGER_AUTH: 'Autorisation manager',
                SYSTEM_ERROR: 'Erreur système',
                TELEWORK: 'Télétravail',
                MISSION: 'Mission extérieure',
                MEDICAL: 'Raison médicale',
                OTHER: 'Autre',
            };
            const reasonLabel = reasonCode ? reasonLabels[reasonCode] || reasonCode : null;
            let message = `${correctorName} a corrigé votre pointage du ${dateStr} à ${timeStr}.`;
            if (reasonLabel) {
                message += ` Motif: ${reasonLabel}.`;
            }
            if (correctionNote) {
                message += ` Note: ${correctionNote}`;
            }
            await this.prisma.notification.create({
                data: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    type: client_2.NotificationType.ATTENDANCE_CORRECTED,
                    title: 'Correction de pointage par votre manager',
                    message,
                    metadata: {
                        attendanceId: attendance.id,
                        correctedAt: attendance.correctedAt,
                        correctedBy: correctedByUserId,
                        correctorName,
                        reasonCode,
                        correctionNote,
                    },
                },
            });
            console.log(`📧 Notification envoyée à ${attendance.employee.firstName} ${attendance.employee.lastName} pour correction par ${correctorName}`);
        }
        catch (error) {
            console.error('Erreur lors de la notification de correction manager:', error);
        }
    }
    async notifyManagersOfApprovalRequired(tenantId, attendance) {
        try {
            const managerIds = new Set();
            if (attendance.employee?.department?.managerId) {
                managerIds.add(attendance.employee.department.managerId);
            }
            if (attendance.employee?.site?.siteManagers) {
                attendance.employee.site.siteManagers.forEach((sm) => {
                    managerIds.add(sm.managerId);
                });
            }
            for (const managerId of managerIds) {
                const manager = await this.prisma.employee.findUnique({
                    where: { id: managerId },
                    select: { userId: true },
                });
                if (manager?.userId) {
                    await this.prisma.notification.create({
                        data: {
                            tenantId,
                            employeeId: managerId,
                            type: client_2.NotificationType.ATTENDANCE_APPROVAL_REQUIRED,
                            title: 'Approbation de correction requise',
                            message: `Une correction de pointage pour ${attendance.employee.firstName} ${attendance.employee.lastName} nécessite votre approbation.`,
                            metadata: {
                                attendanceId: attendance.id,
                                employeeId: attendance.employeeId,
                            },
                        },
                    });
                }
            }
        }
        catch (error) {
            console.error('Erreur lors de la notification des managers pour approbation:', error);
        }
    }
    async getAnomalies(tenantId, date, userId, userPermissions) {
        const where = {
            tenantId,
            hasAnomaly: true,
            isCorrected: false,
        };
        const hasViewAll = userPermissions?.includes('attendance.view_all');
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type !== null) {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return [];
                }
                where.employeeId = { in: managedEmployeeIds };
            }
            else if (userPermissions?.includes('attendance.view_own')) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                if (employee) {
                    where.employeeId = employee.id;
                }
                else {
                    return [];
                }
            }
        }
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where.timestamp = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }
        const anomalies = await this.prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        photo: true,
                        site: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        department: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                site: true,
            },
        });
        const anomaliesWithScores = await Promise.all(anomalies.map(async (anomaly) => ({
            ...anomaly,
            score: await this.calculateAnomalyScore(tenantId, anomaly.employeeId, anomaly.anomalyType, anomaly.timestamp, !!anomaly.correctionNote),
        })));
        return anomaliesWithScores.sort((a, b) => {
            if (a.score !== b.score) {
                return b.score - a.score;
            }
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    }
    async getAnomaliesPaginated(tenantId, filters, userId, userPermissions) {
        const page = filters.page || 1;
        const limit = Math.min(filters.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {
            tenantId,
            OR: [
                { hasAnomaly: true },
                { isCorrected: true },
            ],
        };
        if (filters.isCorrected !== undefined) {
            if (filters.isCorrected) {
                delete where.OR;
                where.isCorrected = true;
            }
            else {
                delete where.OR;
                where.hasAnomaly = true;
                where.isCorrected = false;
            }
        }
        if (filters.startDate || filters.endDate) {
            where.timestamp = {};
            if (filters.startDate) {
                where.timestamp.gte = new Date(filters.startDate + 'T00:00:00.000Z');
            }
            if (filters.endDate) {
                where.timestamp.lte = new Date(filters.endDate + 'T23:59:59.999Z');
            }
        }
        if (filters.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters.anomalyType) {
            where.anomalyType = filters.anomalyType;
        }
        if (filters.departmentId) {
            where.employee = {
                departmentId: filters.departmentId,
            };
        }
        if (filters.siteId) {
            where.siteId = filters.siteId;
        }
        const hasViewAll = userPermissions?.includes('attendance.view_all');
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type !== null) {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
                }
                where.employeeId = { in: managedEmployeeIds };
            }
            else if (userPermissions?.includes('attendance.view_own')) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                if (employee) {
                    where.employeeId = employee.id;
                }
                else {
                    return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
                }
            }
        }
        const [total, anomalies] = await Promise.all([
            this.prisma.attendance.count({ where }),
            this.prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            matricule: true,
                            firstName: true,
                            lastName: true,
                            photo: true,
                            site: { select: { id: true, name: true } },
                            department: { select: { id: true, name: true } },
                        },
                    },
                    site: true,
                },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit,
            }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            data: anomalies,
            meta: {
                total,
                page,
                limit,
                totalPages,
            },
        };
    }
    async getDailyReport(tenantId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const [totalRecords, uniqueEmployees, lateEntries, anomalies] = await Promise.all([
            this.prisma.attendance.count({
                where: {
                    tenantId,
                    timestamp: { gte: startOfDay, lte: endOfDay },
                },
            }),
            this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    timestamp: { gte: startOfDay, lte: endOfDay },
                    type: client_2.AttendanceType.IN,
                },
                distinct: ['employeeId'],
                select: { employeeId: true },
            }),
            this.prisma.attendance.count({
                where: {
                    tenantId,
                    timestamp: { gte: startOfDay, lte: endOfDay },
                    hasAnomaly: true,
                    anomalyType: { contains: 'LATE' },
                },
            }),
            this.prisma.attendance.count({
                where: {
                    tenantId,
                    timestamp: { gte: startOfDay, lte: endOfDay },
                    hasAnomaly: true,
                },
            }),
        ]);
        return {
            date,
            totalRecords,
            uniqueEmployees: uniqueEmployees.length,
            lateEntries,
            anomalies,
        };
    }
    async validateBreakPunch(tenantId, type) {
        if (type !== client_2.AttendanceType.BREAK_START && type !== client_2.AttendanceType.BREAK_END) {
            return;
        }
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { requireBreakPunch: true },
        });
        if (!settings?.requireBreakPunch) {
            throw new common_1.BadRequestException('Le pointage des repos (pauses) est désactivé pour ce tenant. Contactez votre administrateur pour activer cette fonctionnalité.');
        }
    }
    async calculateMetrics(tenantId, employeeId, timestamp, type) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { isEligibleForOvertime: true },
        });
        const isEligibleForOvertime = employee?.isEligibleForOvertime ?? true;
        const startOfDay = new Date(timestamp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(timestamp);
        endOfDay.setHours(23, 59, 59, 999);
        const todayRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                timestamp: { gte: startOfDay, lte: endOfDay },
            },
            orderBy: { timestamp: 'asc' },
        });
        const metrics = {};
        const leave = await this.prisma.leave.findFirst({
            where: {
                tenantId,
                employeeId,
                startDate: { lte: timestamp },
                endDate: { gte: timestamp },
                status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
            },
        });
        const isOnApprovedLeave = !!leave;
        if (type === client_2.AttendanceType.OUT) {
            const sortedRecords = [...todayRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            let inRecord;
            let outCount = 0;
            for (let i = sortedRecords.length - 1; i >= 0; i--) {
                const record = sortedRecords[i];
                if (record.timestamp.getTime() > timestamp.getTime())
                    continue;
                if (record.type === client_2.AttendanceType.BREAK_START || record.type === client_2.AttendanceType.BREAK_END)
                    continue;
                if (record.type === client_2.AttendanceType.OUT) {
                    outCount++;
                }
                if (record.type === client_2.AttendanceType.IN) {
                    if (outCount === 0) {
                        inRecord = record;
                        break;
                    }
                    else {
                        outCount--;
                    }
                }
            }
            if (inRecord) {
                let hoursWorked = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60);
                const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);
                if (schedule?.shift?.breakDuration) {
                    const breakHours = schedule.shift.breakDuration / 60;
                    hoursWorked = Math.max(0, hoursWorked - breakHours);
                }
                metrics.hoursWorked = Math.max(0, hoursWorked);
            }
        }
        if (type === client_2.AttendanceType.IN && !isOnApprovedLeave) {
            const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
            if (schedule?.shift) {
                const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                const tenant = await this.prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { timezone: true },
                });
                const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');
                const expectedStart = new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), expectedStartTime.hours - timezoneOffset, expectedStartTime.minutes, 0, 0));
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: { lateToleranceEntry: true },
                });
                const toleranceMinutes = settings?.lateToleranceEntry || 10;
                const lateMinutes = Math.max(0, (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60) - toleranceMinutes);
                if (lateMinutes > 0) {
                    metrics.lateMinutes = Math.round(lateMinutes);
                }
            }
        }
        if (type === client_2.AttendanceType.OUT && !isOnApprovedLeave) {
            const sortedRecordsForEarly = [...todayRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            let inRecordForEarly;
            let outCountForEarly = 0;
            for (let i = sortedRecordsForEarly.length - 1; i >= 0; i--) {
                const record = sortedRecordsForEarly[i];
                if (record.timestamp.getTime() > timestamp.getTime())
                    continue;
                if (record.type === client_2.AttendanceType.BREAK_START || record.type === client_2.AttendanceType.BREAK_END)
                    continue;
                if (record.type === client_2.AttendanceType.OUT) {
                    outCountForEarly++;
                }
                if (record.type === client_2.AttendanceType.IN) {
                    if (outCountForEarly === 0) {
                        inRecordForEarly = record;
                        break;
                    }
                    else {
                        outCountForEarly--;
                    }
                }
            }
            const schedule = inRecordForEarly
                ? await this.getScheduleWithFallback(tenantId, employeeId, inRecordForEarly.timestamp)
                : await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
            if (schedule?.shift) {
                const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                const tenant = await this.prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { timezone: true },
                });
                const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');
                const expectedEnd = new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), expectedEndTime.hours - timezoneOffset, expectedEndTime.minutes, 0, 0));
                const isNight = this.isNightShift(schedule.shift, expectedEndTime);
                if (isNight && expectedEnd.getTime() > timestamp.getTime()) {
                    const hoursDiff = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
                    if (hoursDiff > 12) {
                        expectedEnd.setUTCDate(expectedEnd.getUTCDate() - 1);
                    }
                }
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: { earlyToleranceExit: true },
                });
                const toleranceMinutes = settings?.earlyToleranceExit || 5;
                const earlyLeaveMinutes = Math.max(0, (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60) - toleranceMinutes);
                console.log(`[calculateMetrics] Départ anticipé:
          - timestamp: ${timestamp.toISOString()}
          - expectedEnd: ${expectedEnd.toISOString()}
          - isNight: ${isNight}
          - diff minutes: ${(expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60)}
          - tolerance: ${toleranceMinutes}
          - earlyLeaveMinutes: ${earlyLeaveMinutes}
        `);
                if (earlyLeaveMinutes > 0) {
                    metrics.earlyLeaveMinutes = Math.round(earlyLeaveMinutes);
                }
            }
        }
        if (type === client_2.AttendanceType.OUT) {
            console.log(`\n🔍 ===== DEBUG CALCUL HEURES POUR OUT =====`);
            console.log(`📍 OUT timestamp: ${timestamp.toISOString()}`);
            console.log(`📋 todayRecords (${todayRecords.length} records):`);
            todayRecords.forEach((r, i) => {
                console.log(`  ${i}: ${r.type} à ${r.timestamp.toISOString()}`);
            });
            const sortedRecords = [...todayRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            console.log(`🔍 Recherche du IN correspondant:`);
            let inRecord;
            let outCount = 0;
            for (let i = sortedRecords.length - 1; i >= 0; i--) {
                const record = sortedRecords[i];
                console.log(`  i=${i}: ${record.type} à ${record.timestamp.toISOString()}, outCount=${outCount}`);
                if (record.timestamp.getTime() > timestamp.getTime()) {
                    console.log(`    ⏩ Skip (après OUT)`);
                    continue;
                }
                if (record.type === client_2.AttendanceType.BREAK_START || record.type === client_2.AttendanceType.BREAK_END) {
                    console.log(`    ⏩ Skip (BREAK)`);
                    continue;
                }
                if (record.type === client_2.AttendanceType.OUT) {
                    outCount++;
                    console.log(`    📤 OUT → outCount = ${outCount}`);
                }
                if (record.type === client_2.AttendanceType.IN) {
                    if (outCount === 0) {
                        inRecord = record;
                        console.log(`    ✅ IN TROUVÉ!`);
                        break;
                    }
                    else {
                        outCount--;
                        console.log(`    ⏩ IN autre session → outCount = ${outCount}`);
                    }
                }
            }
            if (inRecord) {
                console.log(`\n✅ IN correspondant: ${inRecord.timestamp.toISOString()}`);
                const durationMin = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);
                console.log(`⏱️  Durée brute: ${durationMin.toFixed(2)} min = ${(durationMin / 60).toFixed(2)} h`);
            }
            else {
                console.log(`\n❌ AUCUN IN trouvé!`);
            }
            if (inRecord) {
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: {
                        requireBreakPunch: true,
                        breakDuration: true,
                        overtimeRounding: true,
                        holidayOvertimeEnabled: true,
                        holidayOvertimeRate: true,
                        holidayOvertimeAsNormalHours: true,
                    },
                });
                const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);
                if (schedule?.shift) {
                    const workedMinutesRaw = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);
                    let actualBreakMinutes = 0;
                    if (settings?.requireBreakPunch === true) {
                        const breakEvents = todayRecords.filter(r => r.type === client_2.AttendanceType.BREAK_START || r.type === client_2.AttendanceType.BREAK_END);
                        breakEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                        for (let i = 0; i < breakEvents.length; i += 2) {
                            if (breakEvents[i].type === client_2.AttendanceType.BREAK_START &&
                                breakEvents[i + 1]?.type === client_2.AttendanceType.BREAK_END) {
                                const breakDuration = (breakEvents[i + 1].timestamp.getTime() - breakEvents[i].timestamp.getTime()) /
                                    (1000 * 60);
                                actualBreakMinutes += breakDuration;
                            }
                        }
                    }
                    else {
                        actualBreakMinutes = settings?.breakDuration || 60;
                    }
                    const workedMinutes = workedMinutesRaw - actualBreakMinutes;
                    const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                    const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                    const startMinutes = expectedStartTime.hours * 60 + expectedStartTime.minutes;
                    const endMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;
                    let plannedMinutes = endMinutes - startMinutes;
                    if (plannedMinutes < 0) {
                        plannedMinutes += 24 * 60;
                    }
                    const plannedBreakMinutes = settings?.breakDuration || schedule.shift.breakDuration || 60;
                    plannedMinutes -= plannedBreakMinutes;
                    if (isEligibleForOvertime) {
                        const dateOnly = new Date(Date.UTC(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0, 0));
                        const dateOnlyEnd = new Date(Date.UTC(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 23, 59, 59, 999));
                        const holiday = await this.prisma.holiday.findFirst({
                            where: {
                                tenantId,
                                date: {
                                    gte: dateOnly,
                                    lte: dateOnlyEnd,
                                },
                            },
                        });
                        const midnight = new Date(Date.UTC(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0, 0));
                        const inDate = new Date(Date.UTC(inRecord.timestamp.getFullYear(), inRecord.timestamp.getMonth(), inRecord.timestamp.getDate(), 0, 0, 0, 0));
                        let normalHoursMinutes = workedMinutes;
                        let holidayHoursMinutes = 0;
                        if (holiday && inDate.getTime() < dateOnly.getTime()) {
                            const midnightTime = midnight.getTime();
                            const inTime = inRecord.timestamp.getTime();
                            const outTime = timestamp.getTime();
                            const beforeMidnightMinutes = Math.max(0, (midnightTime - inTime) / (1000 * 60));
                            const afterMidnightMinutes = Math.max(0, (outTime - midnightTime) / (1000 * 60));
                            const totalMinutes = beforeMidnightMinutes + afterMidnightMinutes;
                            const breakBeforeMidnight = actualBreakMinutes * (beforeMidnightMinutes / totalMinutes);
                            const breakAfterMidnight = actualBreakMinutes * (afterMidnightMinutes / totalMinutes);
                            normalHoursMinutes = beforeMidnightMinutes - breakBeforeMidnight;
                            holidayHoursMinutes = afterMidnightMinutes - breakAfterMidnight;
                        }
                        else if (holiday && inDate.getTime() === dateOnly.getTime()) {
                            holidayHoursMinutes = workedMinutes;
                            normalHoursMinutes = 0;
                        }
                        let overtimeMinutes = normalHoursMinutes - plannedMinutes;
                        if (overtimeMinutes < 0) {
                            overtimeMinutes = 0;
                        }
                        let holidayOvertimeMinutes = 0;
                        if (holiday && settings?.holidayOvertimeEnabled !== false) {
                            if (settings?.holidayOvertimeAsNormalHours === true) {
                                holidayOvertimeMinutes = holidayHoursMinutes;
                            }
                            else {
                                const holidayRate = settings?.holidayOvertimeRate
                                    ? Number(settings.holidayOvertimeRate)
                                    : 2.0;
                                holidayOvertimeMinutes = holidayHoursMinutes * holidayRate;
                            }
                        }
                        else if (holiday && settings?.holidayOvertimeEnabled === false) {
                            holidayOvertimeMinutes = holidayHoursMinutes;
                        }
                        const totalOvertimeMinutes = overtimeMinutes + holidayOvertimeMinutes;
                        console.log(`[calculateMetrics] Heures supplémentaires:
              - workedMinutes: ${workedMinutes}
              - plannedMinutes: ${plannedMinutes}
              - normalHoursMinutes: ${normalHoursMinutes}
              - overtimeMinutes (avant arrondi): ${overtimeMinutes}
              - holidayOvertimeMinutes: ${holidayOvertimeMinutes}
              - totalOvertimeMinutes: ${totalOvertimeMinutes}
            `);
                        if (totalOvertimeMinutes > 0) {
                            const roundingMinutes = settings?.overtimeRounding || 15;
                            const overtimeHours = totalOvertimeMinutes / 60;
                            const roundedHours = this.roundOvertimeHours(overtimeHours, roundingMinutes);
                            metrics.overtimeMinutes = Math.round(roundedHours * 60);
                            console.log(`[calculateMetrics] Après arrondi:
                - roundingMinutes: ${roundingMinutes}
                - overtimeHours: ${overtimeHours}
                - roundedHours: ${roundedHours}
                - metrics.overtimeMinutes: ${metrics.overtimeMinutes}
              `);
                        }
                    }
                    else {
                        metrics.overtimeMinutes = 0;
                    }
                }
            }
        }
        return metrics;
    }
    async getScheduleWithFallback(tenantId, employeeId, date) {
        const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
        console.log(`[getScheduleWithFallback] Recherche de planning pour la date exacte: ${dateOnly.toISOString()}`);
        const schedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                employeeId,
                date: dateOnly,
                status: 'PUBLISHED',
            },
            include: {
                shift: {
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                        breakDuration: true,
                        breakStartTime: true,
                    },
                },
            },
            orderBy: {
                shift: {
                    startTime: 'asc',
                },
            },
        });
        if (schedules.length > 0) {
            if (schedules.length === 1) {
                console.log(`[getScheduleWithFallback] ✅ Un seul planning physique trouvé: ${schedules[0].shift.startTime} - ${schedules[0].shift.endTime}`);
                return schedules[0];
            }
            console.log(`[getScheduleWithFallback] ⚠️ ${schedules.length} plannings trouvés pour cette date - sélection du plus proche de l'heure du pointage`);
            const attendanceHour = date.getUTCHours();
            const attendanceMinutes = date.getUTCMinutes();
            const attendanceTimeInMinutes = attendanceHour * 60 + attendanceMinutes;
            let closestSchedule = schedules[0];
            let smallestDifference = Infinity;
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { timezone: true },
            });
            const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');
            for (const schedule of schedules) {
                const startTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                const shiftStartInMinutesLocal = startTime.hours * 60 + startTime.minutes;
                const shiftStartInMinutesUTC = shiftStartInMinutesLocal - (timezoneOffset * 60);
                const difference = Math.abs(attendanceTimeInMinutes - shiftStartInMinutesUTC);
                console.log(`  - Shift ${schedule.shift.startTime}: différence = ${difference} minutes`);
                if (difference < smallestDifference) {
                    smallestDifference = difference;
                    closestSchedule = schedule;
                }
            }
            console.log(`[getScheduleWithFallback] ✅ Planning le plus proche sélectionné: ${closestSchedule.shift.startTime} - ${closestSchedule.shift.endTime} (différence: ${smallestDifference} min)`);
            return closestSchedule;
        }
        console.log(`[getScheduleWithFallback] ❌ Aucun planning physique trouvé pour cette date`);
        const currentHour = date.getHours();
        if (currentHour < 14) {
            console.log(`[getScheduleWithFallback] Heure < 14h (${currentHour}h) → Recherche d'un shift de nuit de la veille`);
            const previousDayDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() - 1, 0, 0, 0, 0));
            const previousDaySchedule = await this.prisma.schedule.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    date: previousDayDate,
                    status: 'PUBLISHED',
                },
                include: {
                    shift: {
                        select: {
                            id: true,
                            startTime: true,
                            endTime: true,
                            breakDuration: true,
                            breakStartTime: true,
                        },
                    },
                },
            });
            if (previousDaySchedule?.shift) {
                const expectedEndTime = this.parseTimeString(previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime);
                const isNight = this.isNightShift(previousDaySchedule.shift, expectedEndTime);
                if (isNight) {
                    console.log(`[getScheduleWithFallback] ✅ Shift de nuit trouvé de la veille: ${previousDaySchedule.shift.startTime} - ${previousDaySchedule.shift.endTime}`);
                    return previousDaySchedule;
                }
                else {
                    console.log(`[getScheduleWithFallback] Planning de la veille trouvé mais ce n'est pas un shift de nuit`);
                }
            }
            else {
                console.log(`[getScheduleWithFallback] Aucun planning trouvé pour la veille`);
            }
        }
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: {
                currentShiftId: true,
                currentShift: {
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                        breakDuration: true,
                        breakStartTime: true,
                    },
                },
            },
        });
        if (employee?.currentShift) {
            console.log(`[getScheduleWithFallback] ✅ Shift par défaut trouvé (virtuel): ${employee.currentShift.startTime} - ${employee.currentShift.endTime}`);
            return {
                id: 'virtual',
                date: date,
                shiftId: employee.currentShift.id,
                shift: employee.currentShift,
                customStartTime: null,
                customEndTime: null,
                status: 'PUBLISHED',
                tenantId,
                employeeId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }
        console.log(`[getScheduleWithFallback] ❌ Aucun planning ni shift par défaut`);
        return null;
    }
    async validateScheduleOrShift(tenantId, employeeId, timestamp, attendanceType) {
        console.log(`[validateScheduleOrShift] Validation pour ${timestamp.toISOString()}, type: ${attendanceType}`);
        const dateOnly = new Date(Date.UTC(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0, 0));
        console.log(`[validateScheduleOrShift] Recherche de planning pour la date exacte: ${dateOnly.toISOString()}`);
        const schedule = await this.prisma.schedule.findFirst({
            where: {
                tenantId,
                employeeId,
                date: dateOnly,
                status: 'PUBLISHED',
            },
        });
        console.log(`[validateScheduleOrShift] Planning trouvé pour ce jour: ${schedule ? 'OUI' : 'NON'}`);
        if (schedule) {
            console.log(`[validateScheduleOrShift] ✅ Planning existe → validation OK`);
            return;
        }
        if (attendanceType === client_2.AttendanceType.OUT) {
            console.log(`[validateScheduleOrShift] Vérification shift de nuit pour OUT...`);
            const previousDayDate = new Date(Date.UTC(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate() - 1, 0, 0, 0, 0));
            console.log(`[validateScheduleOrShift] Recherche planning de la veille: ${previousDayDate.toISOString()}`);
            const previousDaySchedule = await this.prisma.schedule.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    date: previousDayDate,
                    status: 'PUBLISHED',
                },
                include: {
                    shift: true,
                },
            });
            if (previousDaySchedule) {
                console.log(`[validateScheduleOrShift] Planning de la veille trouvé: ${previousDaySchedule.shift.startTime} - ${previousDaySchedule.shift.endTime}`);
                const expectedEndTime = this.parseTimeString(previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime);
                const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);
                console.log(`[validateScheduleOrShift] Est un shift de nuit: ${isNightShift}`);
                if (isNightShift) {
                    console.log(`[validateScheduleOrShift] ✅ Shift de nuit détecté pour la veille → OUT du lendemain autorisé`);
                    console.log(`[validateScheduleOrShift] Note: Pas besoin de vérifier l'IN - le système de détection d'anomalies gérera MISSING_IN si nécessaire`);
                    return;
                }
            }
            else {
                console.log(`[validateScheduleOrShift] Aucun planning trouvé pour la veille`);
            }
        }
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: {
                currentShiftId: true,
                firstName: true,
                lastName: true,
                matricule: true,
            },
        });
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                workingDays: true,
                requireScheduleForAttendance: true,
            },
        });
        const timestampDate = new Date(timestamp);
        const holidayDateOnly = new Date(Date.UTC(timestampDate.getFullYear(), timestampDate.getMonth(), timestampDate.getDate(), 0, 0, 0, 0));
        const holiday = await this.prisma.holiday.findFirst({
            where: {
                tenantId,
                date: holidayDateOnly,
            },
        });
        if (holiday && settings?.requireScheduleForAttendance !== false) {
            const leave = await this.prisma.leave.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    startDate: { lte: timestamp },
                    endDate: { gte: timestamp },
                    status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
                },
            });
            const recoveryDay = await this.prisma.recoveryDay.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    startDate: { lte: timestamp },
                    endDate: { gte: timestamp },
                    status: { in: ['APPROVED', 'PENDING'] },
                },
            });
            if (!leave && !recoveryDay) {
                const employeeName = employee
                    ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
                    : `ID: ${employeeId}`;
                const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
                const dayName = dayNames[timestamp.getDay()];
                throw new common_1.BadRequestException(`Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (${dayName} - jour férié: ${holiday.name}) : ` +
                    `aucun planning publié pour ce jour férié. ` +
                    `Veuillez créer un planning pour autoriser le travail le jour férié "${holiday.name}".`);
            }
        }
        const dayOfWeek = timestamp.getDay();
        const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6];
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        const isWorkingDay = workingDays.includes(normalizedDayOfWeek);
        if (!isWorkingDay) {
            const leave = await this.prisma.leave.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    startDate: { lte: timestamp },
                    endDate: { gte: timestamp },
                    status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
                },
            });
            const recoveryDay = await this.prisma.recoveryDay.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    startDate: { lte: timestamp },
                    endDate: { gte: timestamp },
                    status: { in: ['APPROVED', 'PENDING'] },
                },
            });
            if (!leave && !recoveryDay) {
                const employeeName = employee
                    ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
                    : `ID: ${employeeId}`;
                const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
                const dayName = dayNames[dayOfWeek];
                throw new common_1.BadRequestException(`Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (${dayName} - weekend) : ` +
                    `jour non ouvrable sans planning publié. ` +
                    `Veuillez créer un planning pour autoriser le travail en weekend.`);
            }
        }
        if (employee?.currentShiftId) {
            return;
        }
        if (settings?.requireScheduleForAttendance === false) {
            return;
        }
        if (isWorkingDay) {
            console.log(`[validateScheduleOrShift] Jour ouvrable sans planning → Autoriser (anomalie sera détectée)`);
            return;
        }
        const recoveryDay = await this.prisma.recoveryDay.findFirst({
            where: {
                tenantId,
                employeeId,
                startDate: { lte: timestamp },
                endDate: { gte: timestamp },
                status: { in: ['APPROVED', 'PENDING'] },
            },
        });
        if (recoveryDay) {
            return;
        }
        const employeeName = employee
            ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
            : `ID: ${employeeId}`;
        throw new common_1.BadRequestException(`Impossible de créer un pointage pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} : ` +
            `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé pour cette date. ` +
            `Veuillez créer un planning ou assigner un shift par défaut à l'employé.`);
    }
    parseTimeString(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return { hours: hours || 0, minutes: minutes || 0 };
    }
    async detectDoubleInImproved(tenantId, employeeId, timestamp, todayRecords) {
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                doubleInDetectionWindow: true,
                orphanInThreshold: true,
                doublePunchToleranceMinutes: true,
                enableDoubleInPatternDetection: true,
                doubleInPatternAlertThreshold: true,
            },
        });
        const detectionWindowHours = settings?.doubleInDetectionWindow || 24;
        const orphanThresholdHours = settings?.orphanInThreshold || 12;
        const toleranceMinutes = settings?.doublePunchToleranceMinutes || 2;
        const enablePatternDetection = settings?.enableDoubleInPatternDetection !== false;
        const patternAlertThreshold = settings?.doubleInPatternAlertThreshold || 3;
        const todayInRecords = todayRecords.filter(r => r.type === client_2.AttendanceType.IN);
        if (todayInRecords.length > 0) {
            const lastIn = todayInRecords[todayInRecords.length - 1];
            const timeDiff = (timestamp.getTime() - lastIn.timestamp.getTime()) / (1000 * 60);
            if (timeDiff <= toleranceMinutes) {
                return {
                    hasAnomaly: false,
                    type: null,
                    note: null,
                    isInformativeDoublePunch: true,
                    informativeNote: `Double badgeage rapide détecté (${Math.round(timeDiff)} min d'intervalle). Pointage accepté automatiquement.`,
                };
            }
        }
        const detectionWindowStart = new Date(timestamp.getTime() - detectionWindowHours * 60 * 60 * 1000);
        const recentInRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.IN,
                timestamp: { gte: detectionWindowStart, lt: timestamp },
            },
            orderBy: { timestamp: 'desc' },
        });
        if (recentInRecords.length > 0) {
            const lastInRecord = recentInRecords[0];
            const hoursSinceLastIn = (timestamp.getTime() - lastInRecord.timestamp.getTime()) / (1000 * 60 * 60);
            const correspondingOut = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    type: client_2.AttendanceType.OUT,
                    timestamp: { gte: lastInRecord.timestamp, lt: timestamp },
                },
                orderBy: { timestamp: 'asc' },
            });
            if (!correspondingOut && hoursSinceLastIn >= orphanThresholdHours) {
                const suggestedOutTime = new Date(lastInRecord.timestamp);
                const schedule = await this.getScheduleWithFallback(tenantId, employeeId, lastInRecord.timestamp);
                if (schedule?.shift) {
                    const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                    suggestedOutTime.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
                }
                else {
                    suggestedOutTime.setHours(17, 0, 0, 0);
                }
                return {
                    hasAnomaly: true,
                    type: 'DOUBLE_IN',
                    note: `Pointage IN précédent sans OUT depuis ${Math.round(hoursSinceLastIn)}h. Suggestion: ajouter un OUT manquant à ${suggestedOutTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
                    suggestedCorrection: {
                        type: 'ADD_MISSING_OUT',
                        previousInId: lastInRecord.id,
                        suggestedOutTime: suggestedOutTime.toISOString(),
                        confidence: 85,
                        reason: 'ORPHAN_IN_DETECTED',
                    },
                };
            }
        }
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
        if (todayInRecords.length > 0) {
            const lastIn = todayInRecords[todayInRecords.length - 1];
            const hasOutBetween = todayRecords.some(r => r.type === client_2.AttendanceType.OUT &&
                r.timestamp > lastIn.timestamp &&
                r.timestamp < timestamp);
            if (!hasOutBetween) {
                const correctionSuggestion = await this.generateDoubleInCorrectionSuggestion(tenantId, employeeId, lastIn, timestamp, schedule);
                let patternNote = '';
                if (enablePatternDetection) {
                    const patternInfo = await this.analyzeDoubleInPattern(tenantId, employeeId);
                    if (patternInfo.count >= patternAlertThreshold) {
                        patternNote = ` ⚠️ Pattern suspect: ${patternInfo.count} DOUBLE_IN sur 30 jours.`;
                    }
                }
                return {
                    hasAnomaly: true,
                    type: 'DOUBLE_IN',
                    note: `Double pointage d'entrée détecté.${patternNote}`,
                    suggestedCorrection: correctionSuggestion,
                };
            }
        }
        return { hasAnomaly: false };
    }
    async generateDoubleInCorrectionSuggestion(tenantId, employeeId, firstIn, secondInTimestamp, schedule) {
        const suggestions = [];
        const firstInSchedule = await this.getScheduleWithFallback(tenantId, employeeId, firstIn.timestamp);
        let firstInScore = 50;
        if (firstInSchedule?.shift) {
            const expectedStartTime = this.parseTimeString(firstInSchedule.customStartTime || firstInSchedule.shift.startTime);
            const firstInTime = new Date(firstIn.timestamp);
            const expectedStart = new Date(firstIn.timestamp);
            expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
            const diffMinutes = Math.abs((firstInTime.getTime() - expectedStart.getTime()) / (1000 * 60));
            if (diffMinutes <= 30) {
                firstInScore = 90;
            }
            else if (diffMinutes <= 60) {
                firstInScore = 70;
            }
        }
        suggestions.push({
            action: 'DELETE_SECOND_IN',
            description: 'Supprimer le deuxième pointage IN',
            confidence: 100 - firstInScore,
            reason: firstInScore < 50 ? 'Le premier IN semble plus cohérent' : 'Le deuxième IN semble être une erreur',
        });
        let secondInScore = 50;
        if (schedule?.shift) {
            const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
            const expectedStart = new Date(secondInTimestamp);
            expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
            const diffMinutes = Math.abs((secondInTimestamp.getTime() - expectedStart.getTime()) / (1000 * 60));
            if (diffMinutes <= 30) {
                secondInScore = 90;
            }
            else if (diffMinutes <= 60) {
                secondInScore = 70;
            }
        }
        suggestions.push({
            action: 'DELETE_FIRST_IN',
            description: 'Supprimer le premier pointage IN',
            confidence: 100 - secondInScore,
            reason: secondInScore < 50 ? 'Le deuxième IN semble plus cohérent' : 'Le premier IN semble être une erreur',
        });
        const timeBetween = (secondInTimestamp.getTime() - firstIn.timestamp.getTime()) / (1000 * 60 * 60);
        if (timeBetween >= 4) {
            const suggestedOutTime = new Date(firstIn.timestamp.getTime() + (timeBetween / 2) * 60 * 60 * 1000);
            suggestions.push({
                action: 'ADD_OUT_BETWEEN',
                description: 'Ajouter un OUT manquant entre les deux IN',
                confidence: 60,
                suggestedOutTime: suggestedOutTime.toISOString(),
                reason: 'Il semble y avoir eu une sortie non pointée entre les deux entrées',
            });
        }
        const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0];
        return {
            type: 'DOUBLE_IN_CORRECTION',
            suggestions: suggestions,
            recommended: bestSuggestion,
            firstInId: firstIn.id,
            firstInTimestamp: firstIn.timestamp.toISOString(),
            secondInTimestamp: secondInTimestamp.toISOString(),
        };
    }
    async analyzeDoubleInPattern(tenantId, employeeId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const doubleInRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.IN,
                hasAnomaly: true,
                anomalyType: 'DOUBLE_IN',
                timestamp: { gte: thirtyDaysAgo },
            },
            orderBy: { timestamp: 'asc' },
        });
        const hours = [];
        let totalInterval = 0;
        let intervalCount = 0;
        for (let i = 1; i < doubleInRecords.length; i++) {
            const hour = doubleInRecords[i].timestamp.getHours();
            hours.push(hour);
            if (i > 0) {
                const interval = (doubleInRecords[i].timestamp.getTime() - doubleInRecords[i - 1].timestamp.getTime()) / (1000 * 60);
                totalInterval += interval;
                intervalCount++;
            }
        }
        return {
            count: doubleInRecords.length,
            averageInterval: intervalCount > 0 ? totalInterval / intervalCount : 0,
            hours: hours,
        };
    }
    async detectMissingInImproved(tenantId, employeeId, timestamp, todayRecords) {
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                allowMissingInForRemoteWork: true,
                allowMissingInForMissions: true,
                enableMissingInPatternDetection: true,
                missingInPatternAlertThreshold: true,
            },
        });
        const allowRemoteWork = settings?.allowMissingInForRemoteWork !== false;
        const allowMissions = settings?.allowMissingInForMissions !== false;
        const enablePatternDetection = settings?.enableMissingInPatternDetection !== false;
        const patternAlertThreshold = settings?.missingInPatternAlertThreshold || 3;
        const hasInToday = todayRecords.some(r => r.type === client_2.AttendanceType.IN);
        if (hasInToday) {
            return { hasAnomaly: false };
        }
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: {
                id: true,
                userId: true,
            },
        });
        const isMobilePunch = todayRecords.some(r => r.method === 'MOBILE_GPS' || r.latitude !== null);
        const startOfDay = new Date(timestamp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(timestamp);
        endOfDay.setHours(23, 59, 59, 999);
        const leave = await this.prisma.leave.findFirst({
            where: {
                tenantId,
                employeeId,
                startDate: { lte: endOfDay },
                endDate: { gte: startOfDay },
                status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
            },
        });
        if (isMobilePunch || leave) {
            return {
                hasAnomaly: false,
                type: 'PRESENCE_EXTERNE',
                note: isMobilePunch
                    ? 'Pointage externe (mobile/GPS) détecté - présence externe légitime'
                    : 'Congé approuvé pour cette journée - présence externe légitime',
            };
        }
        const yesterday = new Date(timestamp);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        const yesterdayAllRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                timestamp: { gte: yesterday, lte: endOfYesterday },
                type: { in: [client_2.AttendanceType.IN, client_2.AttendanceType.OUT] },
            },
            orderBy: { timestamp: 'desc' },
        });
        const lastRecordYesterday = yesterdayAllRecords.length > 0 ? yesterdayAllRecords[0] : null;
        const hasUnmatchedInYesterday = lastRecordYesterday?.type === client_2.AttendanceType.IN;
        if (hasUnmatchedInYesterday && lastRecordYesterday) {
            const lastInYesterday = lastRecordYesterday;
            console.log('🔍 [NIGHT SHIFT DETECTION] OUT sans IN détecté');
            console.log(`   IN d'hier: ${lastInYesterday.timestamp.toISOString()}`);
            console.log(`   OUT d'aujourd'hui: ${timestamp.toISOString()}`);
            const inTime = { hours: lastInYesterday.timestamp.getHours(), minutes: lastInYesterday.timestamp.getMinutes() };
            const outTime = { hours: timestamp.getHours(), minutes: timestamp.getMinutes() };
            console.log(`   Heures IN: ${inTime.hours}:${inTime.minutes.toString().padStart(2, '0')}`);
            console.log(`   Heures OUT: ${outTime.hours}:${outTime.minutes.toString().padStart(2, '0')}`);
            const inDate = new Date(lastInYesterday.timestamp);
            inDate.setHours(0, 0, 0, 0);
            const outDate = new Date(timestamp);
            outDate.setHours(0, 0, 0, 0);
            const isNextDay = outDate.getTime() > inDate.getTime();
            const timeBetweenInAndOut = timestamp.getTime() - lastInYesterday.timestamp.getTime();
            const hoursBetween = timeBetweenInAndOut / (1000 * 60 * 60);
            const isReasonableTimeSpan = hoursBetween >= 6 && hoursBetween <= 14;
            console.log(`   Est le jour suivant: ${isNextDay}`);
            console.log(`   Heures entre IN et OUT: ${hoursBetween.toFixed(2)}h`);
            console.log(`   Durée raisonnable (6-14h): ${isReasonableTimeSpan}`);
            if (isNextDay && isReasonableTimeSpan) {
                console.log('✅ Conditions de base remplies (jour suivant + durée raisonnable)');
                const schedule = await this.getScheduleWithFallback(tenantId, employeeId, lastInYesterday.timestamp);
                console.log(`   Planning trouvé pour le jour d'entrée: ${schedule ? 'OUI' : 'NON'}`);
                if (schedule?.shift) {
                    const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                    const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                    console.log(`   Shift prévu: ${expectedStartTime.hours}:${expectedStartTime.minutes.toString().padStart(2, '0')} - ${expectedEndTime.hours}:${expectedEndTime.minutes.toString().padStart(2, '0')}`);
                    const isNightShift = this.isNightShift(schedule.shift, expectedEndTime);
                    console.log(`   Est un shift de nuit (planning): ${isNightShift}`);
                    if (isNightShift) {
                        console.log('✅ Shift de nuit confirmé par le planning → PAS d\'anomalie');
                        return { hasAnomaly: false };
                    }
                }
                const criterion1 = inTime.hours >= 17 && outTime.hours < 14;
                console.log(`   Critère 1 (IN ≥17h ET OUT <14h): ${criterion1}`);
                if (criterion1) {
                    console.log('✅ Pattern de shift de nuit détecté (critère 1) → PAS d\'anomalie');
                    return { hasAnomaly: false };
                }
                const criterion2 = inTime.hours >= 20 && outTime.hours < 12;
                console.log(`   Critère 2 (IN ≥20h ET OUT <12h): ${criterion2}`);
                if (criterion2) {
                    console.log('✅ Pattern de shift de nuit détecté (critère 2) → PAS d\'anomalie');
                    return { hasAnomaly: false };
                }
                const criterion3 = hoursBetween >= 8 && hoursBetween <= 12 && inTime.hours >= 18 && outTime.hours < 12;
                console.log(`   Critère 3 (8h≤durée≤12h ET IN ≥18h ET OUT <12h): ${criterion3}`);
                if (criterion3) {
                    console.log('✅ Pattern de shift de nuit détecté (critère 3) → PAS d\'anomalie');
                    return { hasAnomaly: false };
                }
                console.log('❌ Aucun critère de shift de nuit rempli → Anomalie MISSING_OUT');
            }
            else {
                console.log('❌ Conditions de base non remplies');
            }
            console.log('⚠️ Création d\'une anomalie MISSING_OUT pour le jour précédent');
            return {
                hasAnomaly: true,
                type: 'MISSING_OUT',
                note: `OUT détecté aujourd'hui sans IN aujourd'hui, mais un IN existe hier (${lastInYesterday.timestamp.toLocaleDateString('fr-FR')}) sans OUT. Voulez-vous clôturer la journée d'hier ?`,
                suggestedCorrection: {
                    type: 'CLOSE_YESTERDAY_SESSION',
                    previousInId: lastInYesterday.id,
                    previousInTimestamp: lastInYesterday.timestamp.toISOString(),
                    currentOutTimestamp: timestamp.toISOString(),
                    confidence: 90,
                    reason: 'OUT_TODAY_CLOSES_YESTERDAY_SESSION',
                },
            };
        }
        const otherEventsToday = todayRecords.filter(r => r.type !== client_2.AttendanceType.OUT && r.type !== client_2.AttendanceType.IN);
        if (otherEventsToday.length > 0) {
            const firstEvent = otherEventsToday.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
            const suggestedInTime = new Date(firstEvent.timestamp);
            suggestedInTime.setMinutes(suggestedInTime.getMinutes() - 30);
            const suggestion = await this.generateMissingInTimeSuggestion(tenantId, employeeId, timestamp, suggestedInTime);
            return {
                hasAnomaly: true,
                type: 'MISSING_IN',
                note: `Pointage de sortie sans entrée. Autres événements détectés aujourd'hui (${otherEventsToday.length}). Suggestion: créer un IN rétroactif.`,
                suggestedCorrection: {
                    type: 'ADD_MISSING_IN_RETROACTIVE',
                    suggestedInTime: suggestedInTime.toISOString(),
                    confidence: 70,
                    reason: 'OTHER_EVENTS_DETECTED',
                    firstEventType: firstEvent.type,
                    firstEventTime: firstEvent.timestamp.toISOString(),
                    ...suggestion,
                },
            };
        }
        const suggestion = await this.generateMissingInTimeSuggestion(tenantId, employeeId, timestamp, null);
        let patternNote = '';
        if (enablePatternDetection) {
            const patternInfo = await this.analyzeMissingInPattern(tenantId, employeeId);
            if (patternInfo.count >= patternAlertThreshold) {
                patternNote = ` ⚠️ Pattern d'oubli: ${patternInfo.count} MISSING_IN sur 30 jours.`;
            }
        }
        return {
            hasAnomaly: true,
            type: 'MISSING_IN',
            note: `Pointage de sortie sans entrée.${patternNote}`,
            suggestedCorrection: {
                type: 'ADD_MISSING_IN',
                ...suggestion,
            },
        };
    }
    async generateMissingInTimeSuggestion(tenantId, employeeId, outTimestamp, eventBasedTime) {
        const suggestions = [];
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, outTimestamp);
        if (schedule?.shift) {
            const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
            const suggestedTime = new Date(outTimestamp);
            suggestedTime.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
            suggestions.push({
                source: 'PLANNING',
                suggestedTime: suggestedTime.toISOString(),
                confidence: 90,
                description: `Heure prévue du shift: ${expectedStartTime.hours.toString().padStart(2, '0')}:${expectedStartTime.minutes.toString().padStart(2, '0')}`,
            });
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalInRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.IN,
                timestamp: { gte: thirtyDaysAgo, lt: outTimestamp },
                hasAnomaly: false,
            },
            orderBy: { timestamp: 'asc' },
        });
        if (historicalInRecords.length > 0) {
            let totalMinutes = 0;
            historicalInRecords.forEach(record => {
                const recordTime = new Date(record.timestamp);
                totalMinutes += recordTime.getHours() * 60 + recordTime.getMinutes();
            });
            const avgMinutes = Math.round(totalMinutes / historicalInRecords.length);
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = avgMinutes % 60;
            const suggestedTime = new Date(outTimestamp);
            suggestedTime.setHours(avgHours, avgMins, 0, 0);
            suggestions.push({
                source: 'HISTORICAL_AVERAGE',
                suggestedTime: suggestedTime.toISOString(),
                confidence: 75,
                description: `Heure moyenne d'arrivée (30 derniers jours): ${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`,
                sampleSize: historicalInRecords.length,
            });
        }
        if (eventBasedTime) {
            suggestions.push({
                source: 'EVENT_BASED',
                suggestedTime: eventBasedTime.toISOString(),
                confidence: 60,
                description: `Basé sur le premier événement détecté aujourd'hui`,
            });
        }
        const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0] || {
            source: 'DEFAULT',
            suggestedTime: new Date(outTimestamp).setHours(8, 0, 0, 0),
            confidence: 50,
            description: 'Heure par défaut: 08:00',
        };
        return {
            suggestions: suggestions,
            recommended: bestSuggestion,
            outTimestamp: outTimestamp.toISOString(),
        };
    }
    async detectMissingOutImproved(tenantId, employeeId, timestamp, todayRecords) {
        console.log(`[detectMissingOutImproved] Détection temps réel désactivée - le job batch s'en charge`);
        return { hasAnomaly: false };
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                missingOutDetectionWindow: true,
                allowMissingOutForRemoteWork: true,
                allowMissingOutForMissions: true,
                enableMissingOutPatternDetection: true,
                missingOutPatternAlertThreshold: true,
            },
        });
        const detectionWindowHours = settings?.missingOutDetectionWindow || 12;
        const allowRemoteWork = settings?.allowMissingOutForRemoteWork !== false;
        const allowMissions = settings?.allowMissingOutForMissions !== false;
        const enablePatternDetection = settings?.enableMissingOutPatternDetection !== false;
        const patternAlertThreshold = settings?.missingOutPatternAlertThreshold || 3;
        const todayInRecords = todayRecords.filter(r => r.type === client_2.AttendanceType.IN);
        const todayOutRecords = todayRecords.filter(r => r.type === client_2.AttendanceType.OUT);
        if (todayInRecords.length === 0) {
            return { hasAnomaly: false };
        }
        const openSessions = [];
        for (const inRecord of todayInRecords) {
            const detectionWindowEnd = new Date(inRecord.timestamp.getTime() + detectionWindowHours * 60 * 60 * 1000);
            const correspondingOut = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    type: client_2.AttendanceType.OUT,
                    timestamp: {
                        gte: inRecord.timestamp,
                        lte: detectionWindowEnd,
                    },
                },
                orderBy: { timestamp: 'asc' },
            });
            const breakEvents = await this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId,
                    type: { in: [client_2.AttendanceType.BREAK_START, client_2.AttendanceType.BREAK_END] },
                    timestamp: {
                        gte: inRecord.timestamp,
                        lte: correspondingOut?.timestamp || new Date(),
                    },
                },
                orderBy: { timestamp: 'asc' },
            });
            if (!correspondingOut) {
                openSessions.push({
                    inRecord,
                    breakEvents,
                    hoursOpen: (new Date().getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60),
                });
            }
        }
        if (openSessions.length === 0) {
            return { hasAnomaly: false };
        }
        let anySessionPastShiftEnd = false;
        for (const session of openSessions) {
            const inSchedule = await this.getScheduleWithFallback(tenantId, employeeId, session.inRecord.timestamp);
            if (inSchedule?.shift) {
                const expectedEndTime = this.parseTimeString(inSchedule.customEndTime || inSchedule.shift.endTime);
                const expectedEnd = new Date(session.inRecord.timestamp);
                expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
                if (expectedEndTime.hours < expectedEndTime.hours ||
                    (expectedEndTime.hours >= 20 && expectedEndTime.hours <= 23)) {
                    expectedEnd.setDate(expectedEnd.getDate() + 1);
                }
                const hoursAfterShiftEnd = (new Date().getTime() - expectedEnd.getTime()) / (1000 * 60 * 60);
                console.log(`[detectMissingOut] Session ${session.inRecord.id}: hoursAfterShiftEnd=${hoursAfterShiftEnd.toFixed(2)}, expectedEnd=${expectedEnd.toISOString()}`);
                if (hoursAfterShiftEnd > 2) {
                    anySessionPastShiftEnd = true;
                    return {
                        hasAnomaly: true,
                        type: 'MISSING_OUT',
                        note: `Session ouverte depuis ${Math.round(session.hoursOpen)}h. La session traverse plusieurs shifts sans validation.`,
                        suggestedCorrection: {
                            type: 'CLOSE_SESSION_MULTI_SHIFT',
                            inId: session.inRecord.id,
                            inTimestamp: session.inRecord.timestamp.toISOString(),
                            expectedEndTime: expectedEnd.toISOString(),
                            confidence: 85,
                            reason: 'SESSION_TRAVERSES_MULTIPLE_SHIFTS',
                        },
                    };
                }
                else {
                    console.log(`[detectMissingOut] Session ${session.inRecord.id}: Shift pas encore terminé + 2h → pas d'anomalie`);
                }
            }
        }
        if (!anySessionPastShiftEnd && openSessions.length > 0) {
            const lastSession = openSessions[openSessions.length - 1];
            const lastSchedule = await this.getScheduleWithFallback(tenantId, employeeId, lastSession.inRecord.timestamp);
            if (lastSchedule?.shift) {
                console.log(`[detectMissingOut] Toutes les sessions sont dans la période normale → pas d'anomalie MISSING_OUT`);
                return { hasAnomaly: false };
            }
        }
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { id: true, userId: true },
        });
        const isMobilePunch = todayRecords.some(r => r.method === 'MOBILE_GPS' || r.latitude !== null);
        const startOfDay = new Date(timestamp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(timestamp);
        endOfDay.setHours(23, 59, 59, 999);
        const leave = await this.prisma.leave.findFirst({
            where: {
                tenantId,
                employeeId,
                startDate: { lte: endOfDay },
                endDate: { gte: startOfDay },
                status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
            },
        });
        if (isMobilePunch || leave) {
            return {
                hasAnomaly: false,
                type: 'PRESENCE_EXTERNE',
                note: isMobilePunch
                    ? 'Pointage externe (mobile/GPS) détecté - présence externe légitime'
                    : 'Congé approuvé pour cette journée - présence externe légitime',
            };
        }
        const lastOpenSession = openSessions[openSessions.length - 1];
        const sessionSchedule = await this.getScheduleWithFallback(tenantId, employeeId, lastOpenSession.inRecord.timestamp);
        if (sessionSchedule?.shift) {
            const expectedEndTime = this.parseTimeString(sessionSchedule.customEndTime || sessionSchedule.shift.endTime);
            const expectedEnd = new Date(lastOpenSession.inRecord.timestamp);
            expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
            const isNightShift = this.isNightShift(sessionSchedule.shift, expectedEndTime);
            if (isNightShift) {
                const detectionDeadline = new Date(expectedEnd);
                detectionDeadline.setDate(detectionDeadline.getDate() + 1);
                detectionDeadline.setHours(12, 0, 0, 0);
                if (new Date() < detectionDeadline) {
                    return { hasAnomaly: false };
                }
            }
        }
        const suggestion = await this.generateMissingOutTimeSuggestion(tenantId, employeeId, lastOpenSession.inRecord, lastOpenSession.breakEvents);
        let patternNote = '';
        if (enablePatternDetection) {
            const patternInfo = await this.analyzeMissingOutPattern(tenantId, employeeId);
            if (patternInfo.count >= patternAlertThreshold) {
                patternNote = ` ⚠️ Pattern d'oubli: ${patternInfo.count} MISSING_OUT sur 30 jours.`;
            }
        }
        return {
            hasAnomaly: true,
            type: 'MISSING_OUT',
            note: `Session ouverte depuis ${Math.round(lastOpenSession.hoursOpen)}h sans sortie correspondante.${patternNote}`,
            suggestedCorrection: {
                type: 'ADD_MISSING_OUT',
                inId: lastOpenSession.inRecord.id,
                inTimestamp: lastOpenSession.inRecord.timestamp.toISOString(),
                ...suggestion,
            },
        };
    }
    getTimezoneOffset(timezone, referenceDate) {
        if (!timezone || timezone === 'UTC') {
            return 0;
        }
        try {
            const date = referenceDate || new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                hourCycle: 'h23',
                timeZoneName: 'shortOffset',
            });
            const parts = formatter.formatToParts(date);
            const offsetPart = parts.find(p => p.type === 'timeZoneName');
            if (offsetPart?.value) {
                const match = offsetPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
                if (match) {
                    const sign = match[1] === '-' ? -1 : 1;
                    const hours = parseInt(match[2], 10);
                    const minutes = parseInt(match[3] || '0', 10);
                    return sign * (hours + minutes / 60);
                }
            }
            const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
            const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
            const diffMs = tzDate.getTime() - utcDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            return Math.round(diffHours * 2) / 2;
        }
        catch (error) {
            console.warn(`⚠️ Timezone invalide ou non supporté: ${timezone}, utilisant UTC`);
            return 0;
        }
    }
    isNightShift(shift, endTime) {
        const startTime = this.parseTimeString(shift.startTime);
        const startMinutes = startTime.hours * 60 + startTime.minutes;
        const endMinutes = endTime.hours * 60 + endTime.minutes;
        if (startMinutes > endMinutes) {
            return true;
        }
        if (startTime.hours >= 20) {
            return true;
        }
        if (endTime.hours <= 8 && endTime.hours > 0 && startTime.hours >= 18) {
            return true;
        }
        const nightPeriodStart = 22 * 60;
        const nightPeriodEnd = 6 * 60;
        let nightMinutes = 0;
        let totalMinutes = 0;
        if (startMinutes <= endMinutes) {
            totalMinutes = endMinutes - startMinutes;
            if (endMinutes > nightPeriodStart) {
                nightMinutes += Math.min(endMinutes, 24 * 60) - Math.max(startMinutes, nightPeriodStart);
            }
            if (startMinutes < nightPeriodEnd) {
                nightMinutes += Math.min(endMinutes, nightPeriodEnd) - startMinutes;
            }
        }
        else {
            totalMinutes = (24 * 60 - startMinutes) + endMinutes;
            if (startMinutes < 24 * 60) {
                nightMinutes += 24 * 60 - Math.max(startMinutes, nightPeriodStart);
            }
            nightMinutes += Math.min(endMinutes, nightPeriodEnd);
        }
        if (totalMinutes > 0 && (nightMinutes / totalMinutes) >= 0.5) {
            return true;
        }
        return false;
    }
    async generateMissingOutTimeSuggestion(tenantId, employeeId, inRecord, breakEvents) {
        const suggestions = [];
        const schedule = await this.getScheduleWithFallback(tenantId, employeeId, inRecord.timestamp);
        if (schedule?.shift) {
            const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
            const suggestedTime = new Date(inRecord.timestamp);
            suggestedTime.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
            if (this.isNightShift(schedule.shift, expectedEndTime)) {
                suggestedTime.setDate(suggestedTime.getDate() + 1);
            }
            suggestions.push({
                source: 'PLANNING',
                suggestedTime: suggestedTime.toISOString(),
                confidence: 90,
                description: `Heure prévue du shift: ${expectedEndTime.hours.toString().padStart(2, '0')}:${expectedEndTime.minutes.toString().padStart(2, '0')}`,
            });
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const historicalOutRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.OUT,
                timestamp: { gte: thirtyDaysAgo, lt: inRecord.timestamp },
                hasAnomaly: false,
            },
            orderBy: { timestamp: 'asc' },
        });
        if (historicalOutRecords.length > 0) {
            let totalMinutes = 0;
            historicalOutRecords.forEach(record => {
                const recordTime = new Date(record.timestamp);
                totalMinutes += recordTime.getHours() * 60 + recordTime.getMinutes();
            });
            const avgMinutes = Math.round(totalMinutes / historicalOutRecords.length);
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = avgMinutes % 60;
            const suggestedTime = new Date(inRecord.timestamp);
            suggestedTime.setHours(avgHours, avgMins, 0, 0);
            suggestions.push({
                source: 'HISTORICAL_AVERAGE',
                suggestedTime: suggestedTime.toISOString(),
                confidence: 75,
                description: `Heure moyenne de sortie (30 derniers jours): ${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`,
                sampleSize: historicalOutRecords.length,
            });
        }
        if (breakEvents.length > 0) {
            const lastBreakEnd = breakEvents
                .filter(e => e.type === client_2.AttendanceType.BREAK_END)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            if (lastBreakEnd) {
                const suggestedTime = new Date(lastBreakEnd.timestamp);
                suggestedTime.setHours(suggestedTime.getHours() + 4);
                suggestions.push({
                    source: 'LAST_EVENT',
                    suggestedTime: suggestedTime.toISOString(),
                    confidence: 60,
                    description: `Basé sur le dernier pointage (BREAK_END)`,
                });
            }
        }
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: { site: true },
        });
        if (employee?.site) {
            const suggestedTime = new Date(inRecord.timestamp);
            suggestedTime.setHours(18, 0, 0, 0);
            suggestions.push({
                source: 'SITE_CLOSING',
                suggestedTime: suggestedTime.toISOString(),
                confidence: 40,
                description: `Heure de fermeture du site (estimation)`,
            });
        }
        const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0] || {
            source: 'DEFAULT',
            suggestedTime: new Date(inRecord.timestamp).setHours(17, 0, 0, 0),
            confidence: 50,
            description: 'Heure par défaut: 17:00',
        };
        return {
            suggestions: suggestions,
            recommended: bestSuggestion,
            inTimestamp: inRecord.timestamp.toISOString(),
        };
    }
    async analyzeMissingOutPattern(tenantId, employeeId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const missingOutRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.IN,
                hasAnomaly: true,
                anomalyType: 'MISSING_OUT',
                timestamp: { gte: thirtyDaysAgo },
            },
            orderBy: { timestamp: 'asc' },
        });
        const daysOfWeek = [];
        const hours = [];
        missingOutRecords.forEach(record => {
            const date = new Date(record.timestamp);
            daysOfWeek.push(date.getDay());
            hours.push(date.getHours());
        });
        return {
            count: missingOutRecords.length,
            daysOfWeek: daysOfWeek,
            hours: hours,
        };
    }
    async analyzeMissingInPattern(tenantId, employeeId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const missingInRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.OUT,
                hasAnomaly: true,
                anomalyType: 'MISSING_IN',
                timestamp: { gte: thirtyDaysAgo },
            },
            orderBy: { timestamp: 'asc' },
        });
        const daysOfWeek = [];
        const hours = [];
        missingInRecords.forEach(record => {
            const date = new Date(record.timestamp);
            daysOfWeek.push(date.getDay());
            hours.push(date.getHours());
        });
        return {
            count: missingInRecords.length,
            daysOfWeek: daysOfWeek,
            hours: hours,
        };
    }
    async detectAnomalies(tenantId, employeeId, timestamp, type) {
        const startOfDay = new Date(timestamp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(timestamp);
        endOfDay.setHours(23, 59, 59, 999);
        const todayRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                timestamp: { gte: startOfDay, lte: endOfDay },
            },
            orderBy: { timestamp: 'asc' },
        });
        const leave = await this.prisma.leave.findFirst({
            where: {
                tenantId,
                employeeId,
                startDate: { lte: timestamp },
                endDate: { gte: timestamp },
                status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
            },
            include: {
                leaveType: true,
            },
        });
        if (leave) {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                select: { firstName: true, lastName: true, matricule: true },
            });
            const employeeName = employee
                ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
                : `l'employé ${employeeId}`;
            console.log(`[detectAnomalies] ⚠️ Pointage pendant congé détecté: ${leave.leaveType.name} du ${leave.startDate.toLocaleDateString('fr-FR')} au ${leave.endDate.toLocaleDateString('fr-FR')}`);
            return {
                hasAnomaly: true,
                type: 'LEAVE_CONFLICT',
                note: `Pointage effectué pendant un congé approuvé (${leave.leaveType.name}) du ${leave.startDate.toLocaleDateString('fr-FR')} au ${leave.endDate.toLocaleDateString('fr-FR')}. ` +
                    `${employeeName} ne devrait pas travailler pendant cette période. ` +
                    `Veuillez vérifier avec l'employé et annuler soit le congé, soit le pointage.`,
            };
        }
        if (type === client_2.AttendanceType.IN) {
            const doubleInResult = await this.detectDoubleInImproved(tenantId, employeeId, timestamp, todayRecords);
            if (doubleInResult.hasAnomaly) {
                return doubleInResult;
            }
        }
        if (type === client_2.AttendanceType.OUT) {
            const missingInResult = await this.detectMissingInImproved(tenantId, employeeId, timestamp, todayRecords);
            if (missingInResult.hasAnomaly) {
                return missingInResult;
            }
        }
        if (type === client_2.AttendanceType.IN) {
            const missingOutResult = await this.detectMissingOutImproved(tenantId, employeeId, timestamp, todayRecords);
            if (missingOutResult.hasAnomaly) {
                return missingOutResult;
            }
        }
        const holidayCheck = await this.detectHolidayWork(tenantId, employeeId, timestamp, type);
        if (type === client_2.AttendanceType.IN) {
            const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
            if (schedule && schedule.id !== 'virtual' && schedule.status !== 'PUBLISHED') {
                const leave = await this.prisma.leave.findFirst({
                    where: {
                        tenantId,
                        employeeId,
                        startDate: { lte: timestamp },
                        endDate: { gte: timestamp },
                        status: { in: ['APPROVED', 'MANAGER_APPROVED'] },
                    },
                });
                if (!leave) {
                    return {
                        hasAnomaly: true,
                        type: 'ABSENCE_TECHNICAL',
                        note: `Absence technique : planning ${schedule.status.toLowerCase()}`,
                    };
                }
            }
            if (schedule?.shift && (schedule.id === 'virtual' || schedule.status === 'PUBLISHED')) {
                const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                const tenant = await this.prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { timezone: true },
                });
                const timezoneOffset = this.getTimezoneOffset(tenant?.timezone || 'UTC');
                const expectedStart = new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), expectedStartTime.hours - timezoneOffset, expectedStartTime.minutes, 0, 0));
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: {
                        lateToleranceEntry: true,
                        absencePartialThreshold: true,
                        allowImplicitBreaks: true,
                        minImplicitBreakMinutes: true,
                        maxImplicitBreakMinutes: true,
                    },
                });
                const toleranceMinutes = settings?.lateToleranceEntry || 10;
                const absenceThreshold = settings?.absencePartialThreshold || 2;
                const lateHours = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);
                const lateMinutes = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60);
                const allowImplicitBreaks = settings?.allowImplicitBreaks ?? true;
                const minBreakMinutes = settings?.minImplicitBreakMinutes ?? 15;
                const maxBreakMinutes = settings?.maxImplicitBreakMinutes ?? 180;
                if (allowImplicitBreaks && lateMinutes > toleranceMinutes) {
                    const recentOut = await this.prisma.attendance.findFirst({
                        where: {
                            tenantId,
                            employeeId,
                            type: client_2.AttendanceType.OUT,
                            timestamp: {
                                gte: new Date(timestamp.getTime() - maxBreakMinutes * 60 * 1000),
                                lte: new Date(timestamp.getTime() - minBreakMinutes * 60 * 1000),
                            },
                        },
                        orderBy: { timestamp: 'desc' },
                    });
                    if (recentOut) {
                        const breakDurationMinutes = (timestamp.getTime() - recentOut.timestamp.getTime()) / 60000;
                        console.log(`✅ [detectAnomalies] Pause implicite détectée pour employé ${employeeId}: OUT à ${recentOut.timestamp.toLocaleTimeString('fr-FR')} → IN à ${timestamp.toLocaleTimeString('fr-FR')} (${breakDurationMinutes.toFixed(0)} min)`);
                        if (recentOut.hasAnomaly && recentOut.anomalyType === 'EARLY_LEAVE') {
                            console.log(`🧹 [detectAnomalies] Nettoyage anomalie EARLY_LEAVE sur OUT ${recentOut.id} (c'était une pause)`);
                            await this.prisma.attendance.update({
                                where: { id: recentOut.id },
                                data: { hasAnomaly: false, anomalyType: null, anomalyNote: null },
                            });
                        }
                        return { hasAnomaly: false };
                    }
                }
                if (lateHours >= absenceThreshold) {
                    return {
                        hasAnomaly: true,
                        type: 'ABSENCE_PARTIAL',
                        note: `Absence partielle détectée : arrivée ${lateHours.toFixed(1)}h après l'heure prévue`,
                    };
                }
                if (lateMinutes > toleranceMinutes) {
                    return {
                        hasAnomaly: true,
                        type: 'LATE',
                        note: `Retard de ${Math.round(lateMinutes)} minutes détecté`,
                    };
                }
            }
            else if (!schedule) {
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: {
                        workingDays: true,
                        requireScheduleForAttendance: true,
                    },
                });
                const dayOfWeek = timestamp.getDay();
                const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6];
                const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                const isWorkingDay = workingDays.includes(normalizedDayOfWeek);
                if (true) {
                    const leave = await this.prisma.leave.findFirst({
                        where: {
                            tenantId,
                            employeeId,
                            startDate: { lte: timestamp },
                            endDate: { gte: timestamp },
                            status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
                        },
                    });
                    const recoveryDay = await this.prisma.recoveryDay.findFirst({
                        where: {
                            tenantId,
                            employeeId,
                            startDate: { lte: timestamp },
                            endDate: { gte: timestamp },
                            status: { in: ['APPROVED', 'PENDING'] },
                        },
                    });
                    if (!leave && !recoveryDay) {
                        const employee = await this.prisma.employee.findUnique({
                            where: { id: employeeId },
                            select: { firstName: true, lastName: true, matricule: true },
                        });
                        const employeeName = employee
                            ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
                            : `l'employé ${employeeId}`;
                        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
                        const dayName = dayNames[dayOfWeek];
                        if (!isWorkingDay) {
                            return {
                                hasAnomaly: true,
                                type: 'WEEKEND_WORK_UNAUTHORIZED',
                                note: `Pointage effectué le ${timestamp.toLocaleDateString('fr-FR')} (weekend - ${dayName}) : ` +
                                    `aucun planning publié et jour non ouvrable. ` +
                                    `Veuillez créer un planning pour autoriser le travail en weekend ou annuler ce pointage.`,
                            };
                        }
                        return {
                            hasAnomaly: true,
                            type: 'UNPLANNED_PUNCH',
                            note: `Pointage non planifié pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (jour ouvrable - ${dayName}) : ` +
                                `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé. ` +
                                `Veuillez créer un planning ou assigner un shift par défaut.`,
                        };
                    }
                }
            }
        }
        if (type === client_2.AttendanceType.OUT) {
            const todayRecordsForDetect = await this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId,
                    timestamp: {
                        gte: new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), 0, 0, 0)),
                        lte: new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate(), 23, 59, 59)),
                    },
                },
                orderBy: { timestamp: 'asc' },
            });
            const sortedRecordsDetect = [...todayRecordsForDetect].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            let inRecordDetect;
            let outCountDetect = 0;
            for (let i = sortedRecordsDetect.length - 1; i >= 0; i--) {
                const record = sortedRecordsDetect[i];
                if (record.timestamp.getTime() > timestamp.getTime())
                    continue;
                if (record.type === client_2.AttendanceType.BREAK_START || record.type === client_2.AttendanceType.BREAK_END)
                    continue;
                if (record.type === client_2.AttendanceType.OUT) {
                    outCountDetect++;
                }
                if (record.type === client_2.AttendanceType.IN) {
                    if (outCountDetect === 0) {
                        inRecordDetect = record;
                        break;
                    }
                    else {
                        outCountDetect--;
                    }
                }
            }
            const schedule = inRecordDetect
                ? await this.getScheduleWithFallback(tenantId, employeeId, inRecordDetect.timestamp)
                : await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
            if (schedule?.shift && (schedule.id === 'virtual' || schedule.status === 'PUBLISHED')) {
                const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                const expectedEnd = new Date(timestamp);
                expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
                const isNight = this.isNightShift(schedule.shift, expectedEndTime);
                if (isNight && expectedEnd.getTime() > timestamp.getTime()) {
                    const hoursDiff = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
                    if (hoursDiff > 12) {
                        expectedEnd.setDate(expectedEnd.getDate() - 1);
                    }
                }
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: {
                        earlyToleranceExit: true,
                        requireBreakPunch: true,
                        allowImplicitBreaks: true,
                    },
                });
                const toleranceMinutes = settings?.earlyToleranceExit || 5;
                const earlyLeaveMinutes = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60);
                if (earlyLeaveMinutes > toleranceMinutes) {
                    const requireBreakPunch = settings?.requireBreakPunch ?? false;
                    const allowImplicitBreaks = settings?.allowImplicitBreaks ?? true;
                    if (!requireBreakPunch && allowImplicitBreaks) {
                        const breakDuration = schedule.shift.breakDuration || 60;
                        const breakStartTimeStr = schedule.shift.breakStartTime;
                        let breakWindowStart;
                        let breakWindowEnd;
                        if (breakStartTimeStr) {
                            const breakStartParsed = this.parseTimeString(breakStartTimeStr);
                            breakWindowStart = breakStartParsed.hours * 60 + breakStartParsed.minutes;
                            breakWindowEnd = breakWindowStart + breakDuration;
                            breakWindowStart -= 30;
                            breakWindowEnd += 30;
                        }
                        else {
                            const shiftStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                            let shiftStartMinutes = shiftStartTime.hours * 60 + shiftStartTime.minutes;
                            let shiftEndMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;
                            if (shiftEndMinutes < shiftStartMinutes) {
                                shiftEndMinutes += 24 * 60;
                            }
                            const shiftMiddle = shiftStartMinutes + Math.floor((shiftEndMinutes - shiftStartMinutes) / 2);
                            breakWindowStart = shiftMiddle - Math.floor(breakDuration / 2) - 30;
                            breakWindowEnd = shiftMiddle + Math.floor(breakDuration / 2) + 30;
                        }
                        breakWindowStart = ((breakWindowStart % (24 * 60)) + (24 * 60)) % (24 * 60);
                        breakWindowEnd = ((breakWindowEnd % (24 * 60)) + (24 * 60)) % (24 * 60);
                        const outTimeInMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
                        let isInBreakWindow = false;
                        if (breakWindowStart <= breakWindowEnd) {
                            isInBreakWindow = outTimeInMinutes >= breakWindowStart && outTimeInMinutes <= breakWindowEnd;
                        }
                        else {
                            isInBreakWindow = outTimeInMinutes >= breakWindowStart || outTimeInMinutes <= breakWindowEnd;
                        }
                        if (isInBreakWindow) {
                            const breakStartFormatted = `${Math.floor(breakWindowStart / 60).toString().padStart(2, '0')}:${(breakWindowStart % 60).toString().padStart(2, '0')}`;
                            const breakEndFormatted = `${Math.floor(breakWindowEnd / 60).toString().padStart(2, '0')}:${(breakWindowEnd % 60).toString().padStart(2, '0')}`;
                            console.log(`⏸️ [detectAnomalies] OUT à ${timestamp.toLocaleTimeString('fr-FR')} dans fenêtre pause shift (${breakStartFormatted}-${breakEndFormatted}) - EARLY_LEAVE non détecté`);
                        }
                        else {
                            return {
                                hasAnomaly: true,
                                type: 'EARLY_LEAVE',
                                note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté`,
                            };
                        }
                    }
                    else {
                        return {
                            hasAnomaly: true,
                            type: 'EARLY_LEAVE',
                            note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté`,
                        };
                    }
                }
            }
            else if (!schedule) {
                const previousDayDate = new Date(Date.UTC(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate() - 1, 0, 0, 0, 0));
                const previousDaySchedule = await this.prisma.schedule.findFirst({
                    where: {
                        tenantId,
                        employeeId,
                        date: previousDayDate,
                        status: 'PUBLISHED',
                    },
                    include: {
                        shift: true,
                    },
                });
                if (previousDaySchedule) {
                    const expectedEndTime = this.parseTimeString(previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime);
                    const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);
                    if (isNightShift) {
                        console.log(`[detectAnomalies OUT] ✅ Shift de nuit de la veille détecté → Pas d'anomalie pour ce OUT`);
                        return { hasAnomaly: false };
                    }
                }
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: {
                        workingDays: true,
                        requireScheduleForAttendance: true,
                    },
                });
                const dayOfWeek = timestamp.getDay();
                const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6];
                const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                const isWorkingDay = workingDays.includes(normalizedDayOfWeek);
                if (true) {
                    const leave = await this.prisma.leave.findFirst({
                        where: {
                            tenantId,
                            employeeId,
                            startDate: { lte: timestamp },
                            endDate: { gte: timestamp },
                            status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
                        },
                    });
                    const recoveryDay = await this.prisma.recoveryDay.findFirst({
                        where: {
                            tenantId,
                            employeeId,
                            startDate: { lte: timestamp },
                            endDate: { gte: timestamp },
                            status: { in: ['APPROVED', 'PENDING'] },
                        },
                    });
                    if (!leave && !recoveryDay) {
                        const employee = await this.prisma.employee.findUnique({
                            where: { id: employeeId },
                            select: { firstName: true, lastName: true, matricule: true },
                        });
                        const employeeName = employee
                            ? `${employee.firstName} ${employee.lastName} (${employee.matricule})`
                            : `l'employé ${employeeId}`;
                        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
                        const dayName = dayNames[dayOfWeek];
                        if (!isWorkingDay) {
                            return {
                                hasAnomaly: true,
                                type: 'WEEKEND_WORK_UNAUTHORIZED',
                                note: `Pointage effectué le ${timestamp.toLocaleDateString('fr-FR')} (weekend - ${dayName}) : ` +
                                    `aucun planning publié et jour non ouvrable. ` +
                                    `Fin de shift commencé le weekend sans autorisation.`,
                            };
                        }
                        return {
                            hasAnomaly: true,
                            type: 'UNPLANNED_PUNCH',
                            note: `Pointage non planifié pour ${employeeName} le ${timestamp.toLocaleDateString('fr-FR')} (jour ouvrable - ${dayName}) : ` +
                                `aucun planning publié, aucun shift par défaut assigné, et aucun congé/récupération approuvé. ` +
                                `Veuillez créer un planning ou assigner un shift par défaut.`,
                        };
                    }
                }
            }
        }
        if (type === client_2.AttendanceType.IN) {
            const lastOutRecord = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    type: client_2.AttendanceType.OUT,
                    timestamp: { lt: timestamp },
                },
                orderBy: { timestamp: 'desc' },
            });
            if (lastOutRecord) {
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: {
                        enableInsufficientRestDetection: true,
                        minimumRestHours: true,
                        minimumRestHoursNightShift: true,
                        nightShiftStart: true,
                        nightShiftEnd: true,
                    },
                });
                if (settings?.enableInsufficientRestDetection !== false) {
                    const restHours = (timestamp.getTime() - lastOutRecord.timestamp.getTime()) / (1000 * 60 * 60);
                    const schedule = await this.getScheduleWithFallback(tenantId, employeeId, timestamp);
                    let isNightShift = false;
                    if (schedule?.shift) {
                        const shiftStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                        const nightStartTime = this.parseTimeString(settings?.nightShiftStart || '21:00');
                        const nightEndTime = this.parseTimeString(settings?.nightShiftEnd || '06:00');
                        const shiftStartMinutes = shiftStartTime.hours * 60 + shiftStartTime.minutes;
                        const nightStartMinutes = nightStartTime.hours * 60 + nightStartTime.minutes;
                        const nightEndMinutes = nightEndTime.hours * 60 + nightEndTime.minutes;
                        if (nightStartMinutes > nightEndMinutes) {
                            isNightShift = shiftStartMinutes >= nightStartMinutes || shiftStartMinutes <= nightEndMinutes;
                        }
                        else {
                            isNightShift = shiftStartMinutes >= nightStartMinutes && shiftStartMinutes <= nightEndMinutes;
                        }
                    }
                    const minimumRestHours = isNightShift && settings?.minimumRestHoursNightShift
                        ? Number(settings.minimumRestHoursNightShift)
                        : Number(settings?.minimumRestHours || 11);
                    if (restHours < minimumRestHours) {
                        return {
                            hasAnomaly: true,
                            type: 'INSUFFICIENT_REST',
                            note: `Repos insuffisant détecté : ${restHours.toFixed(2)}h de repos (minimum requis: ${minimumRestHours}h)`,
                        };
                    }
                }
            }
        }
        if (type === client_2.AttendanceType.MISSION_START || type === client_2.AttendanceType.MISSION_END) {
            return { hasAnomaly: false };
        }
        if (holidayCheck.hasAnomaly) {
            return holidayCheck;
        }
        return { hasAnomaly: false };
    }
    async approveCorrection(tenantId, id, approvedBy, approved, comment) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!attendance) {
            throw new common_1.NotFoundException(`Attendance record ${id} not found`);
        }
        if (!attendance.needsApproval) {
            throw new common_1.BadRequestException('Cette correction ne nécessite pas d\'approbation');
        }
        if (attendance.approvalStatus === 'APPROVED' || attendance.approvalStatus === 'REJECTED') {
            throw new common_1.BadRequestException('Cette correction a déjà été traitée');
        }
        const updatedAttendance = await this.prisma.attendance.update({
            where: { id },
            data: {
                isCorrected: approved,
                correctedAt: approved ? new Date() : null,
                needsApproval: false,
                approvalStatus: approved ? 'APPROVED' : 'REJECTED',
                approvedBy: approved ? approvedBy : null,
                approvedAt: approved ? new Date() : null,
                correctionNote: comment || attendance.correctionNote,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        userId: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (updatedAttendance.employee.userId) {
            await this.prisma.notification.create({
                data: {
                    tenantId,
                    employeeId: attendance.employeeId,
                    type: client_2.NotificationType.ATTENDANCE_CORRECTED,
                    title: approved
                        ? 'Correction de pointage approuvée'
                        : 'Correction de pointage rejetée',
                    message: approved
                        ? `Votre correction de pointage a été approuvée.`
                        : `Votre correction de pointage a été rejetée.`,
                    metadata: {
                        attendanceId: attendance.id,
                        approved,
                        comment,
                    },
                },
            });
        }
        return updatedAttendance;
    }
    async getPresenceRate(tenantId, employeeId, startDate, endDate) {
        const schedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const totalDays = schedules.length;
        if (totalDays === 0) {
            return {
                presenceRate: 0,
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                leaveDays: 0,
                recoveryDays: 0,
            };
        }
        const attendanceEntries = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.IN,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                timestamp: true,
            },
        });
        const presentDaysSet = new Set();
        attendanceEntries.forEach((entry) => {
            const date = new Date(entry.timestamp);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            presentDaysSet.add(dateKey);
        });
        const presentDays = presentDaysSet.size;
        const leaves = await this.prisma.leave.findMany({
            where: {
                tenantId,
                employeeId,
                status: {
                    in: ['APPROVED', 'MANAGER_APPROVED'],
                },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });
        const recoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId,
                status: {
                    in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED],
                },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });
        let leaveDays = 0;
        schedules.forEach((schedule) => {
            const scheduleDate = new Date(schedule.date);
            const hasLeave = leaves.some((leave) => scheduleDate >= new Date(leave.startDate) &&
                scheduleDate <= new Date(leave.endDate));
            if (hasLeave) {
                leaveDays++;
            }
        });
        let recoveryDaysCount = 0;
        schedules.forEach((schedule) => {
            const scheduleDate = new Date(schedule.date);
            const hasRecovery = recoveryDays.some((rd) => scheduleDate >= new Date(rd.startDate) &&
                scheduleDate <= new Date(rd.endDate));
            if (hasRecovery) {
                recoveryDaysCount++;
            }
        });
        const absentDays = totalDays - presentDays - leaveDays - recoveryDaysCount;
        const presenceRate = totalDays > 0 ? ((presentDays + recoveryDaysCount) / totalDays) * 100 : 0;
        return {
            presenceRate: Math.round(presenceRate * 100) / 100,
            totalDays,
            presentDays: presentDays + recoveryDaysCount,
            absentDays,
            leaveDays,
            recoveryDays: recoveryDaysCount,
        };
    }
    async getPunctualityRate(tenantId, employeeId, startDate, endDate) {
        const attendanceEntries = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                type: client_2.AttendanceType.IN,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                timestamp: true,
                lateMinutes: true,
                hasAnomaly: true,
                anomalyType: true,
            },
        });
        const totalEntries = attendanceEntries.length;
        if (totalEntries === 0) {
            return {
                punctualityRate: 0,
                totalEntries: 0,
                onTimeEntries: 0,
                lateEntries: 0,
                averageLateMinutes: 0,
            };
        }
        const lateEntries = attendanceEntries.filter((entry) => entry.lateMinutes && entry.lateMinutes > 0).length;
        const onTimeEntries = totalEntries - lateEntries;
        const lateMinutesSum = attendanceEntries.reduce((sum, entry) => sum + (entry.lateMinutes || 0), 0);
        const averageLateMinutes = lateEntries > 0 ? Math.round(lateMinutesSum / lateEntries) : 0;
        const punctualityRate = totalEntries > 0 ? (onTimeEntries / totalEntries) * 100 : 0;
        return {
            punctualityRate: Math.round(punctualityRate * 100) / 100,
            totalEntries,
            onTimeEntries,
            lateEntries,
            averageLateMinutes,
        };
    }
    async getTrends(tenantId, employeeId, startDate, endDate) {
        const attendances = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                hasAnomaly: true,
            },
            select: {
                timestamp: true,
                anomalyType: true,
            },
        });
        const dailyMap = new Map();
        const weeklyMap = new Map();
        attendances.forEach((attendance) => {
            const date = new Date(attendance.timestamp);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay() + 1);
            const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;
            if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, {
                    date: dateKey,
                    lateCount: 0,
                    absentCount: 0,
                    earlyLeaveCount: 0,
                    anomaliesCount: 0,
                });
            }
            if (!weeklyMap.has(weekKey)) {
                weeklyMap.set(weekKey, {
                    week: weekKey,
                    lateCount: 0,
                    absentCount: 0,
                    earlyLeaveCount: 0,
                    anomaliesCount: 0,
                });
            }
            const daily = dailyMap.get(dateKey);
            const weekly = weeklyMap.get(weekKey);
            daily.anomaliesCount++;
            weekly.anomaliesCount++;
            if (attendance.anomalyType === 'LATE') {
                daily.lateCount++;
                weekly.lateCount++;
            }
            else if (attendance.anomalyType === 'ABSENCE') {
                daily.absentCount++;
                weekly.absentCount++;
            }
            else if (attendance.anomalyType === 'EARLY_LEAVE') {
                daily.earlyLeaveCount++;
                weekly.earlyLeaveCount++;
            }
        });
        const dailyTrends = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        const weeklyTrends = Array.from(weeklyMap.values()).sort((a, b) => a.week.localeCompare(b.week));
        return {
            dailyTrends,
            weeklyTrends,
        };
    }
    async detectRecurringAnomalies(tenantId, employeeId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const anomalies = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                hasAnomaly: true,
                timestamp: {
                    gte: startDate,
                },
            },
            select: {
                anomalyType: true,
                timestamp: true,
            },
        });
        const anomalyMap = new Map();
        anomalies.forEach((anomaly) => {
            if (!anomaly.anomalyType)
                return;
            if (!anomalyMap.has(anomaly.anomalyType)) {
                anomalyMap.set(anomaly.anomalyType, {
                    count: 0,
                    lastOccurrence: new Date(anomaly.timestamp),
                });
            }
            const entry = anomalyMap.get(anomaly.anomalyType);
            entry.count++;
            if (new Date(anomaly.timestamp) > entry.lastOccurrence) {
                entry.lastOccurrence = new Date(anomaly.timestamp);
            }
        });
        const recurring = Array.from(anomalyMap.entries())
            .filter(([_, data]) => data.count >= 3)
            .map(([type, data]) => {
            const frequency = data.count / days;
            return {
                type,
                count: data.count,
                lastOccurrence: data.lastOccurrence,
                frequency: frequency > 0.5 ? 'Quotidienne' : frequency > 0.2 ? 'Hebdomadaire' : 'Mensuelle',
            };
        })
            .sort((a, b) => b.count - a.count);
        return recurring;
    }
    async bulkCorrectAttendance(tenantId, bulkDto) {
        const results = [];
        const errors = [];
        for (const item of bulkDto.attendances) {
            try {
                const attendance = await this.prisma.attendance.findFirst({
                    where: { id: item.attendanceId, tenantId },
                });
                if (!attendance) {
                    errors.push({
                        attendanceId: item.attendanceId,
                        error: 'Pointage non trouvé',
                    });
                    continue;
                }
                const correctionDto = {
                    correctionNote: item.correctionNote || bulkDto.generalNote,
                    correctedBy: bulkDto.correctedBy,
                    correctedTimestamp: item.correctedTimestamp,
                    forceApproval: bulkDto.forceApproval,
                };
                const corrected = await this.correctAttendance(tenantId, item.attendanceId, correctionDto);
                results.push({
                    attendanceId: item.attendanceId,
                    success: true,
                    data: corrected,
                });
            }
            catch (error) {
                errors.push({
                    attendanceId: item.attendanceId,
                    error: error.message || 'Erreur lors de la correction',
                });
            }
        }
        return {
            total: bulkDto.attendances.length,
            success: results.length,
            failed: errors.length,
            results,
            errors,
        };
    }
    async exportAnomalies(tenantId, filters, format) {
        const where = {
            tenantId,
            hasAnomaly: true,
        };
        if (filters.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters.anomalyType) {
            where.anomalyType = filters.anomalyType;
        }
        if (filters.startDate || filters.endDate) {
            where.timestamp = {};
            if (filters.startDate) {
                where.timestamp.gte = new Date(filters.startDate + 'T00:00:00.000Z');
            }
            if (filters.endDate) {
                where.timestamp.lte = new Date(filters.endDate + 'T23:59:59.999Z');
            }
        }
        const anomalies = await this.prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        department: {
                            select: {
                                name: true,
                            },
                        },
                        site: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
        });
        if (format === 'csv') {
            const csvRows = [
                [
                    'Date',
                    'Heure',
                    'Employé',
                    'Matricule',
                    'Département',
                    'Site',
                    'Type d\'anomalie',
                    'Note',
                    'Statut correction',
                    'Corrigé par',
                    'Date correction',
                ].join(','),
            ];
            anomalies.forEach((anomaly) => {
                const date = new Date(anomaly.timestamp);
                csvRows.push([
                    date.toISOString().split('T')[0],
                    date.toTimeString().split(' ')[0],
                    `${anomaly.employee.firstName} ${anomaly.employee.lastName}`,
                    anomaly.employee.matricule || '',
                    anomaly.employee.department?.name || '',
                    anomaly.employee.site?.name || '',
                    anomaly.anomalyType || '',
                    (anomaly.anomalyNote || '').replace(/,/g, ';'),
                    anomaly.isCorrected ? 'Corrigé' : 'Non corrigé',
                    anomaly.correctedBy || '',
                    anomaly.correctedAt ? new Date(anomaly.correctedAt).toISOString().split('T')[0] : '',
                ].join(','));
            });
            return csvRows.join('\n');
        }
        else {
            return anomalies.map((anomaly) => ({
                date: new Date(anomaly.timestamp).toISOString().split('T')[0],
                time: new Date(anomaly.timestamp).toTimeString().split(' ')[0],
                employee: `${anomaly.employee.firstName} ${anomaly.employee.lastName}`,
                matricule: anomaly.employee.matricule || '',
                department: anomaly.employee.department?.name || '',
                site: anomaly.employee.site?.name || '',
                anomalyType: anomaly.anomalyType || '',
                note: anomaly.anomalyNote || '',
                status: anomaly.isCorrected ? 'Corrigé' : 'Non corrigé',
                correctedBy: anomaly.correctedBy || '',
                correctedAt: anomaly.correctedAt ? new Date(anomaly.correctedAt).toISOString() : '',
            }));
        }
    }
    async getAnomaliesDashboard(tenantId, startDate, endDate, userId, userPermissions) {
        const where = {
            tenantId,
            hasAnomaly: true,
            timestamp: {
                gte: startDate,
                lte: endDate,
            },
        };
        const hasViewAll = userPermissions?.includes('attendance.view_all');
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type !== null) {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return this.getEmptyDashboard();
                }
                where.employeeId = { in: managedEmployeeIds };
            }
        }
        const [totalAnomalies, correctedAnomalies, pendingAnomalies, byType, byEmployee, byDay,] = await Promise.all([
            this.prisma.attendance.count({ where }),
            this.prisma.attendance.count({
                where: { ...where, isCorrected: true },
            }),
            this.prisma.attendance.count({
                where: { ...where, isCorrected: false },
            }),
            this.prisma.attendance.groupBy({
                by: ['anomalyType'],
                where,
                _count: { id: true },
            }),
            this.prisma.attendance.groupBy({
                by: ['employeeId'],
                where,
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
            this.prisma.attendance.groupBy({
                by: ['timestamp'],
                where: {
                    ...where,
                    timestamp: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        lte: endDate,
                    },
                },
                _count: { id: true },
            }),
        ]);
        const employeeIds = byEmployee.map((e) => e.employeeId);
        const employees = await this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
            },
        });
        const byEmployeeEnriched = byEmployee.map((item) => {
            const employee = employees.find((e) => e.id === item.employeeId);
            return {
                employeeId: item.employeeId,
                employeeName: employee
                    ? `${employee.firstName} ${employee.lastName}`
                    : 'Inconnu',
                matricule: employee?.matricule || '',
                count: item._count.id,
            };
        });
        return {
            summary: {
                total: totalAnomalies,
                corrected: correctedAnomalies,
                pending: pendingAnomalies,
                correctionRate: totalAnomalies > 0 ? (correctedAnomalies / totalAnomalies) * 100 : 0,
            },
            byType: byType.map((item) => ({
                type: item.anomalyType || 'UNKNOWN',
                count: item._count.id,
            })),
            byEmployee: byEmployeeEnriched,
            byDay: byDay.map((item) => ({
                date: new Date(item.timestamp).toISOString().split('T')[0],
                count: item._count.id,
            })),
        };
    }
    getEmptyDashboard() {
        return {
            summary: {
                total: 0,
                corrected: 0,
                pending: 0,
                correctionRate: 0,
            },
            byType: [],
            byEmployee: [],
            byDay: [],
        };
    }
    getAnomalyPriority(anomalyType) {
        const priorities = {
            INSUFFICIENT_REST: 10,
            ABSENCE: 9,
            ABSENCE_PARTIAL: 8,
            ABSENCE_TECHNICAL: 7,
            MISSING_OUT: 8,
            MISSING_IN: 7,
            LATE: 6,
            EARLY_LEAVE: 5,
            DOUBLE_IN: 4,
            PRESENCE_EXTERNE: 0,
        };
        return priorities[anomalyType || ''] || 1;
    }
    async calculateAnomalyScore(tenantId, employeeId, anomalyType, timestamp, hasJustification) {
        let score = this.getAnomalyPriority(anomalyType || null);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentAnomalies = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId,
                hasAnomaly: true,
                anomalyType: anomalyType || null,
                timestamp: { gte: thirtyDaysAgo },
            },
        });
        const frequencyBonus = Math.min(recentAnomalies * 0.5, 5);
        score += frequencyBonus;
        if (!hasJustification) {
            score += 1;
        }
        const totalAnomalies = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId,
                hasAnomaly: true,
                timestamp: { gte: thirtyDaysAgo },
            },
        });
        if (totalAnomalies > 10) {
            score += 2;
        }
        else if (totalAnomalies > 5) {
            score += 1;
        }
        return Math.min(score, 20);
    }
    async getCorrectionHistory(tenantId, attendanceId) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id: attendanceId, tenantId },
            select: {
                id: true,
                createdAt: true,
                correctedBy: true,
                correctedAt: true,
                correctionNote: true,
                isCorrected: true,
                approvalStatus: true,
                approvedBy: true,
                approvedAt: true,
                timestamp: true,
                rawData: true,
            },
        });
        if (!attendance) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
        const history = [];
        history.push({
            action: 'CREATED',
            timestamp: attendance.createdAt,
            note: 'Pointage créé',
        });
        if (attendance.isCorrected && attendance.correctedAt) {
            const correctedBy = attendance.correctedBy
                ? await this.prisma.user.findUnique({
                    where: { id: attendance.correctedBy },
                    select: { firstName: true, lastName: true },
                })
                : null;
            history.push({
                action: 'CORRECTED',
                timestamp: attendance.correctedAt,
                correctedBy: attendance.correctedBy,
                correctedByName: correctedBy
                    ? `${correctedBy.firstName} ${correctedBy.lastName}`
                    : null,
                correctionNote: attendance.correctionNote,
            });
        }
        if (attendance.approvalStatus && attendance.approvedAt) {
            const approvedBy = attendance.approvedBy
                ? await this.prisma.user.findUnique({
                    where: { id: attendance.approvedBy },
                    select: { firstName: true, lastName: true },
                })
                : null;
            history.push({
                action: 'APPROVED',
                timestamp: attendance.approvedAt,
                approvedBy: attendance.approvedBy,
                approvedByName: approvedBy
                    ? `${approvedBy.firstName} ${approvedBy.lastName}`
                    : null,
                approvalStatus: attendance.approvalStatus,
            });
        }
        return history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async bulkCorrect(tenantId, corrections, generalNote, correctedBy, userId, userPermissions) {
        return this.bulkCorrectAttendance(tenantId, {
            attendances: corrections,
            generalNote,
            correctedBy,
        });
    }
    async getAnomaliesAnalytics(tenantId, startDate, endDate, filters) {
        const start = new Date(startDate + 'T00:00:00.000Z');
        const end = new Date(endDate + 'T23:59:59.999Z');
        const where = {
            tenantId,
            hasAnomaly: true,
            timestamp: { gte: start, lte: end },
        };
        if (filters?.employeeId)
            where.employeeId = filters.employeeId;
        if (filters?.departmentId) {
            where.employee = { departmentId: filters.departmentId };
        }
        if (filters?.siteId)
            where.siteId = filters.siteId;
        if (filters?.anomalyType)
            where.anomalyType = filters.anomalyType;
        const byType = await this.prisma.attendance.groupBy({
            by: ['anomalyType'],
            where,
            _count: { id: true },
        });
        const byEmployee = await this.prisma.attendance.groupBy({
            by: ['employeeId'],
            where,
            _count: { id: true },
            _avg: { hoursWorked: true },
        });
        const byDepartment = await this.prisma.attendance.groupBy({
            by: ['siteId'],
            where: {
                ...where,
                employee: filters?.departmentId ? { departmentId: filters.departmentId } : undefined,
            },
            _count: { id: true },
        });
        const correctedAnomalies = await this.prisma.attendance.findMany({
            where: {
                ...where,
                isCorrected: true,
                correctedAt: { not: null },
            },
            select: {
                createdAt: true,
                correctedAt: true,
            },
        });
        const avgResolutionTime = correctedAnomalies.length > 0
            ? correctedAnomalies.reduce((sum, a) => {
                const resolutionTime = a.correctedAt
                    ? (a.correctedAt.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60)
                    : 0;
                return sum + resolutionTime;
            }, 0) / correctedAnomalies.length
            : 0;
        const dailyTrends = await this.prisma.$queryRaw `
      SELECT DATE(timestamp) as date, COUNT(*)::bigint as count
      FROM "Attendance"
      WHERE "tenantId" = ${tenantId}
        AND "hasAnomaly" = true
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;
        const dayOfWeekPatterns = await this.prisma.$queryRaw `
      SELECT EXTRACT(DOW FROM timestamp)::int as "dayOfWeek", COUNT(*)::bigint as count
      FROM "Attendance"
      WHERE "tenantId" = ${tenantId}
        AND "hasAnomaly" = true
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY EXTRACT(DOW FROM timestamp)
      ORDER BY "dayOfWeek" ASC
    `;
        return {
            summary: {
                total: await this.prisma.attendance.count({ where }),
                corrected: await this.prisma.attendance.count({
                    where: { ...where, isCorrected: true },
                }),
                pending: await this.prisma.attendance.count({
                    where: { ...where, isCorrected: false },
                }),
                avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
            },
            byType: byType.map(item => ({
                type: item.anomalyType,
                count: item._count.id,
            })),
            byEmployee: await Promise.all(byEmployee.map(async (item) => {
                const employee = await this.prisma.employee.findUnique({
                    where: { id: item.employeeId },
                    select: { firstName: true, lastName: true, matricule: true },
                });
                return {
                    employeeId: item.employeeId,
                    employeeName: employee
                        ? `${employee.firstName} ${employee.lastName}`
                        : 'Unknown',
                    matricule: employee?.matricule,
                    count: item._count.id,
                };
            })),
            byDepartment: byDepartment.map(item => ({
                siteId: item.siteId,
                count: item._count.id,
            })),
            trends: dailyTrends.map(item => ({
                date: item.date,
                count: Number(item.count),
            })),
            dayOfWeekPatterns: dayOfWeekPatterns.map(item => ({
                dayOfWeek: item.dayOfWeek,
                dayName: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][item.dayOfWeek],
                count: Number(item.count),
            })),
        };
    }
    async getMonthlyAnomaliesReport(tenantId, year, month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        const anomalies = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                hasAnomaly: true,
                timestamp: { gte: start, lte: end },
            },
            include: {
                employee: {
                    include: {
                        department: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        const byDepartment = anomalies.reduce((acc, anomaly) => {
            const deptId = anomaly.employee.department?.id || 'unknown';
            const deptName = anomaly.employee.department?.name || 'Non assigné';
            if (!acc[deptId]) {
                acc[deptId] = {
                    departmentId: deptId,
                    departmentName: deptName,
                    total: 0,
                    byType: {},
                    corrected: 0,
                    pending: 0,
                };
            }
            acc[deptId].total++;
            acc[deptId].byType[anomaly.anomalyType || 'UNKNOWN'] =
                (acc[deptId].byType[anomaly.anomalyType || 'UNKNOWN'] || 0) + 1;
            if (anomaly.isCorrected) {
                acc[deptId].corrected++;
            }
            else {
                acc[deptId].pending++;
            }
            return acc;
        }, {});
        return {
            period: { year, month },
            summary: {
                total: anomalies.length,
                corrected: anomalies.filter(a => a.isCorrected).length,
                pending: anomalies.filter(a => !a.isCorrected).length,
            },
            byDepartment: Object.values(byDepartment),
        };
    }
    async getHighAnomalyRateEmployees(tenantId, threshold = 5, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const employees = await this.prisma.employee.findMany({
            where: { tenantId, isActive: true },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        const results = await Promise.all(employees.map(async (employee) => {
            const anomalyCount = await this.prisma.attendance.count({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    hasAnomaly: true,
                    timestamp: { gte: startDate },
                },
            });
            if (anomalyCount >= threshold) {
                return {
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    matricule: employee.matricule,
                    department: employee.department?.name,
                    anomalyCount,
                    recommendation: this.generateRecommendation(anomalyCount),
                };
            }
            return null;
        }));
        return results.filter(r => r !== null);
    }
    async detectHolidayWork(tenantId, employeeId, timestamp, type) {
        const timestampDate = new Date(timestamp);
        const dateOnly = new Date(Date.UTC(timestampDate.getFullYear(), timestampDate.getMonth(), timestampDate.getDate(), 0, 0, 0, 0));
        console.log(`[detectHolidayWork] Checking ${type} at ${timestamp.toISOString()}, dateOnly: ${dateOnly.toISOString()}`);
        const holiday = await this.prisma.holiday.findFirst({
            where: {
                tenantId,
                date: dateOnly,
            },
        });
        console.log(`[detectHolidayWork] Holiday found: ${holiday ? `${holiday.name} (${holiday.date.toISOString()})` : 'NONE'}`);
        if (!holiday) {
            return { hasAnomaly: false };
        }
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                holidayOvertimeEnabled: true,
                holidayOvertimeRate: true,
                holidayOvertimeAsNormalHours: true,
            },
        });
        const holidayOvertimeEnabled = settings?.holidayOvertimeEnabled !== false;
        if (type === client_2.AttendanceType.OUT) {
            const previousDay = new Date(timestamp);
            previousDay.setDate(previousDay.getDate() - 1);
            previousDay.setHours(0, 0, 0, 0);
            const previousDayEnd = new Date(previousDay);
            previousDayEnd.setHours(23, 59, 59, 999);
            const inRecord = await this.prisma.attendance.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    type: client_2.AttendanceType.IN,
                    timestamp: {
                        gte: previousDay,
                        lte: previousDayEnd,
                    },
                },
                orderBy: { timestamp: 'desc' },
            });
            if (inRecord) {
                const previousDaySchedule = await this.prisma.schedule.findFirst({
                    where: {
                        tenantId,
                        employeeId,
                        date: {
                            gte: previousDay,
                            lte: previousDayEnd,
                        },
                        status: 'PUBLISHED',
                    },
                    include: {
                        shift: true,
                    },
                });
                if (previousDaySchedule) {
                    const expectedEndTime = this.parseTimeString(previousDaySchedule.customEndTime || previousDaySchedule.shift.endTime);
                    const isNightShift = this.isNightShift(previousDaySchedule.shift, expectedEndTime);
                    if (isNightShift) {
                        const midnightHolidayDate = new Date(holiday.date);
                        midnightHolidayDate.setHours(0, 0, 0, 0);
                        const hoursOnHoliday = (timestamp.getTime() - midnightHolidayDate.getTime()) / (1000 * 60 * 60);
                        const hoursDisplay = Math.floor(hoursOnHoliday);
                        const minutesDisplay = Math.round((hoursOnHoliday - hoursDisplay) * 60);
                        let note = `Shift de nuit traversant le jour férié "${holiday.name}" (${holiday.date.toLocaleDateString('fr-FR')}).`;
                        if (holidayOvertimeEnabled) {
                            note += ` De 00:00 à ${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')} = ${hoursDisplay}h${minutesDisplay.toString().padStart(2, '0')} potentiellement majorées.`;
                        }
                        return {
                            hasAnomaly: true,
                            type: 'JOUR_FERIE_TRAVAILLE',
                            note,
                        };
                    }
                }
            }
        }
        let note = `Pointage effectué le jour férié "${holiday.name}" (${holiday.date.toLocaleDateString('fr-FR')}).`;
        if (holidayOvertimeEnabled) {
            note += ` Les heures travaillées seront potentiellement majorées.`;
        }
        return {
            hasAnomaly: true,
            type: 'JOUR_FERIE_TRAVAILLE',
            note,
        };
    }
    generateRecommendation(anomalyCount) {
        if (anomalyCount >= 10) {
            return 'Formation urgente requise - Vérifier le badge et le processus de pointage';
        }
        else if (anomalyCount >= 5) {
            return 'Formation recommandée - Rappel des procédures de pointage';
        }
        else {
            return 'Surveillance recommandée - Vérifier les patterns récurrents';
        }
    }
    async createTechnicalAnomaly(tenantId, employeeId, data) {
        return this.prisma.attendanceAnomaly.create({
            data: {
                tenantId,
                employeeId,
                type: 'TECHNICAL',
                subType: data.subType,
                description: data.description,
                severity: data.severity || 'MEDIUM',
                occurredAt: data.occurredAt || new Date(),
                deviceId: data.deviceId,
                attendanceId: data.attendanceId,
                scheduleId: data.scheduleId,
                metadata: data.metadata,
                status: 'OPEN',
            },
        });
    }
    async detectDeviceFailures(tenantId, deviceId) {
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        const failedAttempts = await this.prisma.attendanceAttempt.findMany({
            where: {
                tenantId,
                deviceId,
                status: 'FAILED',
                timestamp: { gte: oneHourAgo },
            },
            include: {
                employee: true,
            },
        });
        if (failedAttempts.length >= 5) {
            const device = await this.prisma.attendanceDevice.findUnique({
                where: { id: deviceId },
            });
            const byEmployee = failedAttempts.reduce((acc, attempt) => {
                if (!acc[attempt.employeeId]) {
                    acc[attempt.employeeId] = [];
                }
                acc[attempt.employeeId].push(attempt);
                return acc;
            }, {});
            for (const [employeeId, attempts] of Object.entries(byEmployee)) {
                const existingAnomaly = await this.prisma.attendanceAnomaly.findFirst({
                    where: {
                        tenantId,
                        employeeId,
                        deviceId,
                        type: 'TECHNICAL',
                        subType: 'DEVICE_FAILURE',
                        detectedAt: { gte: oneHourAgo },
                    },
                });
                if (!existingAnomaly) {
                    await this.createTechnicalAnomaly(tenantId, employeeId, {
                        subType: 'DEVICE_FAILURE',
                        description: `${attempts.length} tentatives de pointage échouées sur le terminal "${device?.name || deviceId}". Codes d'erreur: ${[...new Set(attempts.map((a) => a.errorCode))].join(', ')}`,
                        severity: attempts.length >= 10 ? 'HIGH' : 'MEDIUM',
                        deviceId,
                        occurredAt: attempts[0].timestamp,
                        metadata: {
                            failedAttemptsCount: attempts.length,
                            errorCodes: [...new Set(attempts.map((a) => a.errorCode))],
                            firstFailure: attempts[attempts.length - 1].timestamp,
                            lastFailure: attempts[0].timestamp,
                        },
                    });
                }
            }
        }
    }
    async detectOfflineDevices(tenantId) {
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        const offlineDevices = await this.prisma.attendanceDevice.findMany({
            where: {
                tenantId,
                isActive: true,
                OR: [
                    { lastSync: { lt: oneHourAgo } },
                    { lastSync: null },
                ],
            },
        });
        for (const device of offlineDevices) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const scheduledEmployees = await this.prisma.schedule.findMany({
                where: {
                    tenantId,
                    date: today,
                    status: 'PUBLISHED',
                    employee: {
                        siteId: device.siteId,
                    },
                },
                include: {
                    employee: true,
                },
            });
            for (const schedule of scheduledEmployees) {
                const hasAttendance = await this.prisma.attendance.findFirst({
                    where: {
                        tenantId,
                        employeeId: schedule.employeeId,
                        timestamp: { gte: today },
                    },
                });
                if (!hasAttendance) {
                    const existingAnomaly = await this.prisma.attendanceAnomaly.findFirst({
                        where: {
                            tenantId,
                            employeeId: schedule.employeeId,
                            deviceId: device.id,
                            type: 'TECHNICAL',
                            subType: 'DEVICE_OFFLINE',
                            detectedAt: { gte: today },
                        },
                    });
                    if (!existingAnomaly) {
                        await this.createTechnicalAnomaly(tenantId, schedule.employeeId, {
                            subType: 'DEVICE_OFFLINE',
                            description: `Le terminal "${device.name}" est hors ligne depuis ${device.lastSync ? device.lastSync.toLocaleString('fr-FR') : 'inconnu'}. L'employé n'a pas pu pointer.`,
                            severity: 'HIGH',
                            deviceId: device.id,
                            scheduleId: schedule.id,
                            metadata: {
                                deviceName: device.name,
                                lastSync: device.lastSync,
                                siteId: device.siteId,
                            },
                        });
                    }
                }
            }
        }
    }
    async resolveAnomaly(anomalyId, resolvedBy, resolution) {
        return this.prisma.attendanceAnomaly.update({
            where: { id: anomalyId },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolvedBy,
                resolution,
            },
        });
    }
    async getOpenTechnicalAnomalies(tenantId, filters) {
        return this.prisma.attendanceAnomaly.findMany({
            where: {
                tenantId,
                type: 'TECHNICAL',
                status: { in: ['OPEN', 'INVESTIGATING'] },
                ...(filters?.employeeId && { employeeId: filters.employeeId }),
                ...(filters?.deviceId && { deviceId: filters.deviceId }),
                ...(filters?.severity && { severity: filters.severity }),
            },
            include: {
                employee: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, email: true },
                        },
                        department: true,
                    },
                },
                device: true,
                schedule: { include: { shift: true } },
            },
            orderBy: [
                { severity: 'desc' },
                { detectedAt: 'desc' },
            ],
            take: filters?.limit || 100,
        });
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map