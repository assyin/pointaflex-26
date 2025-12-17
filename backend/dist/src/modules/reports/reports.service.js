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
const dashboard_stats_dto_1 = require("./dto/dashboard-stats.dto");
const client_1 = require("@prisma/client");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats(tenantId, query, userId, userRole) {
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
        switch (scope) {
            case dashboard_stats_dto_1.DashboardScope.PERSONAL:
                if (!userId) {
                    throw new common_1.ForbiddenException('User ID required for personal dashboard');
                }
                return this.getPersonalDashboardStats(userId, tenantId, query);
            case dashboard_stats_dto_1.DashboardScope.TEAM:
                if (!userId) {
                    throw new common_1.ForbiddenException('User ID required for team dashboard');
                }
                return this.getTeamDashboardStats(userId, tenantId, query);
            case dashboard_stats_dto_1.DashboardScope.DEPARTMENT:
                if (!userId || !tenantId) {
                    throw new common_1.ForbiddenException('User ID and Tenant ID required for department dashboard');
                }
                return this.getDepartmentDashboardStats(userId, tenantId, query);
            case dashboard_stats_dto_1.DashboardScope.SITE:
                if (!userId || !tenantId) {
                    throw new common_1.ForbiddenException('User ID and Tenant ID required for site dashboard');
                }
                return this.getSiteDashboardStats(userId, tenantId, query);
            case dashboard_stats_dto_1.DashboardScope.TENANT:
                if (!tenantId) {
                    throw new common_1.ForbiddenException('Tenant ID required for tenant dashboard');
                }
                return this.getTenantDashboardStats(tenantId, query);
            case dashboard_stats_dto_1.DashboardScope.PLATFORM:
                if (userRole !== 'SUPER_ADMIN') {
                    throw new common_1.ForbiddenException('Only SUPER_ADMIN can access platform dashboard');
                }
                return this.getPlatformDashboardStats(query);
            default:
                return this.getTenantDashboardStats(tenantId, query);
        }
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
                    employeeId,
                    tenantId: empTenantId,
                    timestamp: { gte: date, lt: nextDate },
                },
            });
            const hasEntry = dayAttendance.some(a => a.type === client_1.AttendanceType.IN);
            const hasLate = dayAttendance.some(a => a.hasAnomaly && a.anomalyType?.includes('LATE'));
            last7Days.push({
                day: dayNames[date.getDay()],
                date: date.toISOString().split('T')[0],
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
                    tenantId: empTenantId,
                    employeeId: { in: teamEmployeeIds },
                    timestamp: { gte: date, lt: nextDate },
                    type: client_1.AttendanceType.IN,
                },
                select: { employeeId: true, hasAnomaly: true, anomalyType: true },
            });
            const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
            const absent = totalTeamEmployees - new Set(dayAttendance.map(a => a.employeeId)).size;
            last7Days.push({
                day: dayNames[date.getDay()],
                date: date.toISOString().split('T')[0],
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
            const absent = totalDepartmentEmployees - new Set(dayAttendance.map(a => a.employeeId)).size;
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
                    employeeId: { in: siteEmployeeIds },
                    timestamp: { gte: date, lt: nextDate },
                    type: client_1.AttendanceType.IN,
                },
                select: { employeeId: true, hasAnomaly: true, anomalyType: true },
            });
            const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;
            const absent = totalSiteEmployees - new Set(dayAttendance.map(a => a.employeeId)).size;
            last7Days.push({
                day: dayNames[date.getDay()],
                date: date.toISOString().split('T')[0],
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
        if (dto.siteId) {
            where.employee = {
                ...where.employee,
                siteId: dto.siteId,
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
        return {
            data: attendance,
            summary: {
                total: attendance.length,
                anomalies: anomalies.length,
                totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
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
        return {
            data: overtimeRecords,
            summary: {
                total: overtimeRecords.length,
                totalHours,
                totalApprovedHours: overtimeRecords
                    .filter(r => r.status === client_1.OvertimeStatus.APPROVED)
                    .reduce((sum, r) => {
                    const hours = r.approvedHours || r.hours;
                    return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
                }, 0),
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
        employees.forEach(emp => {
            allDays.forEach(day => {
                const dateKey = formatDate(day);
                const hasEntry = employeeAttendanceMap.get(emp.id)?.has(dateKey);
                if (!hasEntry) {
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
            },
            summary: {
                totalAnomalies: anomalies.length,
                totalAbsences: absenceCount,
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
        const payrollData = await Promise.all(employees.map(async (employee) => {
            const attendanceRecords = await this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    timestamp: {
                        gte: startDate,
                        lte: endDate,
                    },
                    type: client_1.AttendanceType.IN,
                },
            });
            const workedDays = attendanceRecords.length;
            const overtimeStats = await this.prisma.overtime.aggregate({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: client_1.OvertimeStatus.APPROVED,
                },
                _sum: {
                    hours: true,
                    approvedHours: true,
                },
            });
            const overtimeHours = overtimeStats._sum.approvedHours || overtimeStats._sum.hours || 0;
            const leaveStats = await this.prisma.leave.aggregate({
                where: {
                    tenantId,
                    employeeId: employee.id,
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
                _sum: {
                    days: true,
                },
            });
            const leaveDays = leaveStats._sum.days || 0;
            const lateRecords = await this.prisma.attendance.findMany({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    timestamp: {
                        gte: startDate,
                        lte: endDate,
                    },
                    hasAnomaly: true,
                    anomalyType: {
                        contains: 'LATE',
                    },
                },
            });
            const absenceCount = await this.prisma.attendance.count({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    timestamp: {
                        gte: startDate,
                        lte: endDate,
                    },
                    anomalyType: {
                        contains: 'ABSENCE',
                    },
                },
            });
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
                overtimeHours: typeof overtimeHours === 'number' ? overtimeHours : parseFloat(String(overtimeHours)) || 0,
                leaveDays,
                lateHours: 0,
                absenceDays: absenceCount,
                totalHours: (workedDays * 8) + (typeof overtimeHours === 'number' ? overtimeHours : parseFloat(String(overtimeHours)) || 0),
            };
        }));
        const totalEmployees = payrollData.length;
        const totalWorkedDays = payrollData.reduce((sum, d) => sum + d.workedDays, 0);
        const totalNormalHours = payrollData.reduce((sum, d) => sum + d.normalHours, 0);
        const totalOvertimeHours = payrollData.reduce((sum, d) => sum + d.overtimeHours, 0);
        const totalLeaveDays = payrollData.reduce((sum, d) => sum + Number(d.leaveDays), 0);
        return {
            data: payrollData,
            summary: {
                totalEmployees,
                totalWorkedDays,
                totalNormalHours,
                totalOvertimeHours,
                totalLeaveDays,
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
        const totalSchedules = planningData.length;
        const uniqueEmployees = new Set(planningData.map(s => s.employee.id)).size;
        const uniqueShifts = new Set(planningData.filter(s => s.shift).map(s => s.shift.id)).size;
        return {
            data: planningData,
            summary: {
                totalSchedules,
                uniqueEmployees,
                uniqueShifts,
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map