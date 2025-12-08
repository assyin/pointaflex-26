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
const matricule_util_1 = require("../../common/utils/matricule.util");
let AttendanceService = class AttendanceService {
    constructor(prisma) {
        this.prisma = prisma;
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
        const anomaly = await this.detectAnomalies(tenantId, createAttendanceDto.employeeId, new Date(createAttendanceDto.timestamp), createAttendanceDto.type);
        return this.prisma.attendance.create({
            data: {
                ...createAttendanceDto,
                tenantId,
                timestamp: new Date(createAttendanceDto.timestamp),
                hasAnomaly: anomaly.hasAnomaly,
                anomalyType: anomaly.type,
                anomalyNote: anomaly.note,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        photo: true,
                    },
                },
                site: true,
                device: true,
            },
        });
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
                employee = await (0, matricule_util_1.findEmployeeByMatriculeFlexible)(this.prisma, tenantId, webhookData.employeeId);
            }
            catch (error) {
                console.error(`[AttendanceService] Erreur lors de la recherche flexible du matricule ${webhookData.employeeId}:`, error);
            }
        }
        if (!employee) {
            throw new common_1.NotFoundException(`Employee ${webhookData.employeeId} not found`);
        }
        const anomaly = await this.detectAnomalies(tenantId, employee.id, new Date(webhookData.timestamp), webhookData.type);
        await this.prisma.attendanceDevice.update({
            where: { id: device.id },
            data: { lastSync: new Date() },
        });
        return this.prisma.attendance.create({
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
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async findAll(tenantId, filters) {
        const where = { tenantId };
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
        return this.prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        photo: true,
                        currentShift: true,
                    },
                },
                site: true,
                device: true,
            },
            orderBy: { timestamp: 'desc' },
            take: 1000,
        });
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
        return this.prisma.attendance.update({
            where: { id },
            data: {
                isCorrected: true,
                correctedBy: correctionDto.correctedBy,
                correctedAt: new Date(),
                anomalyNote: correctionDto.correctionNote,
                timestamp: correctionDto.correctedTimestamp
                    ? new Date(correctionDto.correctedTimestamp)
                    : attendance.timestamp,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async getAnomalies(tenantId, date) {
        const where = {
            tenantId,
            hasAnomaly: true,
            isCorrected: false,
        };
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
        return this.prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        photo: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
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
                    type: client_1.AttendanceType.IN,
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
        if (type === client_1.AttendanceType.IN) {
            const hasIn = todayRecords.some(r => r.type === client_1.AttendanceType.IN);
            if (hasIn) {
                return {
                    hasAnomaly: true,
                    type: 'DOUBLE_IN',
                    note: 'Double pointage d\'entrée détecté',
                };
            }
        }
        if (type === client_1.AttendanceType.OUT) {
            const hasIn = todayRecords.some(r => r.type === client_1.AttendanceType.IN);
            if (!hasIn) {
                return {
                    hasAnomaly: true,
                    type: 'MISSING_IN',
                    note: 'Pointage de sortie sans entrée',
                };
            }
        }
        return { hasAnomaly: false };
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map