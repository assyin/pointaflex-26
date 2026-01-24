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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../../database/prisma.service");
const dashboard_stats_dto_1 = require("./dto/dashboard-stats.dto");
const client_1 = require("@prisma/client");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let ReportsService = class ReportsService {
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
    }
    async getDashboardStats(tenantId, query, userId, userRole) {
        const cacheKey = `dashboard:${tenantId || 'null'}:${userId || 'null'}:${query.scope || 'auto'}:${query.startDate || ''}:${query.endDate || ''}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        let scope = query.scope;
        if (!scope && userId && tenantId) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
                scope = dashboard_stats_dto_1.DashboardScope.DEPARTMENT;
            }
            else if (managerLevel.type === 'SITE') {
                scope = dashboard_stats_dto_1.DashboardScope.SITE;
            }
            else if (managerLevel.type === 'TEAM') {
                scope = dashboard_stats_dto_1.DashboardScope.TEAM;
            }
            else {
                scope = dashboard_stats_dto_1.DashboardScope.PERSONAL;
            }
        }
        else {
            scope = scope || dashboard_stats_dto_1.DashboardScope.PERSONAL;
        }
        this.validateScopeAccess(scope, userRole);
        let result;
        switch (scope) {
            case dashboard_stats_dto_1.DashboardScope.PERSONAL:
                if (!userId) {
                    throw new common_1.ForbiddenException('User ID required for personal dashboard');
                }
                result = await this.getPersonalDashboardStats(userId, tenantId, query);
                break;
            case dashboard_stats_dto_1.DashboardScope.TEAM:
                if (!userId) {
                    throw new common_1.ForbiddenException('User ID required for team dashboard');
                }
                result = await this.getTeamDashboardStats(userId, tenantId, query);
                break;
            case dashboard_stats_dto_1.DashboardScope.DEPARTMENT:
                if (!userId || !tenantId) {
                    throw new common_1.ForbiddenException('User ID and Tenant ID required for department dashboard');
                }
                result = await this.getDepartmentDashboardStats(userId, tenantId, query);
                break;
            case dashboard_stats_dto_1.DashboardScope.SITE:
                if (!userId || !tenantId) {
                    throw new common_1.ForbiddenException('User ID and Tenant ID required for site dashboard');
                }
                result = await this.getSiteDashboardStats(userId, tenantId, query);
                break;
            case dashboard_stats_dto_1.DashboardScope.TENANT:
                if (!tenantId) {
                    throw new common_1.ForbiddenException('Tenant ID required for tenant dashboard');
                }
                result = await this.getTenantDashboardStats(tenantId, query);
                break;
            case dashboard_stats_dto_1.DashboardScope.PLATFORM:
                if (userRole !== 'SUPER_ADMIN') {
                    throw new common_1.ForbiddenException('Only SUPER_ADMIN can access platform dashboard');
                }
                result = await this.getPlatformDashboardStats(query);
                break;
            default:
                result = await this.getTenantDashboardStats(tenantId, query);
        }
        await this.cacheManager.set(cacheKey, result, 300000);
        return result;
    }
    validateScopeAccess(scope, userRole) {
        switch (scope) {
            case dashboard_stats_dto_1.DashboardScope.PERSONAL:
                return;
            case dashboard_stats_dto_1.DashboardScope.TEAM:
                if (userRole !== 'MANAGER' && userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
                    throw new common_1.ForbiddenException('Insufficient permissions for team dashboard');
                }
                return;
            case dashboard_stats_dto_1.DashboardScope.DEPARTMENT:
                if (userRole !== 'MANAGER' && userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
                    throw new common_1.ForbiddenException('Insufficient permissions for department dashboard');
                }
                return;
            case dashboard_stats_dto_1.DashboardScope.SITE:
                if (userRole !== 'MANAGER' && userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
                    throw new common_1.ForbiddenException('Insufficient permissions for site dashboard');
                }
                return;
            case dashboard_stats_dto_1.DashboardScope.TENANT:
                if (userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
                    throw new common_1.ForbiddenException('Insufficient permissions for tenant dashboard');
                }
                return;
            case dashboard_stats_dto_1.DashboardScope.PLATFORM:
                if (userRole !== 'SUPER_ADMIN') {
                    throw new common_1.ForbiddenException('Only SUPER_ADMIN can access platform dashboard');
                }
                return;
            default:
                throw new common_1.ForbiddenException('Invalid dashboard scope');
        }
    }
    async getPersonalDashboardStats(userId, tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                employee: {
                    include: {
                        department: true,
                        team: true,
                    },
                },
            },
        });
        if (!user || !user.employee) {
            throw new common_1.ForbiddenException('User is not linked to an employee');
        }
        const employeeId = user.employee.id;
        const empTenantId = user.employee.tenantId;
        const attendanceEntries = await this.prisma.attendance.findMany({
            where: {
                employeeId,
                tenantId: empTenantId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                type: client_1.AttendanceType.IN,
            },
            select: {
                timestamp: true,
                hasAnomaly: true,
                anomalyType: true,
            },
        });
        const workedDays = new Set(attendanceEntries.map((a) => {
            const date = new Date(a.timestamp);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        })).size;
        const lateCount = attendanceEntries.filter((a) => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
        const totalAttendances = await this.prisma.attendance.count({
            where: {
                employeeId,
                tenantId: empTenantId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                employeeId,
                tenantId: empTenantId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.OvertimeStatus.APPROVED,
            },
            _sum: { hours: true },
            _count: { id: true },
        });
        const leaveStats = await this.prisma.leave.aggregate({
            where: {
                employeeId,
                tenantId: empTenantId,
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
            _sum: { days: true },
            _count: { id: true },
        });
        const pendingLeaves = await this.prisma.leave.count({
            where: {
                employeeId,
                tenantId: empTenantId,
                status: {
                    in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED],
                },
            },
        });
        const pendingOvertime = await this.prisma.overtime.count({
            where: {
                employeeId,
                tenantId: empTenantId,
                status: client_1.OvertimeStatus.PENDING,
            },
        });
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const startDate7Days = new Date();
        startDate7Days.setDate(startDate7Days.getDate() - 6);
        startDate7Days.setHours(0, 0, 0, 0);
        const endDate7Days = new Date();
        endDate7Days.setHours(23, 59, 59, 999);
        const all7DaysAttendance = await this.prisma.attendance.findMany({
            where: {
                employeeId,
                tenantId: empTenantId,
                timestamp: { gte: startDate7Days, lte: endDate7Days },
            },
            select: {
                timestamp: true,
                type: true,
                hasAnomaly: true,
                anomalyType: true,
            },
        });
        const attendanceByDay = new Map();
        all7DaysAttendance.forEach((a) => {
            const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
            if (!attendanceByDay.has(dateKey)) {
                attendanceByDay.set(dateKey, []);
            }
            attendanceByDay.get(dateKey).push(a);
        });
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            const dayAttendance = attendanceByDay.get(dateKey) || [];
            const hasEntry = dayAttendance.some(a => a.type === client_1.AttendanceType.IN);
            const hasLate = dayAttendance.some(a => a.hasAnomaly && a.anomalyType?.includes('LATE'));
            last7Days.push({
                day: dayNames[date.getDay()],
                date: dateKey,
                present: hasEntry ? 1 : 0,
                late: hasLate ? 1 : 0,
            });
        }
        return {
            scope: 'personal',
            employees: {
                total: 1,
                activeToday: workedDays > 0 ? 1 : 0,
                onLeave: 0,
            },
            pendingApprovals: {
                leaves: pendingLeaves,
                overtime: pendingOvertime,
            },
            attendance: {
                total: totalAttendances,
                anomalies: lateCount,
                anomalyRate: totalAttendances > 0 ? ((lateCount / totalAttendances) * 100).toFixed(2) : 0,
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
            personal: {
                workedDays,
                totalHours: Math.floor(totalAttendances / 2),
                lateCount,
                overtimeHours: overtimeStats._sum.hours || 0,
                leaveDays: leaveStats._sum.days || 0,
            },
            weeklyAttendance: last7Days,
        };
    }
    async getTeamDashboardStats(userId, tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                employee: {
                    include: {
                        team: {
                            include: {
                                employees: {
                                    where: { isActive: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!user || !user.employee || !user.employee.team) {
            throw new common_1.ForbiddenException('User is not linked to an employee with a team');
        }
        const team = user.employee.team;
        const teamId = team.id;
        const empTenantId = user.employee.tenantId;
        const teamEmployeeIds = team.employees.map(e => e.id);
        const totalTeamEmployees = team.employees.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const activeToday = await this.prisma.attendance.groupBy({
            by: ['employeeId'],
            where: {
                tenantId: empTenantId,
                employeeId: { in: teamEmployeeIds },
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
                type: client_1.AttendanceType.IN,
            },
        });
        const attendanceCount = await this.prisma.attendance.count({
            where: {
                tenantId: empTenantId,
                employeeId: { in: teamEmployeeIds },
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const anomaliesCount = await this.prisma.attendance.count({
            where: {
                tenantId: empTenantId,
                employeeId: { in: teamEmployeeIds },
                hasAnomaly: true,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const pendingLeaves = await this.prisma.leave.count({
            where: {
                tenantId: empTenantId,
                employeeId: { in: teamEmployeeIds },
                status: {
                    in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED],
                },
            },
        });
        const pendingOvertime = await this.prisma.overtime.count({
            where: {
                tenantId: empTenantId,
                employeeId: { in: teamEmployeeIds },
                status: client_1.OvertimeStatus.PENDING,
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                tenantId: empTenantId,
                employeeId: { in: teamEmployeeIds },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.OvertimeStatus.APPROVED,
            },
            _sum: { hours: true },
            _count: { id: true },
        });
        const attendanceRate = totalTeamEmployees > 0
            ? ((activeToday.length / totalTeamEmployees) * 100).toFixed(1)
            : 0;
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const startDate7Days = new Date();
        startDate7Days.setDate(startDate7Days.getDate() - 6);
        startDate7Days.setHours(0, 0, 0, 0);
        const endDate7Days = new Date();
        endDate7Days.setHours(23, 59, 59, 999);
        const all7DaysAttendance = await this.prisma.attendance.findMany({
            where: {
                tenantId: empTenantId,
                employeeId: { in: teamEmployeeIds },
                timestamp: { gte: startDate7Days, lte: endDate7Days },
                type: client_1.AttendanceType.IN,
            },
            select: { employeeId: true, hasAnomaly: true, anomalyType: true, timestamp: true },
        });
        const attendanceByDay = new Map();
        all7DaysAttendance.forEach((a) => {
            const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
            if (!attendanceByDay.has(dateKey)) {
                attendanceByDay.set(dateKey, []);
            }
            attendanceByDay.get(dateKey).push(a);
        });
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            const dayAttendance = attendanceByDay.get(dateKey) || [];
            const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
            const attendanceEmployeeIds = new Set(dayAttendance.map(a => a.employeeId));
            const absent = await this.calculateAbsencesForDay(empTenantId, teamEmployeeIds, date, attendanceEmployeeIds);
            last7Days.push({
                day: dayNames[date.getDay()],
                date: dateKey,
                retards: late,
                absences: absent,
            });
        }
        return {
            scope: 'team',
            team: {
                id: teamId,
                name: team.name,
            },
            employees: {
                total: totalTeamEmployees,
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
                totalRequests: 0,
                totalDays: 0,
                current: pendingLeaves,
            },
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            attendanceRate: Number(attendanceRate),
            weeklyAttendance: last7Days,
        };
    }
    async getDepartmentDashboardStats(userId, tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
        if (managerLevel.type !== 'DEPARTMENT' || !managerLevel.departmentId) {
            throw new common_1.ForbiddenException('User is not a department manager');
        }
        const department = await this.prisma.department.findFirst({
            where: {
                id: managerLevel.departmentId,
                tenantId,
            },
            include: {
                employees: {
                    where: { isActive: true },
                },
            },
        });
        if (!department) {
            throw new common_1.ForbiddenException('Department not found');
        }
        const departmentEmployeeIds = department.employees.map(e => e.id);
        const totalDepartmentEmployees = department.employees.length;
        const sites = await this.prisma.site.findMany({
            where: {
                tenantId,
                employees: {
                    some: {
                        departmentId: managerLevel.departmentId,
                        isActive: true,
                    },
                },
            },
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const activeToday = await this.prisma.attendance.groupBy({
            by: ['employeeId'],
            where: {
                tenantId,
                employeeId: { in: departmentEmployeeIds },
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
                type: client_1.AttendanceType.IN,
            },
        });
        const attendanceCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId: { in: departmentEmployeeIds },
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const anomaliesCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId: { in: departmentEmployeeIds },
                hasAnomaly: true,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const pendingLeaves = await this.prisma.leave.count({
            where: {
                tenantId,
                employeeId: { in: departmentEmployeeIds },
                status: {
                    in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED],
                },
            },
        });
        const pendingOvertime = await this.prisma.overtime.count({
            where: {
                tenantId,
                employeeId: { in: departmentEmployeeIds },
                status: client_1.OvertimeStatus.PENDING,
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                tenantId,
                employeeId: { in: departmentEmployeeIds },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.OvertimeStatus.APPROVED,
            },
            _sum: { hours: true },
            _count: { id: true },
        });
        const leaveStats = await this.prisma.leave.aggregate({
            where: {
                tenantId,
                employeeId: { in: departmentEmployeeIds },
                startDate: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.LeaveStatus.APPROVED,
            },
            _sum: { days: true },
            _count: { id: true },
        });
        const attendanceRate = totalDepartmentEmployees > 0
            ? ((activeToday.length / totalDepartmentEmployees) * 100).toFixed(1)
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
                    employeeId: { in: departmentEmployeeIds },
                    timestamp: { gte: date, lt: nextDate },
                    type: client_1.AttendanceType.IN,
                },
                select: { employeeId: true, hasAnomaly: true, anomalyType: true },
            });
            const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
            const attendanceEmployeeIds = new Set(dayAttendance.map(a => a.employeeId));
            const absent = await this.calculateAbsencesForDay(tenantId, departmentEmployeeIds, date, attendanceEmployeeIds);
            last7Days.push({
                day: dayNames[date.getDay()],
                date: date.toISOString().split('T')[0],
                retards: late,
                absences: absent,
            });
        }
        return {
            scope: 'department',
            department: {
                id: department.id,
                name: department.name,
                code: department.code,
            },
            sites: sites.map(site => ({
                id: site.id,
                name: site.name,
                code: site.code,
                employeeCount: site._count.employees,
            })),
            employees: {
                total: totalDepartmentEmployees,
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
            attendanceRate: Number(attendanceRate),
            weeklyAttendance: last7Days,
        };
    }
    async getSiteDashboardStats(userId, tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
        if (managerLevel.type !== 'SITE' || !managerLevel.siteIds || managerLevel.siteIds.length === 0) {
            throw new common_1.ForbiddenException('User is not a site manager');
        }
        let targetSiteId;
        if (query.siteId && managerLevel.siteIds.includes(query.siteId)) {
            targetSiteId = query.siteId;
        }
        else {
            targetSiteId = managerLevel.siteIds[0];
        }
        const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
        const site = await this.prisma.site.findFirst({
            where: {
                id: targetSiteId,
                tenantId,
            },
            include: {
                employees: {
                    where: {
                        isActive: true,
                        id: managedEmployeeIds.length > 0 ? { in: managedEmployeeIds } : undefined,
                    },
                    include: {
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
        });
        if (!site) {
            throw new common_1.ForbiddenException('Site not found');
        }
        const siteEmployeeIds = site.employees.map(e => e.id);
        const totalSiteEmployees = site.employees.length;
        const departments = managerLevel.departmentId
            ? await this.prisma.department.findMany({
                where: {
                    id: managerLevel.departmentId,
                    tenantId,
                    employees: {
                        some: {
                            siteId: targetSiteId,
                            isActive: true,
                            id: managedEmployeeIds.length > 0 ? { in: managedEmployeeIds } : undefined,
                        },
                    },
                },
                include: {
                    _count: {
                        select: {
                            employees: true,
                        },
                    },
                },
            })
            : await this.prisma.department.findMany({
                where: {
                    tenantId,
                    employees: {
                        some: {
                            siteId: targetSiteId,
                            isActive: true,
                            id: managedEmployeeIds.length > 0 ? { in: managedEmployeeIds } : undefined,
                        },
                    },
                },
                include: {
                    _count: {
                        select: {
                            employees: true,
                        },
                    },
                },
            });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const activeToday = await this.prisma.attendance.groupBy({
            by: ['employeeId'],
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
                type: client_1.AttendanceType.IN,
            },
        });
        const attendanceCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const anomaliesCount = await this.prisma.attendance.count({
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                hasAnomaly: true,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const pendingLeaves = await this.prisma.leave.count({
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                status: {
                    in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED],
                },
            },
        });
        const pendingOvertime = await this.prisma.overtime.count({
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                status: client_1.OvertimeStatus.PENDING,
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.OvertimeStatus.APPROVED,
            },
            _sum: { hours: true },
            _count: { id: true },
        });
        const leaveStats = await this.prisma.leave.aggregate({
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                startDate: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.LeaveStatus.APPROVED,
            },
            _sum: { days: true },
            _count: { id: true },
        });
        const attendanceRate = totalSiteEmployees > 0
            ? ((activeToday.length / totalSiteEmployees) * 100).toFixed(1)
            : 0;
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const startDate7Days = new Date();
        startDate7Days.setDate(startDate7Days.getDate() - 6);
        startDate7Days.setHours(0, 0, 0, 0);
        const endDate7Days = new Date();
        endDate7Days.setHours(23, 59, 59, 999);
        const all7DaysAttendance = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId: { in: siteEmployeeIds },
                timestamp: { gte: startDate7Days, lte: endDate7Days },
                type: client_1.AttendanceType.IN,
            },
            select: { employeeId: true, hasAnomaly: true, anomalyType: true, timestamp: true },
        });
        const attendanceByDay = new Map();
        all7DaysAttendance.forEach((a) => {
            const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
            if (!attendanceByDay.has(dateKey)) {
                attendanceByDay.set(dateKey, []);
            }
            attendanceByDay.get(dateKey).push(a);
        });
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            const dayAttendance = attendanceByDay.get(dateKey) || [];
            const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
            const absent = totalSiteEmployees - new Set(dayAttendance.map(a => a.employeeId)).size;
            last7Days.push({
                day: dayNames[date.getDay()],
                date: dateKey,
                retards: late,
                absences: absent,
            });
        }
        return {
            scope: 'site',
            site: {
                id: site.id,
                name: site.name,
                code: site.code,
                city: site.city,
            },
            departments: departments.map(dept => ({
                id: dept.id,
                name: dept.name,
                code: dept.code,
                employeeCount: dept._count.employees,
            })),
            employees: {
                total: totalSiteEmployees,
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
            attendanceRate: Number(attendanceRate),
            weeklyAttendance: last7Days,
        };
    }
    async getPlatformDashboardStats(query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const totalEmployees = await this.prisma.employee.count({
            where: { isActive: true },
        });
        const totalTenants = await this.prisma.tenant.count();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const activeToday = await this.prisma.attendance.groupBy({
            by: ['employeeId'],
            where: {
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
                type: client_1.AttendanceType.IN,
            },
        });
        const attendanceCount = await this.prisma.attendance.count({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const anomaliesCount = await this.prisma.attendance.count({
            where: {
                hasAnomaly: true,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const pendingLeaves = await this.prisma.leave.count({
            where: {
                status: {
                    in: [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED],
                },
            },
        });
        const pendingOvertime = await this.prisma.overtime.count({
            where: {
                status: client_1.OvertimeStatus.PENDING,
            },
        });
        const overtimeStats = await this.prisma.overtime.aggregate({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.OvertimeStatus.APPROVED,
            },
            _sum: { hours: true },
            _count: { id: true },
        });
        const leaveStats = await this.prisma.leave.aggregate({
            where: {
                startDate: { gte: startDate },
                endDate: { lte: endDate },
                status: {
                    in: [client_1.LeaveStatus.APPROVED, client_1.LeaveStatus.HR_APPROVED],
                },
            },
            _sum: { days: true },
            _count: { id: true },
        });
        const attendanceRate = totalEmployees > 0
            ? ((activeToday.length / totalEmployees) * 100).toFixed(1)
            : 0;
        return {
            scope: 'platform',
            tenants: {
                total: totalTenants,
                active: totalTenants,
            },
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
            attendanceRate: Number(attendanceRate),
        };
    }
    async getTenantDashboardStats(tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const result = await this.getTenantDashboardStatsInternal(tenantId, query);
        return {
            ...result,
            scope: 'tenant',
        };
    }
    async getTenantDashboardStatsInternal(tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const totalEmployees = await this.prisma.employee.count({
            where: { tenantId, isActive: true },
        });
        const allActiveEmployees = await this.prisma.employee.findMany({
            where: { tenantId, isActive: true },
            select: { id: true },
        });
        const allActiveEmployeeIds = allActiveEmployees.map(e => e.id);
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
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const startDate7Days = new Date();
        startDate7Days.setDate(startDate7Days.getDate() - 6);
        startDate7Days.setHours(0, 0, 0, 0);
        const endDate7Days = new Date();
        endDate7Days.setHours(23, 59, 59, 999);
        const all7DaysAttendance = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                timestamp: { gte: startDate7Days, lte: endDate7Days },
                type: client_1.AttendanceType.IN,
            },
            select: { employeeId: true, hasAnomaly: true, anomalyType: true, timestamp: true },
        });
        const attendanceByDay = new Map();
        all7DaysAttendance.forEach((a) => {
            const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
            if (!attendanceByDay.has(dateKey)) {
                attendanceByDay.set(dateKey, []);
            }
            attendanceByDay.get(dateKey).push(a);
        });
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            const dayAttendance = attendanceByDay.get(dateKey) || [];
            const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
            const attendanceEmployeeIds = new Set(dayAttendance.map(a => a.employeeId));
            const absent = await this.calculateAbsencesForDay(tenantId, allActiveEmployeeIds, date, attendanceEmployeeIds);
            last7Days.push({
                day: dayNames[date.getDay()],
                date: dateKey,
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
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
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
        const employeeFilters = {};
        if (dto.departmentId) {
            employeeFilters.departmentId = dto.departmentId;
        }
        if (dto.teamId) {
            employeeFilters.teamId = dto.teamId;
        }
        if (dto.siteId) {
            employeeFilters.siteId = dto.siteId;
        }
        if (Object.keys(employeeFilters).length > 0) {
            where.employee = employeeFilters;
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
        const dailyAttendance = new Map();
        attendance.forEach(record => {
            const dateKey = `${record.employeeId}_${new Date(record.timestamp).toISOString().split('T')[0]}`;
            if (!dailyAttendance.has(dateKey)) {
                dailyAttendance.set(dateKey, { employeeId: record.employeeId });
            }
            const dayData = dailyAttendance.get(dateKey);
            if (record.type === client_1.AttendanceType.IN && !dayData.in) {
                dayData.in = new Date(record.timestamp);
            }
            else if (record.type === client_1.AttendanceType.OUT) {
                dayData.out = new Date(record.timestamp);
            }
        });
        let totalWorkedHours = 0;
        dailyAttendance.forEach((dayData) => {
            if (dayData.in && dayData.out) {
                const diffMs = dayData.out.getTime() - dayData.in.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                totalWorkedHours += diffHours;
            }
        });
        const byDay = new Map();
        attendance.forEach(record => {
            const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
            if (!byDay.has(dateKey)) {
                byDay.set(dateKey, { total: 0, anomalies: 0, employees: new Set() });
            }
            const dayStats = byDay.get(dateKey);
            dayStats.total++;
            dayStats.employees.add(record.employeeId);
            if (record.hasAnomaly) {
                dayStats.anomalies++;
            }
        });
        const anomalies = attendance.filter(a => a.hasAnomaly);
        const uniqueEmployees = new Set(attendance.map(a => a.employeeId)).size;
        const totalDays = byDay.size;
        const employeeIds = dto.employeeId ? [dto.employeeId] : Array.from(new Set(attendance.map(a => a.employeeId)));
        const recoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: employeeIds.length > 0 ? { in: employeeIds } : undefined,
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED] },
                OR: [
                    { startDate: { lte: endDate }, endDate: { gte: startDate } }
                ]
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    }
                }
            }
        });
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId }
        });
        const dailyWorkingHours = Number(settings?.dailyWorkingHours || 7.33);
        let totalRecoveryHours = 0;
        recoveryDays.forEach(rd => {
            totalRecoveryHours += Number(rd.days) * dailyWorkingHours;
        });
        return {
            data: attendance,
            recoveryDays: recoveryDays,
            summary: {
                total: attendance.length,
                anomalies: anomalies.length,
                totalWorkedHours: Math.round((totalWorkedHours + totalRecoveryHours) * 10) / 10,
                totalRecoveryHours: Math.round(totalRecoveryHours * 10) / 10,
                uniqueEmployees,
                totalDays,
                byDay: Array.from(byDay.entries()).map(([date, stats]) => ({
                    date,
                    total: stats.total,
                    anomalies: stats.anomalies,
                    employees: stats.employees.size,
                })),
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
    async getOvertimeReport(tenantId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        const where = {
            tenantId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        };
        if (dto.employeeId) {
            where.employeeId = dto.employeeId;
        }
        if (dto.status) {
            where.status = dto.status;
        }
        if (dto.type) {
            where.type = dto.type;
        }
        if (dto.departmentId || dto.siteId || dto.teamId) {
            where.employee = {};
            if (dto.departmentId) {
                where.employee.departmentId = dto.departmentId;
            }
            if (dto.siteId) {
                where.employee.siteId = dto.siteId;
            }
            if (dto.teamId) {
                where.employee.teamId = dto.teamId;
            }
        }
        const overtimeRecords = await this.prisma.overtime.findMany({
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
                        site: {
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
            },
            orderBy: [
                { date: 'desc' },
                { employee: { lastName: 'asc' } },
            ],
        });
        const totalHours = overtimeRecords.reduce((sum, record) => {
            const hours = record.approvedHours || record.hours;
            return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
        }, 0);
        const byStatus = overtimeRecords.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
        }, {});
        const byType = overtimeRecords.reduce((acc, record) => {
            acc[record.type] = (acc[record.type] || 0) + 1;
            return acc;
        }, {});
        const employeeIds = overtimeRecords.map(r => r.employeeId);
        const recoveryDaysFromOvertime = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: employeeIds.length > 0 ? { in: employeeIds } : undefined,
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED] },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    }
                },
                overtimeSources: {
                    include: {
                        overtime: {
                            select: {
                                id: true,
                                date: true,
                                hours: true,
                                approvedHours: true,
                                type: true,
                            }
                        }
                    }
                }
            }
        });
        let totalHoursConvertedToRecovery = 0;
        recoveryDaysFromOvertime.forEach(rd => {
            totalHoursConvertedToRecovery += Number(rd.sourceHours);
        });
        return {
            data: overtimeRecords,
            recoveryDays: recoveryDaysFromOvertime,
            summary: {
                total: overtimeRecords.length,
                totalHours,
                totalApprovedHours: overtimeRecords
                    .filter(r => r.status === client_1.OvertimeStatus.APPROVED)
                    .reduce((sum, r) => {
                    const hours = r.approvedHours || r.hours;
                    return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
                }, 0),
                totalHoursConvertedToRecovery: Math.round(totalHoursConvertedToRecovery * 10) / 10,
                totalHoursPaid: Math.round((totalHours - totalHoursConvertedToRecovery) * 10) / 10,
                byStatus,
                byType,
                period: {
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                },
            },
        };
    }
    async getAbsencesReport(tenantId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        const employeeWhere = {
            tenantId,
            isActive: true,
        };
        if (dto.departmentId) {
            employeeWhere.departmentId = dto.departmentId;
        }
        if (dto.siteId) {
            employeeWhere.siteId = dto.siteId;
        }
        if (dto.teamId) {
            employeeWhere.teamId = dto.teamId;
        }
        const employees = await this.prisma.employee.findMany({
            where: employeeWhere,
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
                site: {
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
        });
        const employeeIds = employees.map(e => e.id);
        const attendanceWhere = {
            tenantId,
            employeeId: dto.employeeId ? dto.employeeId : { in: employeeIds },
            timestamp: {
                gte: startDate,
                lte: endDate,
            },
            hasAnomaly: true,
        };
        const anomalies = await this.prisma.attendance.findMany({
            where: attendanceWhere,
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
                        site: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { timestamp: 'desc' },
                { employee: { lastName: 'asc' } },
            ],
        });
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const allDays = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            allDays.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const absences = [];
        const employeeAttendanceMap = new Map();
        anomalies.forEach(att => {
            const dateKey = formatDate(new Date(att.timestamp));
            if (!employeeAttendanceMap.has(att.employeeId)) {
                employeeAttendanceMap.set(att.employeeId, new Set());
            }
            employeeAttendanceMap.get(att.employeeId).add(dateKey);
        });
        const recoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: dto.employeeId ? dto.employeeId : { in: employeeIds },
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED] },
                OR: [
                    { startDate: { lte: endDate }, endDate: { gte: startDate } }
                ]
            }
        });
        const recoveryDaysMap = new Map();
        recoveryDays.forEach(rd => {
            if (!recoveryDaysMap.has(rd.employeeId)) {
                recoveryDaysMap.set(rd.employeeId, new Set());
            }
            const rdStart = new Date(rd.startDate);
            const rdEnd = new Date(rd.endDate);
            const currentDate = new Date(rdStart);
            while (currentDate <= rdEnd) {
                recoveryDaysMap.get(rd.employeeId).add(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        employees.forEach(emp => {
            allDays.forEach(day => {
                const dateKey = formatDate(day);
                const hasEntry = employeeAttendanceMap.get(emp.id)?.has(dateKey);
                const isRecoveryDay = recoveryDaysMap.get(emp.id)?.has(dateKey);
                if (!hasEntry && !isRecoveryDay) {
                    const dayOfWeek = day.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        absences.push({
                            employee: emp,
                            date: dateKey,
                            type: 'ABSENCE',
                        });
                    }
                }
            });
        });
        const lateCount = anomalies.filter(a => a.anomalyType?.includes('LATE')).length;
        const absenceCount = absences.length;
        const earlyLeaveCount = anomalies.filter(a => a.anomalyType?.includes('EARLY_LEAVE')).length;
        return {
            data: {
                anomalies: anomalies.map(a => ({
                    ...a,
                    type: a.anomalyType || 'UNKNOWN',
                })),
                absences,
                recoveryDays: recoveryDays,
            },
            summary: {
                totalAnomalies: anomalies.length,
                totalAbsences: absenceCount,
                totalRecoveryDays: recoveryDays.length,
                lateCount,
                earlyLeaveCount,
                period: {
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                },
            },
        };
    }
    async getPayrollReport(tenantId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        const employeeWhere = {
            tenantId,
            isActive: true,
        };
        if (dto.departmentId) {
            employeeWhere.departmentId = dto.departmentId;
        }
        if (dto.siteId) {
            employeeWhere.siteId = dto.siteId;
        }
        if (dto.teamId) {
            employeeWhere.teamId = dto.teamId;
        }
        const employees = await this.prisma.employee.findMany({
            where: dto.employeeId ? { ...employeeWhere, id: dto.employeeId } : employeeWhere,
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
                site: {
                    select: {
                        name: true,
                    },
                },
                position: true,
            },
        });
        const employeeIds = employees.map(e => e.id);
        const allAttendanceRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                type: client_1.AttendanceType.IN,
            },
            select: {
                employeeId: true,
            },
        });
        const allOvertimeRecords = await this.prisma.overtime.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                status: client_1.OvertimeStatus.APPROVED,
            },
            select: {
                employeeId: true,
                hours: true,
                approvedHours: true,
            },
        });
        const allLeaveRecords = await this.prisma.leave.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                startDate: {
                    lte: endDate,
                },
                endDate: {
                    gte: startDate,
                },
                status: {
                    in: [client_1.LeaveStatus.APPROVED, client_1.LeaveStatus.HR_APPROVED],
                },
            },
            select: {
                employeeId: true,
                days: true,
            },
        });
        const allAbsenceRecords = await this.prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                anomalyType: {
                    contains: 'ABSENCE',
                },
            },
            select: {
                employeeId: true,
            },
        });
        const allRecoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED] },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
            select: {
                employeeId: true,
                days: true,
                sourceHours: true,
            },
        });
        const attendanceByEmployee = new Map();
        const overtimeByEmployee = new Map();
        const leaveByEmployee = new Map();
        const absenceByEmployee = new Map();
        const recoveryDaysByEmployee = new Map();
        allAttendanceRecords.forEach(record => {
            attendanceByEmployee.set(record.employeeId, (attendanceByEmployee.get(record.employeeId) || 0) + 1);
        });
        allOvertimeRecords.forEach(record => {
            const hours = Number(record.approvedHours || record.hours || 0);
            overtimeByEmployee.set(record.employeeId, (overtimeByEmployee.get(record.employeeId) || 0) + hours);
        });
        allLeaveRecords.forEach(record => {
            const days = Number(record.days || 0);
            leaveByEmployee.set(record.employeeId, (leaveByEmployee.get(record.employeeId) || 0) + days);
        });
        allAbsenceRecords.forEach(record => {
            absenceByEmployee.set(record.employeeId, (absenceByEmployee.get(record.employeeId) || 0) + 1);
        });
        allRecoveryDays.forEach(record => {
            const existing = recoveryDaysByEmployee.get(record.employeeId) || { days: 0, hours: 0 };
            recoveryDaysByEmployee.set(record.employeeId, {
                days: existing.days + Number(record.days),
                hours: existing.hours + Number(record.sourceHours),
            });
        });
        const payrollData = employees.map(employee => {
            const workedDays = attendanceByEmployee.get(employee.id) || 0;
            const overtimeHours = overtimeByEmployee.get(employee.id) || 0;
            const leaveDays = leaveByEmployee.get(employee.id) || 0;
            const absenceDays = absenceByEmployee.get(employee.id) || 0;
            const recoveryDays = recoveryDaysByEmployee.get(employee.id) || { days: 0, hours: 0 };
            return {
                employee: {
                    id: employee.id,
                    matricule: employee.matricule,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    fullName: `${employee.firstName} ${employee.lastName}`,
                    department: employee.department?.name || '',
                    site: employee.site?.name || '',
                    position: employee.position || '',
                },
                period: {
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                },
                workedDays,
                normalHours: workedDays * 8,
                overtimeHours,
                leaveDays,
                lateHours: 0,
                absenceDays,
                recoveryDays: recoveryDays.days,
                recoveryHours: recoveryDays.hours,
                totalHours: (workedDays * 8) + overtimeHours,
            };
        });
        const totalEmployees = payrollData.length;
        const totalWorkedDays = payrollData.reduce((sum, d) => sum + d.workedDays, 0);
        const totalNormalHours = payrollData.reduce((sum, d) => sum + d.normalHours, 0);
        const totalOvertimeHours = payrollData.reduce((sum, d) => sum + d.overtimeHours, 0);
        const totalLeaveDays = payrollData.reduce((sum, d) => sum + Number(d.leaveDays), 0);
        const totalRecoveryDays = payrollData.reduce((sum, d) => sum + d.recoveryDays, 0);
        const totalRecoveryHours = payrollData.reduce((sum, d) => sum + d.recoveryHours, 0);
        return {
            data: payrollData,
            summary: {
                totalEmployees,
                totalWorkedDays,
                totalNormalHours,
                totalOvertimeHours,
                totalLeaveDays,
                totalRecoveryDays,
                totalRecoveryHours,
                totalHours: totalNormalHours + totalOvertimeHours + totalRecoveryHours,
                period: {
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                },
            },
        };
    }
    async getPlanningReport(tenantId, dto) {
        const where = {
            tenantId,
            date: {
                gte: new Date(dto.startDate),
                lte: new Date(dto.endDate),
            },
        };
        if (dto.employeeId)
            where.employeeId = dto.employeeId;
        if (dto.departmentId)
            where.employee = { departmentId: dto.departmentId };
        if (dto.siteId)
            where.employee = { ...where.employee, siteId: dto.siteId };
        if (dto.teamId)
            where.employee = { ...where.employee, teamId: dto.teamId };
        if (dto.shiftId)
            where.shiftId = dto.shiftId;
        const schedules = await this.prisma.schedule.findMany({
            where,
            include: {
                employee: {
                    include: {
                        department: true,
                        positionRef: true,
                        site: true,
                        team: true,
                    },
                },
                shift: true,
            },
            orderBy: [
                { date: 'asc' },
                { employee: { lastName: 'asc' } },
            ],
        });
        const planningData = schedules.map((schedule) => ({
            id: schedule.id,
            date: schedule.date,
            employee: {
                id: schedule.employee.id,
                name: `${schedule.employee.firstName} ${schedule.employee.lastName}`,
                employeeNumber: schedule.employee.matricule,
                department: schedule.employee.department?.name || 'N/A',
                position: schedule.employee.positionRef?.name || schedule.employee.position || 'N/A',
                site: schedule.employee.site?.name || 'N/A',
                team: schedule.employee.team?.name || 'N/A',
            },
            shift: schedule.shift ? {
                id: schedule.shift.id,
                name: schedule.shift.name,
                startTime: schedule.shift.startTime,
                endTime: schedule.shift.endTime,
                color: schedule.shift.color,
            } : null,
            customStartTime: schedule.customStartTime,
            customEndTime: schedule.customEndTime,
            notes: schedule.notes,
        }));
        const employeeIds = schedules.map((s) => s.employee.id);
        const recoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: employeeIds.length > 0 ? { in: employeeIds } : undefined,
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.USED] },
                startDate: { lte: new Date(dto.endDate) },
                endDate: { gte: new Date(dto.startDate) },
            },
            include: {
                employee: {
                    include: {
                        department: true,
                        positionRef: true,
                        site: true,
                        team: true,
                    }
                }
            }
        });
        const recoveryDaysAsPlanning = recoveryDays.map(rd => ({
            id: `recovery-${rd.id}`,
            date: rd.startDate,
            employee: {
                id: rd.employee.id,
                name: `${rd.employee.firstName} ${rd.employee.lastName}`,
                employeeNumber: rd.employee.matricule,
                department: rd.employee.department?.name || 'N/A',
                position: rd.employee.positionRef?.name || rd.employee.position || 'N/A',
                site: rd.employee.site?.name || 'N/A',
                team: rd.employee.team?.name || 'N/A',
            },
            shift: null,
            isRecoveryDay: true,
            recoveryDay: rd,
        }));
        const totalSchedules = planningData.length;
        const uniqueEmployees = new Set(planningData.map(s => s.employee.id)).size;
        const uniqueShifts = new Set(planningData.filter(s => s.shift).map(s => s.shift.id)).size;
        return {
            data: [...planningData, ...recoveryDaysAsPlanning],
            summary: {
                totalSchedules: totalSchedules + recoveryDays.length,
                uniqueEmployees,
                uniqueShifts,
                totalRecoveryDays: recoveryDays.length,
                period: {
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                },
            },
        };
    }
    async getReportHistory(tenantId, userId) {
        const where = {
            tenantId,
        };
        if (userId) {
            where.userId = userId;
        }
        const history = await this.prisma.reportHistory.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });
        return history.map(item => ({
            id: item.id,
            name: item.fileName,
            reportType: item.reportType,
            format: item.format,
            createdAt: item.createdAt,
            fileSize: item.fileSize,
            filters: item.filters,
            user: item.user,
        }));
    }
    async calculateAbsencesForDay(tenantId, employeeIds, date, attendanceEmployeeIds) {
        const now = new Date();
        const bufferMinutes = 60;
        const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        endOfDay.setUTCMilliseconds(-1);
        const schedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: 'PUBLISHED',
                suspendedByLeaveId: null,
            },
            include: {
                shift: true,
                employee: {
                    select: { id: true, userId: true },
                },
            },
        });
        if (schedules.length === 0) {
            return 0;
        }
        const approvedLeaves = await this.prisma.leave.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                status: client_1.LeaveStatus.APPROVED,
                startDate: { lte: date },
                endDate: { gte: date },
            },
            select: { employeeId: true },
        });
        const employeesOnLeave = new Set(approvedLeaves.map(l => l.employeeId));
        const approvedRecoveries = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: { in: employeeIds },
                status: client_1.RecoveryDayStatus.APPROVED,
                startDate: { lte: date },
                endDate: { gte: date },
            },
            select: { employeeId: true },
        });
        const employeesOnRecovery = new Set(approvedRecoveries.map(r => r.employeeId));
        let absenceCount = 0;
        for (const schedule of schedules) {
            const employeeId = schedule.employeeId;
            if (employeesOnLeave.has(employeeId) || employeesOnRecovery.has(employeeId)) {
                continue;
            }
            const shiftEndTime = schedule.customEndTime || schedule.shift?.endTime || '18:00';
            const [endHour, endMinute] = shiftEndTime.split(':').map(Number);
            const shiftEndDate = new Date(date);
            shiftEndDate.setHours(endHour, endMinute, 0, 0);
            const detectionTime = new Date(shiftEndDate.getTime() + bufferMinutes * 60 * 1000);
            const shiftStartTime = schedule.customStartTime || schedule.shift?.startTime || '08:00';
            const [startHour] = shiftStartTime.split(':').map(Number);
            const isNightShift = endHour < startHour;
            const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isDateInPast = dateLocal.getTime() < nowLocal.getTime();
            if (!isDateInPast && now < detectionTime && !isNightShift) {
                continue;
            }
            if (!attendanceEmployeeIds.has(employeeId)) {
                absenceCount++;
            }
        }
        return absenceCount;
    }
    async getSupplementaryDaysReport(tenantId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        const where = {
            tenantId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        };
        if (dto.employeeId) {
            where.employeeId = dto.employeeId;
        }
        if (dto.status) {
            where.status = dto.status;
        }
        if (dto.type) {
            where.type = dto.type;
        }
        if (dto.departmentId || dto.siteId || dto.teamId) {
            where.employee = {};
            if (dto.departmentId) {
                where.employee.departmentId = dto.departmentId;
            }
            if (dto.siteId) {
                where.employee.siteId = dto.siteId;
            }
            if (dto.teamId) {
                where.employee.teamId = dto.teamId;
            }
        }
        const supplementaryDaysRecords = await this.prisma.supplementaryDay.findMany({
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
                        site: {
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
            },
            orderBy: [
                { date: 'desc' },
                { employee: { lastName: 'asc' } },
            ],
        });
        const totalHours = supplementaryDaysRecords.reduce((sum, record) => {
            const hours = record.approvedHours || record.hours;
            return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
        }, 0);
        const totalApprovedHours = supplementaryDaysRecords
            .filter(r => r.status === 'APPROVED' || r.status === 'RECOVERED')
            .reduce((sum, record) => {
            const hours = record.approvedHours || record.hours;
            return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
        }, 0);
        const recoveredHours = supplementaryDaysRecords
            .filter(r => r.status === 'RECOVERED')
            .reduce((sum, record) => {
            const hours = record.approvedHours || record.hours;
            return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
        }, 0);
        const byStatus = supplementaryDaysRecords.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1;
            return acc;
        }, {});
        const byType = supplementaryDaysRecords.reduce((acc, record) => {
            acc[record.type] = (acc[record.type] || 0) + 1;
            return acc;
        }, {});
        return {
            data: supplementaryDaysRecords,
            summary: {
                total: supplementaryDaysRecords.length,
                totalHours,
                totalApprovedHours,
                recoveredHours,
                byStatus,
                byType,
                period: {
                    startDate: dto.startDate,
                    endDate: dto.endDate,
                },
            },
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], ReportsService);
//# sourceMappingURL=reports.service.js.map