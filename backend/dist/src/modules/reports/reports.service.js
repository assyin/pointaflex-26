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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats(tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const totalEmployees = await this.prisma.employee.count({
            where: { tenantId, isActive: true },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const activeToday = await this.prisma.attendance.groupBy({
            by: ['employeeId'],
            where: {
                tenantId,
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
                type: client_1.AttendanceType.IN,
            },
        });
        const pendingLeaves = await this.prisma.leave.count({
            where: {
                tenantId,
                status: {
                    in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED],
                },
            },
        });
        const pendingOvertime = await this.prisma.overtime.count({
            where: {
                tenantId,
                status: client_1.OvertimeStatus.PENDING,
            },
        });
        const attendanceCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const anomaliesCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                hasAnomaly: true,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.OvertimeStatus.APPROVED,
            },
            _sum: {
                hours: true,
            },
            _count: {
                id: true,
            },
        });
        const leaveStats = await this.prisma.leave.aggregate({
            where: {
                tenantId,
                startDate: {
                    gte: startDate,
                },
                endDate: {
                    lte: endDate,
                },
                status: {
                    in: [client_1.LeaveStatus.APPROVED, client_1.LeaveStatus.HR_APPROVED],
                },
            },
            _sum: {
                days: true,
            },
            _count: {
                id: true,
            },
        });
        const attendanceRate = totalEmployees > 0
            ? ((activeToday.length / totalEmployees) * 100).toFixed(1)
            : 0;
        const last7Days = [];
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const dayAttendance = await this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    timestamp: { gte: date, lt: nextDate },
                    type: client_1.AttendanceType.IN,
                },
                select: { employeeId: true, hasAnomaly: true, anomalyType: true },
            });
            const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
            const absent = totalEmployees - new Set(dayAttendance.map(a => a.employeeId)).size;
            last7Days.push({
                day: dayNames[date.getDay()],
                date: date.toISOString().split('T')[0],
                retards: late,
                absences: absent,
            });
        }
        const shifts = await this.prisma.shift.findMany({
            where: { tenantId },
            select: { id: true, name: true, _count: { select: { employees: true } } },
        });
        const shiftDistribution = shifts.map(shift => ({
            name: shift.name,
            value: shift._count.employees,
        }));
        const overtimeTrend = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (7 * (i + 1)));
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - (7 * i));
            const weekOvertime = await this.prisma.overtime.aggregate({
                where: {
                    tenantId,
                    date: { gte: weekStart, lt: weekEnd },
                    status: client_1.OvertimeStatus.APPROVED,
                },
                _sum: { hours: true },
            });
            overtimeTrend.push({
                semaine: `S${4 - i}`,
                heures: weekOvertime._sum.hours || 0,
            });
        }
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const lateCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                timestamp: { gte: sevenDaysAgo },
                hasAnomaly: true,
                anomalyType: { contains: 'LATE' },
            },
        });
        return {
            attendanceRate: Number(attendanceRate),
            lates: lateCount,
            totalPointages: attendanceCount,
            overtimeHours: overtimeStats._sum.hours || 0,
            employees: {
                total: totalEmployees,
                activeToday: activeToday.length,
                onLeave: 0,
            },
            pendingApprovals: {
                leaves: pendingLeaves,
                overtime: pendingOvertime,
            },
            attendance: {
                total: attendanceCount,
                anomalies: anomaliesCount,
                anomalyRate: attendanceCount > 0 ? ((anomaliesCount / attendanceCount) * 100).toFixed(2) : 0,
            },
            overtime: {
                totalRecords: overtimeStats._count.id,
                totalHours: overtimeStats._sum.hours || 0,
            },
            leaves: {
                totalRequests: leaveStats._count.id,
                totalDays: leaveStats._sum.days || 0,
                current: pendingLeaves,
            },
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            weeklyAttendance: last7Days,
            shiftDistribution,
            overtimeTrend,
            anomalies: anomaliesCount,
        };
    }
    async getAttendanceReport(tenantId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        const where = {
            tenantId,
            timestamp: {
                gte: startDate,
                lte: endDate,
            },
        };
        if (dto.employeeId) {
            where.employeeId = dto.employeeId;
        }
        if (dto.departmentId) {
            where.employee = {
                departmentId: dto.departmentId,
            };
        }
        if (dto.teamId) {
            where.employee = {
                ...where.employee,
                teamId: dto.teamId,
            };
        }
        const attendance = await this.prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        department: {
                            select: {
                                name: true,
                            },
                        },
                        team: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                site: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [
                { timestamp: 'desc' },
                { employee: { lastName: 'asc' } },
            ],
        });
        return {
            data: attendance,
            summary: {
                total: attendance.length,
                anomalies: attendance.filter(a => a.hasAnomaly).length,
                period: {
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                },
            },
        };
    }
    async getEmployeeReport(tenantId, employeeId, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: employeeId,
                tenantId,
            },
            include: {
                department: true,
                team: true,
                site: true,
                currentShift: true,
            },
        });
        if (!employee) {
            throw new Error('Employee not found');
        }
        const attendanceStats = await this.prisma.attendance.groupBy({
            by: ['type'],
            where: {
                tenantId,
                employeeId,
                timestamp: {
                    gte: start,
                    lte: end,
                },
            },
            _count: {
                id: true,
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                hours: true,
            },
            _count: {
                id: true,
            },
        });
        const leaveStats = await this.prisma.leave.aggregate({
            where: {
                tenantId,
                employeeId,
                startDate: {
                    gte: start,
                },
                endDate: {
                    lte: end,
                },
            },
            _sum: {
                days: true,
            },
            _count: {
                id: true,
            },
        });
        const scheduleCount = await this.prisma.schedule.count({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });
        return {
            employee: {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                matricule: employee.matricule,
                position: employee.position,
                department: employee.department?.name,
                team: employee.team?.name,
                site: employee.site?.name,
                currentShift: employee.currentShift?.name,
            },
            period: {
                startDate,
                endDate,
            },
            attendance: {
                total: attendanceStats.reduce((acc, stat) => acc + stat._count.id, 0),
                byType: attendanceStats.map(stat => ({
                    type: stat.type,
                    count: stat._count.id,
                })),
            },
            overtime: {
                totalRecords: overtimeStats._count.id,
                totalHours: overtimeStats._sum.hours || 0,
            },
            leaves: {
                totalRequests: leaveStats._count.id,
                totalDays: leaveStats._sum.days || 0,
            },
            schedules: {
                total: scheduleCount,
            },
        };
    }
    async getTeamReport(tenantId, teamId, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const team = await this.prisma.team.findFirst({
            where: {
                id: teamId,
                tenantId,
            },
            include: {
                employees: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        position: true,
                    },
                },
            },
        });
        if (!team) {
            throw new Error('Team not found');
        }
        const employeeIds = team.employees.map(e => e.id);
        const attendanceCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                timestamp: {
                    gte: start,
                    lte: end,
                },
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                date: {
                    gte: start,
                    lte: end,
                },
            },
            _sum: {
                hours: true,
            },
        });
        const leaveStats = await this.prisma.leave.aggregate({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                startDate: {
                    gte: start,
                },
                endDate: {
                    lte: end,
                },
            },
            _sum: {
                days: true,
            },
        });
        return {
            team: {
                id: team.id,
                name: team.name,
                code: team.code,
                totalEmployees: team.employees.length,
            },
            period: {
                startDate,
                endDate,
            },
            attendance: {
                total: attendanceCount,
            },
            overtime: {
                totalHours: overtimeStats._sum.hours || 0,
            },
            leaves: {
                totalDays: leaveStats._sum.days || 0,
            },
            employees: team.employees,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map