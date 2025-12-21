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
    async create(tenantId, createAttendanceDto) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: createAttendanceDto.employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        await this.validateBreakPunch(tenantId, createAttendanceDto.type);
        const anomaly = await this.detectAnomalies(tenantId, createAttendanceDto.employeeId, new Date(createAttendanceDto.timestamp), createAttendanceDto.type);
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
        return attendance;
    }
    async handleWebhook(tenantId, deviceId, webhookData) {
        const device = await this.prisma.attendanceDevice.findFirst({
            where: { deviceId, tenantId },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
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
        await this.validateBreakPunch(tenantId, webhookData.type);
        const anomaly = await this.detectAnomalies(tenantId, employee.id, new Date(webhookData.timestamp), webhookData.type);
        const metrics = await this.calculateMetrics(tenantId, employee.id, new Date(webhookData.timestamp), webhookData.type);
        await this.prisma.attendanceDevice.update({
            where: { id: device.id },
            data: { lastSync: new Date() },
        });
        const attendance = await this.prisma.attendance.create({
            data: {
                tenantId,
                employeeId: employee.id,
                deviceId: device.id,
                siteId: device.siteId,
                timestamp: new Date(webhookData.timestamp),
                type: webhookData.type,
                method: webhookData.method,
                rawData: webhookData.rawData,
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
        return attendance;
    }
    async findAll(tenantId, filters, userId, userPermissions) {
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('attendance.view_all');
        const hasViewOwn = userPermissions?.includes('attendance.view_own');
        const hasViewTeam = userPermissions?.includes('attendance.view_team');
        const hasViewDepartment = userPermissions?.includes('attendance.view_department');
        const hasViewSite = userPermissions?.includes('attendance.view_site');
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
        if (filters?.startDate || filters?.endDate) {
            where.timestamp = {};
            if (filters.startDate) {
                where.timestamp.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                where.timestamp.lte = endDate;
            }
        }
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const skip = (page - 1) * limit;
        const shouldPaginate = filters?.page !== undefined || filters?.limit !== undefined;
        const maxLimit = shouldPaginate ? limit : Math.min(limit, 1000);
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
        if (shouldPaginate) {
            return {
                data,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        return data;
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
    async correctAttendance(tenantId, id, correctionDto) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { id, tenantId },
        });
        if (!attendance) {
            throw new common_1.NotFoundException(`Attendance record ${id} not found`);
        }
        const newTimestamp = correctionDto.correctedTimestamp
            ? new Date(correctionDto.correctedTimestamp)
            : attendance.timestamp;
        const anomaly = await this.detectAnomalies(tenantId, attendance.employeeId, newTimestamp, attendance.type);
        const metrics = await this.calculateMetrics(tenantId, attendance.employeeId, newTimestamp, attendance.type);
        const needsApproval = correctionDto.forceApproval
            ? false
            : this.requiresApproval(attendance, newTimestamp, correctionDto.correctionNote);
        const updatedAttendance = await this.prisma.attendance.update({
            where: { id },
            data: {
                isCorrected: !needsApproval,
                correctedBy: correctionDto.correctedBy,
                correctedAt: needsApproval ? null : new Date(),
                correctionNote: correctionDto.correctionNote,
                timestamp: newTimestamp,
                hasAnomaly: anomaly.hasAnomaly,
                anomalyType: anomaly.type,
                hoursWorked: metrics.hoursWorked ? new library_1.Decimal(metrics.hoursWorked) : null,
                lateMinutes: metrics.lateMinutes,
                earlyLeaveMinutes: metrics.earlyLeaveMinutes,
                overtimeMinutes: metrics.overtimeMinutes,
                needsApproval,
                approvalStatus: needsApproval ? 'PENDING_APPROVAL' : null,
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
        if (!needsApproval && updatedAttendance.employee.userId) {
            await this.notifyEmployeeOfCorrection(tenantId, updatedAttendance);
        }
        else if (needsApproval) {
            await this.notifyManagersOfApprovalRequired(tenantId, updatedAttendance);
        }
        return updatedAttendance;
    }
    requiresApproval(attendance, newTimestamp, correctionNote) {
        const timeDiff = Math.abs(newTimestamp.getTime() - attendance.timestamp.getTime()) / (1000 * 60 * 60);
        if (timeDiff > 2) {
            return true;
        }
        if (attendance.anomalyType === 'ABSENCE' || attendance.anomalyType === 'INSUFFICIENT_REST') {
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
        return anomalies.sort((a, b) => {
            const priorityA = this.getAnomalyPriority(a.anomalyType);
            const priorityB = this.getAnomalyPriority(b.anomalyType);
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
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
        if (type === client_2.AttendanceType.OUT) {
            const inRecord = todayRecords.find(r => r.type === client_2.AttendanceType.IN);
            if (inRecord) {
                const hoursWorked = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60 * 60);
                metrics.hoursWorked = Math.max(0, hoursWorked);
            }
        }
        if (type === client_2.AttendanceType.IN) {
            const schedule = await this.prisma.schedule.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    shift: true,
                },
            });
            if (schedule?.shift) {
                const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                const expectedStart = new Date(timestamp);
                expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
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
        if (type === client_2.AttendanceType.OUT) {
            const schedule = await this.prisma.schedule.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    shift: true,
                },
            });
            if (schedule?.shift) {
                const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                const expectedEnd = new Date(timestamp);
                expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: { earlyToleranceExit: true },
                });
                const toleranceMinutes = settings?.earlyToleranceExit || 5;
                const earlyLeaveMinutes = Math.max(0, (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60) - toleranceMinutes);
                if (earlyLeaveMinutes > 0) {
                    metrics.earlyLeaveMinutes = Math.round(earlyLeaveMinutes);
                }
            }
        }
        if (type === client_2.AttendanceType.OUT) {
            const inRecord = todayRecords.find(r => r.type === client_2.AttendanceType.IN);
            if (inRecord) {
                const schedule = await this.prisma.schedule.findFirst({
                    where: {
                        tenantId,
                        employeeId,
                        date: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },
                    include: {
                        shift: true,
                    },
                });
                if (schedule?.shift) {
                    const workedMinutes = (timestamp.getTime() - inRecord.timestamp.getTime()) / (1000 * 60);
                    const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                    const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                    const startMinutes = expectedStartTime.hours * 60 + expectedStartTime.minutes;
                    const endMinutes = expectedEndTime.hours * 60 + expectedEndTime.minutes;
                    let plannedMinutes = endMinutes - startMinutes;
                    if (plannedMinutes < 0) {
                        plannedMinutes += 24 * 60;
                    }
                    plannedMinutes -= schedule.shift.breakDuration || 60;
                    const overtimeMinutes = workedMinutes - plannedMinutes;
                    if (overtimeMinutes > 0) {
                        const settings = await this.prisma.tenantSettings.findUnique({
                            where: { tenantId },
                            select: { overtimeRounding: true },
                        });
                        const roundingMinutes = settings?.overtimeRounding || 15;
                        const overtimeHours = overtimeMinutes / 60;
                        const roundedHours = this.roundOvertimeHours(overtimeHours, roundingMinutes);
                        metrics.overtimeMinutes = Math.round(roundedHours * 60);
                    }
                }
            }
        }
        return metrics;
    }
    parseTimeString(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return { hours: hours || 0, minutes: minutes || 0 };
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
        if (type === client_2.AttendanceType.IN) {
            const hasIn = todayRecords.some(r => r.type === client_2.AttendanceType.IN);
            if (hasIn) {
                return {
                    hasAnomaly: true,
                    type: 'DOUBLE_IN',
                    note: 'Double pointage d\'entrée détecté',
                };
            }
        }
        if (type === client_2.AttendanceType.OUT) {
            const hasIn = todayRecords.some(r => r.type === client_2.AttendanceType.IN);
            if (!hasIn) {
                return {
                    hasAnomaly: true,
                    type: 'MISSING_IN',
                    note: 'Pointage de sortie sans entrée',
                };
            }
        }
        if (type === client_2.AttendanceType.IN) {
            const inRecords = todayRecords.filter(r => r.type === client_2.AttendanceType.IN);
            const outRecords = todayRecords.filter(r => r.type === client_2.AttendanceType.OUT);
            if (inRecords.length > outRecords.length) {
                return {
                    hasAnomaly: true,
                    type: 'MISSING_OUT',
                    note: 'Entrée détectée sans sortie correspondante',
                };
            }
        }
        if (type === client_2.AttendanceType.IN) {
            const schedule = await this.prisma.schedule.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    shift: true,
                },
            });
            if (schedule?.shift) {
                const expectedStartTime = this.parseTimeString(schedule.customStartTime || schedule.shift.startTime);
                const expectedStart = new Date(timestamp);
                expectedStart.setHours(expectedStartTime.hours, expectedStartTime.minutes, 0, 0);
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: { lateToleranceEntry: true },
                });
                const toleranceMinutes = settings?.lateToleranceEntry || 10;
                const lateMinutes = (timestamp.getTime() - expectedStart.getTime()) / (1000 * 60);
                if (lateMinutes > toleranceMinutes) {
                    return {
                        hasAnomaly: true,
                        type: 'LATE',
                        note: `Retard de ${Math.round(lateMinutes)} minutes détecté`,
                    };
                }
            }
            else {
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: { workingDays: true },
                });
                const dayOfWeek = timestamp.getDay();
                const workingDays = settings?.workingDays || [1, 2, 3, 4, 5, 6];
                if (workingDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
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
                            type: 'ABSENCE',
                            note: 'Absence détectée : pointage sans planning ni congé approuvé',
                        };
                    }
                }
            }
        }
        if (type === client_2.AttendanceType.OUT) {
            const schedule = await this.prisma.schedule.findFirst({
                where: {
                    tenantId,
                    employeeId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
                },
                include: {
                    shift: true,
                },
            });
            if (schedule?.shift) {
                const expectedEndTime = this.parseTimeString(schedule.customEndTime || schedule.shift.endTime);
                const expectedEnd = new Date(timestamp);
                expectedEnd.setHours(expectedEndTime.hours, expectedEndTime.minutes, 0, 0);
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: { earlyToleranceExit: true },
                });
                const toleranceMinutes = settings?.earlyToleranceExit || 5;
                const earlyLeaveMinutes = (expectedEnd.getTime() - timestamp.getTime()) / (1000 * 60);
                if (earlyLeaveMinutes > toleranceMinutes) {
                    return {
                        hasAnomaly: true,
                        type: 'EARLY_LEAVE',
                        note: `Départ anticipé de ${Math.round(earlyLeaveMinutes)} minutes détecté`,
                    };
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
                const restHours = (timestamp.getTime() - lastOutRecord.timestamp.getTime()) / (1000 * 60 * 60);
                const settings = await this.prisma.tenantSettings.findUnique({
                    where: { tenantId },
                    select: { alertInsufficientRest: true },
                });
                const schedule = await this.prisma.schedule.findFirst({
                    where: {
                        tenantId,
                        employeeId,
                        date: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },
                    include: {
                        shift: true,
                    },
                });
                const isNightShift = schedule?.shift?.isNightShift || false;
                const minimumRestHours = isNightShift ? 12 : 11;
                if (restHours < minimumRestHours) {
                    return {
                        hasAnomaly: true,
                        type: 'INSUFFICIENT_REST',
                        note: `Repos insuffisant détecté : ${restHours.toFixed(2)}h de repos (minimum requis: ${minimumRestHours}h)`,
                    };
                }
            }
        }
        if (type === client_2.AttendanceType.MISSION_START || type === client_2.AttendanceType.MISSION_END) {
            return { hasAnomaly: false };
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
    async getCorrectionHistory(tenantId, attendanceId) {
        const attendance = await this.prisma.attendance.findFirst({
            where: {
                id: attendanceId,
                tenantId,
            },
            select: {
                id: true,
                isCorrected: true,
                correctedBy: true,
                correctedAt: true,
                correctionNote: true,
                approvalStatus: true,
                approvedBy: true,
                approvedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!attendance) {
            throw new common_1.NotFoundException(`Attendance record ${attendanceId} not found`);
        }
        const history = [];
        if (attendance.isCorrected && attendance.correctedBy && attendance.correctedAt) {
            history.push({
                id: attendance.id,
                action: attendance.approvalStatus === 'PENDING_APPROVAL' ? 'Correction soumise' : 'Correction appliquée',
                correctedBy: attendance.correctedBy,
                correctedAt: attendance.correctedAt,
                correctionNote: attendance.correctionNote || '',
                approvalStatus: attendance.approvalStatus || undefined,
                approvedBy: attendance.approvedBy || undefined,
                approvedAt: attendance.approvedAt || undefined,
            });
        }
        if (attendance.approvalStatus === 'APPROVED' && attendance.approvedBy && attendance.approvedAt) {
            history.push({
                id: attendance.id,
                action: 'Approbation',
                correctedBy: attendance.approvedBy,
                correctedAt: attendance.approvedAt,
                correctionNote: attendance.correctionNote || '',
                approvalStatus: 'APPROVED',
                approvedBy: attendance.approvedBy,
                approvedAt: attendance.approvedAt,
            });
        }
        return history.sort((a, b) => b.correctedAt.getTime() - a.correctedAt.getTime());
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
                where.timestamp.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                where.timestamp.lte = endDate;
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
            MISSING_OUT: 8,
            MISSING_IN: 7,
            LATE: 6,
            EARLY_LEAVE: 5,
            DOUBLE_IN: 4,
        };
        return priorities[anomalyType || ''] || 1;
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map