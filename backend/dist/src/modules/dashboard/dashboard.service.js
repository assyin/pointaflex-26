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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../../database/prisma.service");
const date_fns_1 = require("date-fns");
let DashboardService = class DashboardService {
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
    }
    async getEmployeeDashboard(tenantId, employeeId, date) {
        const cacheKey = `dashboard:employee:${tenantId}:${employeeId}:${date.toISOString().split('T')[0]}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const startDate = (0, date_fns_1.startOfMonth)(date);
        const endDate = (0, date_fns_1.endOfMonth)(date);
        const [attendance, leaves, overtime, todayAttendance] = await Promise.all([
            this.prisma.attendance.count({
                where: {
                    tenantId,
                    employeeId,
                    timestamp: { gte: startDate, lte: endDate },
                    type: 'IN',
                },
            }),
            this.prisma.leave.findMany({
                where: {
                    tenantId,
                    employeeId,
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                    status: { in: ['APPROVED', 'PENDING'] },
                },
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    leaveTypeId: true,
                    status: true,
                },
            }),
            this.prisma.overtime.aggregate({
                where: {
                    tenantId,
                    employeeId,
                    date: { gte: startDate, lte: endDate },
                    status: { in: ['APPROVED', 'PENDING'] },
                },
                _sum: { hours: true },
                _count: true,
            }),
            this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId,
                    timestamp: {
                        gte: (0, date_fns_1.startOfDay)(date),
                        lte: (0, date_fns_1.endOfDay)(date)
                    },
                },
                select: {
                    id: true,
                    type: true,
                    timestamp: true,
                    deviceId: true,
                },
                orderBy: { timestamp: 'asc' },
            }),
        ]);
        const result = {
            month: {
                daysWorked: attendance,
                leaves: leaves.length,
                overtimeHours: overtime._sum.hours || 0,
                overtimeRequests: overtime._count,
            },
            today: {
                attendance: todayAttendance,
                hasCheckedIn: todayAttendance.some(a => a.type === 'IN'),
                hasCheckedOut: todayAttendance.some(a => a.type === 'OUT'),
            },
            leaves,
        };
        await this.cacheManager.set(cacheKey, result, 300000);
        return result;
    }
    async getTeamDashboard(tenantId, managerId, date) {
        const cacheKey = `dashboard:team:${tenantId}:${managerId}:${date.toISOString().split('T')[0]}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const teams = await this.prisma.team.findMany({
            where: {
                tenantId,
                managerId,
            },
            select: { id: true },
        });
        const teamIds = teams.map(t => t.id);
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                teamId: { in: teamIds },
                isActive: true,
            },
            select: { id: true },
        });
        const employeeIds = employees.map(e => e.id);
        if (employeeIds.length === 0) {
            return {
                teamSize: 0,
                present: 0,
                absent: 0,
                onLeave: 0,
                pendingRequests: { leaves: 0, overtime: 0 },
            };
        }
        const today = (0, date_fns_1.startOfDay)(date);
        const todayEnd = (0, date_fns_1.endOfDay)(date);
        const [presentCount, leavesCount, pendingLeaves, pendingOvertime] = await Promise.all([
            this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    timestamp: { gte: today, lte: todayEnd },
                    type: 'IN',
                },
                select: { employeeId: true },
                distinct: ['employeeId'],
            }),
            this.prisma.leave.count({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    startDate: { lte: date },
                    endDate: { gte: date },
                    status: 'APPROVED',
                },
            }),
            this.prisma.leave.count({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    status: 'PENDING',
                },
            }),
            this.prisma.overtime.count({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    status: 'PENDING',
                },
            }),
        ]);
        const result = {
            teamSize: employeeIds.length,
            present: presentCount.length,
            absent: employeeIds.length - presentCount.length - leavesCount,
            onLeave: leavesCount,
            pendingRequests: {
                leaves: pendingLeaves,
                overtime: pendingOvertime,
            },
        };
        await this.cacheManager.set(cacheKey, result, 120000);
        return result;
    }
    async getDepartmentDashboard(tenantId, departmentId, date) {
        const cacheKey = `dashboard:department:${tenantId}:${departmentId}:${date.toISOString().split('T')[0]}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const startDate = (0, date_fns_1.startOfMonth)(date);
        const endDate = (0, date_fns_1.endOfMonth)(date);
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                departmentId,
                isActive: true,
            },
            select: { id: true },
        });
        const employeeIds = employees.map(e => e.id);
        if (employeeIds.length === 0) {
            return {
                totalEmployees: 0,
                presentToday: 0,
                monthStats: { totalHours: 0, overtimeHours: 0, leaveDays: 0 },
            };
        }
        const today = (0, date_fns_1.startOfDay)(date);
        const todayEnd = (0, date_fns_1.endOfDay)(date);
        const [presentCount, monthlyAttendance, monthlyOvertime, monthlyLeaves] = await Promise.all([
            this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    timestamp: { gte: today, lte: todayEnd },
                    type: 'IN',
                },
                select: { employeeId: true },
                distinct: ['employeeId'],
            }),
            this.prisma.attendance.count({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    timestamp: { gte: startDate, lte: endDate },
                    type: 'IN',
                },
            }),
            this.prisma.overtime.aggregate({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    date: { gte: startDate, lte: endDate },
                    status: 'APPROVED',
                },
                _sum: { hours: true },
            }),
            this.prisma.leave.count({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                    status: 'APPROVED',
                },
            }),
        ]);
        const result = {
            totalEmployees: employeeIds.length,
            presentToday: presentCount.length,
            monthStats: {
                totalHours: monthlyAttendance * 8,
                overtimeHours: monthlyOvertime._sum.hours || 0,
                leaveDays: monthlyLeaves,
            },
        };
        await this.cacheManager.set(cacheKey, result, 300000);
        return result;
    }
    async getSiteDashboard(tenantId, siteId, date) {
        const cacheKey = `dashboard:site:${tenantId}:${siteId}:${date.toISOString().split('T')[0]}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                siteId,
                isActive: true,
            },
            select: { id: true, departmentId: true },
        });
        const employeeIds = employees.map(e => e.id);
        const departmentIds = [...new Set(employees.map(e => e.departmentId).filter(Boolean))];
        if (employeeIds.length === 0) {
            return {
                totalEmployees: 0,
                departments: 0,
                presentToday: 0,
                attendanceRate: 0,
            };
        }
        const today = (0, date_fns_1.startOfDay)(date);
        const todayEnd = (0, date_fns_1.endOfDay)(date);
        const [presentCount, onLeaveCount] = await Promise.all([
            this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    timestamp: { gte: today, lte: todayEnd },
                    type: 'IN',
                },
                select: { employeeId: true },
                distinct: ['employeeId'],
            }),
            this.prisma.leave.count({
                where: {
                    tenantId,
                    employeeId: { in: employeeIds },
                    startDate: { lte: date },
                    endDate: { gte: date },
                    status: 'APPROVED',
                },
            }),
        ]);
        const expectedPresent = employeeIds.length - onLeaveCount;
        const attendanceRate = expectedPresent > 0
            ? (presentCount.length / expectedPresent) * 100
            : 0;
        const result = {
            totalEmployees: employeeIds.length,
            departments: departmentIds.length,
            presentToday: presentCount.length,
            attendanceRate: Math.round(attendanceRate * 100) / 100,
        };
        await this.cacheManager.set(cacheKey, result, 300000);
        return result;
    }
    async getTenantDashboard(tenantId, date) {
        const cacheKey = `dashboard:tenant:${tenantId}:${date.toISOString().split('T')[0]}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached)
            return cached;
        const today = (0, date_fns_1.startOfDay)(date);
        const todayEnd = (0, date_fns_1.endOfDay)(date);
        const startDate = (0, date_fns_1.startOfMonth)(date);
        const endDate = (0, date_fns_1.endOfMonth)(date);
        const [totalEmployees, activeSites, activeDepartments, presentToday, onLeaveToday, monthlyOvertime, pendingLeaves, pendingOvertime,] = await Promise.all([
            this.prisma.employee.count({
                where: { tenantId, isActive: true },
            }),
            this.prisma.site.count({
                where: { tenantId },
            }),
            this.prisma.department.count({
                where: { tenantId },
            }),
            this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    timestamp: { gte: today, lte: todayEnd },
                    type: 'IN',
                },
                select: { employeeId: true },
                distinct: ['employeeId'],
            }),
            this.prisma.leave.count({
                where: {
                    tenantId,
                    startDate: { lte: date },
                    endDate: { gte: date },
                    status: 'APPROVED',
                },
            }),
            this.prisma.overtime.aggregate({
                where: {
                    tenantId,
                    date: { gte: startDate, lte: endDate },
                    status: 'APPROVED',
                },
                _sum: { hours: true },
            }),
            this.prisma.leave.count({
                where: { tenantId, status: 'PENDING' },
            }),
            this.prisma.overtime.count({
                where: { tenantId, status: 'PENDING' },
            }),
        ]);
        const result = {
            organization: {
                totalEmployees,
                sites: activeSites,
                departments: activeDepartments,
            },
            today: {
                present: presentToday.length,
                onLeave: onLeaveToday,
                absent: totalEmployees - presentToday.length - onLeaveToday,
            },
            month: {
                overtimeHours: monthlyOvertime._sum.hours || 0,
            },
            pending: {
                leaves: pendingLeaves,
                overtime: pendingOvertime,
            },
        };
        await this.cacheManager.set(cacheKey, result, 300000);
        return result;
    }
    async invalidateTenantCache(tenantId) {
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map