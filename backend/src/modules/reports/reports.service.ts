import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { DashboardStatsQueryDto, DashboardScope } from './dto/dashboard-stats.dto';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { OvertimeReportDto } from './dto/overtime-report.dto';
import { AbsencesReportDto } from './dto/absences-report.dto';
import { PayrollReportDto } from './dto/payroll-report.dto';
import { PlanningReportDto } from './dto/planning-report.dto';
import { AttendanceType, LeaveStatus, OvertimeStatus, RecoveryDayStatus } from '@prisma/client';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getDashboardStats(
    tenantId: string | null,
    query: DashboardStatsQueryDto,
    userId?: string,
    userRole?: string,
  ) {
    // Créer une clé de cache unique
    const cacheKey = `dashboard:${tenantId || 'null'}:${userId || 'null'}:${query.scope || 'auto'}:${query.startDate || ''}:${query.endDate || ''}`;

    // Vérifier le cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Si aucun scope n'est spécifié, détecter automatiquement le niveau du manager
    let scope = query.scope;
    
    if (!scope && userId && tenantId) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
      if (managerLevel.type === 'DEPARTMENT') {
        scope = DashboardScope.DEPARTMENT;
      } else if (managerLevel.type === 'SITE') {
        scope = DashboardScope.SITE;
      } else if (managerLevel.type === 'TEAM') {
        scope = DashboardScope.TEAM;
      } else {
        scope = DashboardScope.PERSONAL;
      }
    } else {
      scope = scope || DashboardScope.PERSONAL;
    }

    // Valider que l'utilisateur a accès au scope demandé
    this.validateScopeAccess(scope, userRole);

    // Router vers la bonne méthode selon le scope
    let result;
    switch (scope) {
      case DashboardScope.PERSONAL:
        if (!userId) {
          throw new ForbiddenException('User ID required for personal dashboard');
        }
        result = await this.getPersonalDashboardStats(userId, tenantId, query);
        break;

      case DashboardScope.TEAM:
        if (!userId) {
          throw new ForbiddenException('User ID required for team dashboard');
        }
        result = await this.getTeamDashboardStats(userId, tenantId, query);
        break;

      case DashboardScope.DEPARTMENT:
        if (!userId || !tenantId) {
          throw new ForbiddenException('User ID and Tenant ID required for department dashboard');
        }
        result = await this.getDepartmentDashboardStats(userId, tenantId, query);
        break;

      case DashboardScope.SITE:
        if (!userId || !tenantId) {
          throw new ForbiddenException('User ID and Tenant ID required for site dashboard');
        }
        result = await this.getSiteDashboardStats(userId, tenantId, query);
        break;

      case DashboardScope.TENANT:
        if (!tenantId) {
          throw new ForbiddenException('Tenant ID required for tenant dashboard');
        }
        result = await this.getTenantDashboardStats(tenantId, query);
        break;

      case DashboardScope.PLATFORM:
        if (userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenException('Only SUPER_ADMIN can access platform dashboard');
        }
        result = await this.getPlatformDashboardStats(query);
        break;

      default:
        result = await this.getTenantDashboardStats(tenantId!, query);
    }

    // Mettre en cache le résultat (5 minutes)
    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  /**
   * Valide que l'utilisateur a accès au scope demandé
   */
  private validateScopeAccess(scope: DashboardScope, userRole?: string): void {
    switch (scope) {
      case DashboardScope.PERSONAL:
        // Tous les utilisateurs peuvent accéder à leur dashboard personnel
        return;

      case DashboardScope.TEAM:
        // Seuls MANAGER, ADMIN_RH et SUPER_ADMIN peuvent accéder au dashboard équipe
        if (userRole !== 'MANAGER' && userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenException('Insufficient permissions for team dashboard');
        }
        return;

      case DashboardScope.DEPARTMENT:
        // Seuls MANAGER (de département), ADMIN_RH et SUPER_ADMIN peuvent accéder au dashboard département
        if (userRole !== 'MANAGER' && userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenException('Insufficient permissions for department dashboard');
        }
        return;

      case DashboardScope.SITE:
        // Seuls MANAGER (de site), ADMIN_RH et SUPER_ADMIN peuvent accéder au dashboard site
        if (userRole !== 'MANAGER' && userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenException('Insufficient permissions for site dashboard');
        }
        return;

      case DashboardScope.TENANT:
        // Seuls ADMIN_RH et SUPER_ADMIN peuvent accéder au dashboard tenant
        if (userRole !== 'ADMIN_RH' && userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenException('Insufficient permissions for tenant dashboard');
        }
        return;

      case DashboardScope.PLATFORM:
        // Seul SUPER_ADMIN peut accéder au dashboard platform
        if (userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenException('Only SUPER_ADMIN can access platform dashboard');
        }
        return;

      default:
        throw new ForbiddenException('Invalid dashboard scope');
    }
  }

  /**
   * Dashboard personnel (EMPLOYEE)
   */
  async getPersonalDashboardStats(userId: string, tenantId: string | null, query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Récupérer l'employé lié à l'utilisateur
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
      throw new ForbiddenException('User is not linked to an employee');
    }

    const employeeId = user.employee.id;
    const empTenantId = user.employee.tenantId;

    // Statistiques personnelles
    const attendanceEntries = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        tenantId: empTenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        type: AttendanceType.IN,
      },
      select: {
        timestamp: true,
        hasAnomaly: true,
        anomalyType: true,
      },
    });

    const workedDays = new Set(
      attendanceEntries.map((a) => {
        const date = new Date(a.timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      })
    ).size;

    const lateCount = attendanceEntries.filter(
      (a) => a.hasAnomaly && a.anomalyType?.includes('LATE')
    ).length;

    // Heures travaillées (simplifié - à améliorer avec calcul réel)
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

    // Heures supplémentaires
    const overtimeStats = await this.prisma.overtime.aggregate({
      where: {
        employeeId,
        tenantId: empTenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: OvertimeStatus.APPROVED,
      },
      _sum: { hours: true },
      _count: { id: true },
    });

    // Congés
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
          in: [LeaveStatus.APPROVED, LeaveStatus.HR_APPROVED],
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
          in: [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED],
        },
      },
    });

    const pendingOvertime = await this.prisma.overtime.count({
      where: {
        employeeId,
        tenantId: empTenantId,
        status: OvertimeStatus.PENDING,
      },
    });

    // OPTIMISATION: Graphiques personnels (7 derniers jours) - Une seule requête au lieu de 7
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const startDate7Days = new Date();
    startDate7Days.setDate(startDate7Days.getDate() - 6);
    startDate7Days.setHours(0, 0, 0, 0);
    const endDate7Days = new Date();
    endDate7Days.setHours(23, 59, 59, 999);

    // Une seule requête pour récupérer toutes les données des 7 derniers jours
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

    // Grouper par jour en mémoire
    const attendanceByDay = new Map<string, typeof all7DaysAttendance>();
    all7DaysAttendance.forEach((a) => {
      const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
      if (!attendanceByDay.has(dateKey)) {
        attendanceByDay.set(dateKey, []);
      }
      attendanceByDay.get(dateKey)!.push(a);
    });

    // Construire le tableau des 7 derniers jours
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      const dayAttendance = attendanceByDay.get(dateKey) || [];

      const hasEntry = dayAttendance.some(a => a.type === AttendanceType.IN);
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
        totalHours: Math.floor(totalAttendances / 2), // Approximation
        lateCount,
        overtimeHours: overtimeStats._sum.hours || 0,
        leaveDays: leaveStats._sum.days || 0,
      },
      weeklyAttendance: last7Days,
    };
  }

  /**
   * Dashboard équipe (MANAGER)
   */
  async getTeamDashboardStats(userId: string, tenantId: string | null, query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Récupérer l'employé et son équipe
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
      throw new ForbiddenException('User is not linked to an employee with a team');
    }

    const team = user.employee.team;
    const teamId = team.id;
    const empTenantId = user.employee.tenantId;
    const teamEmployeeIds = team.employees.map(e => e.id);

    // Statistiques de l'équipe
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
        type: AttendanceType.IN,
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
          in: [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED],
        },
      },
    });

    const pendingOvertime = await this.prisma.overtime.count({
      where: {
        tenantId: empTenantId,
        employeeId: { in: teamEmployeeIds },
        status: OvertimeStatus.PENDING,
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
        status: OvertimeStatus.APPROVED,
      },
      _sum: { hours: true },
      _count: { id: true },
    });

    const attendanceRate = totalTeamEmployees > 0
      ? ((activeToday.length / totalTeamEmployees) * 100).toFixed(1)
      : 0;

    // OPTIMISATION: Graphiques équipe (7 derniers jours) - Une seule requête au lieu de 7
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
        type: AttendanceType.IN,
      },
      select: { employeeId: true, hasAnomaly: true, anomalyType: true, timestamp: true },
    });

    // Grouper par jour en mémoire
    const attendanceByDay = new Map<string, typeof all7DaysAttendance>();
    all7DaysAttendance.forEach((a) => {
      const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
      if (!attendanceByDay.has(dateKey)) {
        attendanceByDay.set(dateKey, []);
      }
      attendanceByDay.get(dateKey)!.push(a);
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      const dayAttendance = attendanceByDay.get(dateKey) || [];

      const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;

      // Calcul correct des absences basé sur les schedules
      const attendanceEmployeeIds = new Set(dayAttendance.map(a => a.employeeId));
      const absent = await this.calculateAbsencesForDay(
        empTenantId,
        teamEmployeeIds,
        date,
        attendanceEmployeeIds,
      );

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

  /**
   * Dashboard département (Manager de Direction)
   */
  async getDepartmentDashboardStats(userId: string, tenantId: string, query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Récupérer le niveau hiérarchique du manager
    const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);
    
    if (managerLevel.type !== 'DEPARTMENT' || !managerLevel.departmentId) {
      throw new ForbiddenException('User is not a department manager');
    }

    // Récupérer le département
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
      throw new ForbiddenException('Department not found');
    }

    const departmentEmployeeIds = department.employees.map(e => e.id);
    const totalDepartmentEmployees = department.employees.length;

    // Récupérer tous les sites du département (via les employés)
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
        type: AttendanceType.IN,
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
          in: [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED],
        },
      },
    });

    const pendingOvertime = await this.prisma.overtime.count({
      where: {
        tenantId,
        employeeId: { in: departmentEmployeeIds },
        status: OvertimeStatus.PENDING,
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
        status: OvertimeStatus.APPROVED,
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
        status: LeaveStatus.APPROVED,
      },
      _sum: { days: true },
      _count: { id: true },
    });

    const attendanceRate = totalDepartmentEmployees > 0
      ? ((activeToday.length / totalDepartmentEmployees) * 100).toFixed(1)
      : 0;

    // Graphiques département (7 derniers jours)
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
          type: AttendanceType.IN,
        },
        select: { employeeId: true, hasAnomaly: true, anomalyType: true },
      });

      const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;

      // Calcul correct des absences basé sur les schedules
      const attendanceEmployeeIds = new Set(dayAttendance.map(a => a.employeeId));
      const absent = await this.calculateAbsencesForDay(
        tenantId,
        departmentEmployeeIds,
        date,
        attendanceEmployeeIds,
      );

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

  /**
   * Dashboard site (Manager Régional)
   * Si le manager gère plusieurs sites, il peut spécifier le siteId en query
   * Sinon, les stats du premier site géré seront retournées
   */
  async getSiteDashboardStats(userId: string, tenantId: string, query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Récupérer le niveau hiérarchique du manager
    const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

    if (managerLevel.type !== 'SITE' || !managerLevel.siteIds || managerLevel.siteIds.length === 0) {
      throw new ForbiddenException('User is not a site manager');
    }

    // Déterminer quel site afficher
    // Si un siteId spécifique est demandé en query et que le manager y a accès, l'utiliser
    // Sinon, utiliser le premier site géré
    let targetSiteId: string;
    if (query.siteId && managerLevel.siteIds.includes(query.siteId)) {
      targetSiteId = query.siteId;
    } else {
      targetSiteId = managerLevel.siteIds[0]; // Premier site par défaut
    }

    // IMPORTANT: Pour un manager régional, filtrer uniquement les employés de son département dans le site
    // Utiliser getManagedEmployeeIds pour obtenir la liste correcte des employés
    const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);

    // Récupérer le site
    const site = await this.prisma.site.findFirst({
      where: {
        id: targetSiteId,
        tenantId,
      },
      include: {
        employees: {
          where: { 
            isActive: true,
            // IMPORTANT: Filtrer uniquement les employés gérés par ce manager régional
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
      throw new ForbiddenException('Site not found');
    }

    const siteEmployeeIds = site.employees.map(e => e.id);
    const totalSiteEmployees = site.employees.length;

    // IMPORTANT: Pour un manager régional, n'afficher que son département
    // Récupérer les départements présents sur le site (filtrés par les employés gérés)
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
        type: AttendanceType.IN,
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
          in: [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED],
        },
      },
    });

    const pendingOvertime = await this.prisma.overtime.count({
      where: {
        tenantId,
        employeeId: { in: siteEmployeeIds },
        status: OvertimeStatus.PENDING,
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
        status: OvertimeStatus.APPROVED,
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
        status: LeaveStatus.APPROVED,
      },
      _sum: { days: true },
      _count: { id: true },
    });

    const attendanceRate = totalSiteEmployees > 0
      ? ((activeToday.length / totalSiteEmployees) * 100).toFixed(1)
      : 0;

    // OPTIMISATION: Graphiques site (7 derniers jours) - Une seule requête au lieu de 7
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
        type: AttendanceType.IN,
      },
      select: { employeeId: true, hasAnomaly: true, anomalyType: true, timestamp: true },
    });

    // Grouper par jour en mémoire
    const attendanceByDay = new Map<string, typeof all7DaysAttendance>();
    all7DaysAttendance.forEach((a) => {
      const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
      if (!attendanceByDay.has(dateKey)) {
        attendanceByDay.set(dateKey, []);
      }
      attendanceByDay.get(dateKey)!.push(a);
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

  /**
   * Dashboard plateforme (SUPER_ADMIN)
   */
  async getPlatformDashboardStats(query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Statistiques globales de la plateforme (tous les tenants)
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
        type: AttendanceType.IN,
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
          in: [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED],
        },
      },
    });

    const pendingOvertime = await this.prisma.overtime.count({
      where: {
        status: OvertimeStatus.PENDING,
      },
    });

    const overtimeStats = await this.prisma.overtime.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: OvertimeStatus.APPROVED,
      },
      _sum: { hours: true },
      _count: { id: true },
    });

    const leaveStats = await this.prisma.leave.aggregate({
      where: {
        startDate: { gte: startDate },
        endDate: { lte: endDate },
        status: {
          in: [LeaveStatus.APPROVED, LeaveStatus.HR_APPROVED],
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

  /**
   * Dashboard tenant (ADMIN_RH) - Méthode existante
   */
  async getTenantDashboardStats(tenantId: string, query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Ajouter scope au retour
    const result = await this.getTenantDashboardStatsInternal(tenantId, query);
    return {
      ...result,
      scope: 'tenant',
    };
  }

  /**
   * Méthode interne pour le dashboard tenant (logique existante)
   */
  private async getTenantDashboardStatsInternal(tenantId: string, query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Total employees
    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId, isActive: true },
    });

    // Récupérer les IDs des employés actifs pour le calcul des absences
    const allActiveEmployees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    const allActiveEmployeeIds = allActiveEmployees.map(e => e.id);

    // Active employees today (with attendance)
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
        type: AttendanceType.IN,
      },
    });

    // Pending leaves
    const pendingLeaves = await this.prisma.leave.count({
      where: {
        tenantId,
        status: {
          in: [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED],
        },
      },
    });

    // Pending overtime
    const pendingOvertime = await this.prisma.overtime.count({
      where: {
        tenantId,
        status: OvertimeStatus.PENDING,
      },
    });

    // Attendance summary for period
    const attendanceCount = await this.prisma.attendance.count({
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Anomalies count
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

    // Overtime stats
    const overtimeStats = await this.prisma.overtime.aggregate({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: OvertimeStatus.APPROVED,
      },
      _sum: {
        hours: true,
      },
      _count: {
        id: true,
      },
    });

    // Leave stats
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
          in: [LeaveStatus.APPROVED, LeaveStatus.HR_APPROVED],
        },
      },
      _sum: {
        days: true,
      },
      _count: {
        id: true,
      },
    });

    // Attendance rate calculation
    const attendanceRate = totalEmployees > 0
      ? ((activeToday.length / totalEmployees) * 100).toFixed(1)
      : 0;

    // OPTIMISATION: Weekly attendance data (last 7 days) - Une seule requête au lieu de 7
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
        type: AttendanceType.IN,
      },
      select: { employeeId: true, hasAnomaly: true, anomalyType: true, timestamp: true },
    });

    // Grouper par jour en mémoire
    const attendanceByDay = new Map<string, typeof all7DaysAttendance>();
    all7DaysAttendance.forEach((a) => {
      const dateKey = new Date(a.timestamp).toISOString().split('T')[0];
      if (!attendanceByDay.has(dateKey)) {
        attendanceByDay.set(dateKey, []);
      }
      attendanceByDay.get(dateKey)!.push(a);
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      const dayAttendance = attendanceByDay.get(dateKey) || [];

      const late = dayAttendance.filter(a => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;

      // Calcul correct des absences basé sur les schedules
      const attendanceEmployeeIds = new Set(dayAttendance.map(a => a.employeeId));
      const absent = await this.calculateAbsencesForDay(
        tenantId,
        allActiveEmployeeIds,
        date,
        attendanceEmployeeIds,
      );

      last7Days.push({
        day: dayNames[date.getDay()],
        date: dateKey,
        retards: late,
        absences: absent,
      });
    }

    // Shift distribution
    const shifts = await this.prisma.shift.findMany({
      where: { tenantId },
      select: { id: true, name: true, _count: { select: { employees: true } } },
    });

    const shiftDistribution = shifts.map(shift => ({
      name: shift.name,
      value: shift._count.employees,
    }));

    // Overtime trend (last 4 weeks)
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
          status: OvertimeStatus.APPROVED,
        },
        _sum: { hours: true },
      });

      overtimeTrend.push({
        semaine: `S${4 - i}`,
        heures: weekOvertime._sum.hours || 0,
      });
    }

    // Late count (last 7 days)
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
      // KPIs
      attendanceRate: Number(attendanceRate),
      lates: lateCount,
      totalPointages: attendanceCount,
      overtimeHours: overtimeStats._sum.hours || 0,

      // Detailed stats
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

      // Chart data
      weeklyAttendance: last7Days,
      shiftDistribution,
      overtimeTrend,
      anomalies: anomaliesCount,
    };
  }

  async getAttendanceReport(tenantId: string, dto: AttendanceReportDto) {
    const startDate = new Date(dto.startDate);
    startDate.setHours(0, 0, 0, 0); // Début de la journée
    
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999); // Fin de la journée

    const where: any = {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (dto.employeeId) {
      where.employeeId = dto.employeeId;
    }

    // Construire les filtres employee de manière cumulative
    const employeeFilters: any = {};
    if (dto.departmentId) {
      employeeFilters.departmentId = dto.departmentId;
    }
    if (dto.teamId) {
      employeeFilters.teamId = dto.teamId;
    }
    if (dto.siteId) {
      employeeFilters.siteId = dto.siteId;
    }
    
    // Ajouter les filtres employee seulement s'il y en a
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

    // Calculer les heures travaillées réelles
    const dailyAttendance = new Map<string, { in?: Date; out?: Date; employeeId: string }>();
    
    attendance.forEach(record => {
      const dateKey = `${record.employeeId}_${new Date(record.timestamp).toISOString().split('T')[0]}`;
      
      if (!dailyAttendance.has(dateKey)) {
        dailyAttendance.set(dateKey, { employeeId: record.employeeId });
      }
      
      const dayData = dailyAttendance.get(dateKey)!;
      if (record.type === AttendanceType.IN && !dayData.in) {
        dayData.in = new Date(record.timestamp);
      } else if (record.type === AttendanceType.OUT) {
        dayData.out = new Date(record.timestamp);
      }
    });

    // Calculer les heures totales
    let totalWorkedHours = 0;
    dailyAttendance.forEach((dayData) => {
      if (dayData.in && dayData.out) {
        const diffMs = dayData.out.getTime() - dayData.in.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        totalWorkedHours += diffHours;
      }
    });

    // Statistiques par jour
    const byDay = new Map<string, { total: number; anomalies: number; employees: Set<string> }>();
    attendance.forEach(record => {
      const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, { total: 0, anomalies: 0, employees: new Set() });
      }
      const dayStats = byDay.get(dateKey)!;
      dayStats.total++;
      dayStats.employees.add(record.employeeId);
      if (record.hasAnomaly) {
        dayStats.anomalies++;
      }
    });

    const anomalies = attendance.filter(a => a.hasAnomaly);
    const uniqueEmployees = new Set(attendance.map(a => a.employeeId)).size;
    const totalDays = byDay.size;

    // AJOUT: Récupérer les journées de récupération dans la période
    const employeeIds = dto.employeeId ? [dto.employeeId] : Array.from(new Set(attendance.map(a => a.employeeId)));
    const recoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId: employeeIds.length > 0 ? { in: employeeIds } : undefined,
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED] },
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

    // Calculer les heures de récupération
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
      recoveryDays: recoveryDays, // NOUVEAU
      summary: {
        total: attendance.length,
        anomalies: anomalies.length,
        totalWorkedHours: Math.round((totalWorkedHours + totalRecoveryHours) * 10) / 10, // MODIFIÉ: inclure les récupérations
        totalRecoveryHours: Math.round(totalRecoveryHours * 10) / 10, // NOUVEAU
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

  async getEmployeeReport(tenantId: string, employeeId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Employee info
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

    // Attendance stats
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

    // Overtime
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

    // Leaves
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

    // Schedules
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

  async getTeamReport(tenantId: string, teamId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Team info
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

    // Attendance count
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

    // Overtime
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

    // Leaves
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

  /**
   * Rapport heures supplémentaires
   */
  async getOvertimeReport(tenantId: string, dto: OvertimeReportDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const where: any = {
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

    // Filtres par employé (département, site, équipe)
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

    // Calculs de statistiques
    const totalHours = overtimeRecords.reduce((sum, record) => {
      const hours = record.approvedHours || record.hours;
      return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
    }, 0);

    const byStatus = overtimeRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = overtimeRecords.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // AJOUT: Récupérer les récupérations converties depuis heures supp dans la période
    const employeeIds = overtimeRecords.map(r => r.employeeId);
    const recoveryDaysFromOvertime = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId: employeeIds.length > 0 ? { in: employeeIds } : undefined,
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED] },
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

    // Calculer les heures supp converties en récupération
    let totalHoursConvertedToRecovery = 0;
    recoveryDaysFromOvertime.forEach(rd => {
      totalHoursConvertedToRecovery += Number(rd.sourceHours);
    });

    return {
      data: overtimeRecords,
      recoveryDays: recoveryDaysFromOvertime, // NOUVEAU
      summary: {
        total: overtimeRecords.length,
        totalHours,
        totalApprovedHours: overtimeRecords
          .filter(r => r.status === OvertimeStatus.APPROVED)
          .reduce((sum, r) => {
            const hours = r.approvedHours || r.hours;
            return sum + (typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0);
          }, 0),
        totalHoursConvertedToRecovery: Math.round(totalHoursConvertedToRecovery * 10) / 10, // NOUVEAU
        totalHoursPaid: Math.round((totalHours - totalHoursConvertedToRecovery) * 10) / 10, // MODIFIÉ
        byStatus,
        byType,
        period: {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      },
    };
  }

  /**
   * Rapport retards et absences
   */
  async getAbsencesReport(tenantId: string, dto: AbsencesReportDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Construire le where pour les employés
    const employeeWhere: any = {
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

    // Récupérer les employés concernés
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

    // Récupérer les pointages avec anomalies (retards, absences)
    const attendanceWhere: any = {
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

    // Fonction helper pour formater les dates
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Calculer les absences (jours sans pointage d'entrée)
    const allDays = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const absences: any[] = [];
    const employeeAttendanceMap = new Map<string, Set<string>>();

    // Grouper les pointages par employé et par jour
    anomalies.forEach(att => {
      const dateKey = formatDate(new Date(att.timestamp));
      if (!employeeAttendanceMap.has(att.employeeId)) {
        employeeAttendanceMap.set(att.employeeId, new Set());
      }
      employeeAttendanceMap.get(att.employeeId)!.add(dateKey);
    });

    // AJOUT: Récupérer les journées de récupération pour exclure des absences
    const recoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId: dto.employeeId ? dto.employeeId : { in: employeeIds },
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } }
        ]
      }
    });

    // Créer un map des jours de récupération par employé
    const recoveryDaysMap = new Map<string, Set<string>>();
    recoveryDays.forEach(rd => {
      if (!recoveryDaysMap.has(rd.employeeId)) {
        recoveryDaysMap.set(rd.employeeId, new Set());
      }
      const rdStart = new Date(rd.startDate);
      const rdEnd = new Date(rd.endDate);
      const currentDate = new Date(rdStart);
      while (currentDate <= rdEnd) {
        recoveryDaysMap.get(rd.employeeId)!.add(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Identifier les absences (jours sans entrée)
    employees.forEach(emp => {
      allDays.forEach(day => {
        const dateKey = formatDate(day);
        const hasEntry = employeeAttendanceMap.get(emp.id)?.has(dateKey);
        const isRecoveryDay = recoveryDaysMap.get(emp.id)?.has(dateKey);
        
        if (!hasEntry && !isRecoveryDay) {
          // Vérifier si c'est un jour ouvrable (simplifié - à améliorer)
          const dayOfWeek = day.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Pas dimanche ni samedi
            absences.push({
              employee: emp,
              date: dateKey,
              type: 'ABSENCE',
            });
          }
        }
      });
    });

    // Statistiques
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
        recoveryDays: recoveryDays, // NOUVEAU
      },
      summary: {
        totalAnomalies: anomalies.length,
        totalAbsences: absenceCount,
        totalRecoveryDays: recoveryDays.length, // NOUVEAU
        lateCount,
        earlyLeaveCount,
        period: {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      },
    };
  }

  /**
   * Rapport export paie
   */
  async getPayrollReport(tenantId: string, dto: PayrollReportDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Construire le where pour les employés
    const employeeWhere: any = {
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

    // Récupérer les employés concernés
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

    // OPTIMISATION: Récupérer toutes les données en une seule fois au lieu de requêtes par employé

    // 1. Tous les pointages d'entrée pour tous les employés
    const allAttendanceRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        type: AttendanceType.IN,
      },
      select: {
        employeeId: true,
      },
    });

    // 2. Toutes les heures supplémentaires approuvées
    const allOvertimeRecords = await this.prisma.overtime.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: OvertimeStatus.APPROVED,
      },
      select: {
        employeeId: true,
        hours: true,
        approvedHours: true,
      },
    });

    // 3. Tous les congés approuvés
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
          in: [LeaveStatus.APPROVED, LeaveStatus.HR_APPROVED],
        },
      },
      select: {
        employeeId: true,
        days: true,
      },
    });

    // 4. Toutes les anomalies d'absences
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

    // AJOUT: 5. Toutes les journées de récupération
    const allRecoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: {
        employeeId: true,
        days: true,
        sourceHours: true,
      },
    });

    // Grouper les données par employé en mémoire
    const attendanceByEmployee = new Map<string, number>();
    const overtimeByEmployee = new Map<string, number>();
    const leaveByEmployee = new Map<string, number>();
    const absenceByEmployee = new Map<string, number>();
    const recoveryDaysByEmployee = new Map<string, { days: number; hours: number }>();

    // Compter les pointages par employé
    allAttendanceRecords.forEach(record => {
      attendanceByEmployee.set(record.employeeId, (attendanceByEmployee.get(record.employeeId) || 0) + 1);
    });

    // Sommer les heures supplémentaires par employé
    allOvertimeRecords.forEach(record => {
      const hours = Number(record.approvedHours || record.hours || 0);
      overtimeByEmployee.set(record.employeeId, (overtimeByEmployee.get(record.employeeId) || 0) + hours);
    });

    // Sommer les jours de congé par employé
    allLeaveRecords.forEach(record => {
      const days = Number(record.days || 0);
      leaveByEmployee.set(record.employeeId, (leaveByEmployee.get(record.employeeId) || 0) + days);
    });

    // Compter les absences par employé
    allAbsenceRecords.forEach(record => {
      absenceByEmployee.set(record.employeeId, (absenceByEmployee.get(record.employeeId) || 0) + 1);
    });

    // AJOUT: Grouper les récupérations par employé
    allRecoveryDays.forEach(record => {
      const existing = recoveryDaysByEmployee.get(record.employeeId) || { days: 0, hours: 0 };
      recoveryDaysByEmployee.set(record.employeeId, {
        days: existing.days + Number(record.days),
        hours: existing.hours + Number(record.sourceHours),
      });
    });

    // Construire les données de paie pour chaque employé
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
        normalHours: workedDays * 8, // Approximation - à améliorer avec calcul réel
        overtimeHours,
        leaveDays,
        lateHours: 0, // À calculer à partir des retards
        absenceDays,
        recoveryDays: recoveryDays.days,
        recoveryHours: recoveryDays.hours,
        totalHours: (workedDays * 8) + overtimeHours,
      };
    });

    // Statistiques globales
    const totalEmployees = payrollData.length;
    const totalWorkedDays = payrollData.reduce((sum, d) => sum + d.workedDays, 0);
    const totalNormalHours = payrollData.reduce((sum, d) => sum + d.normalHours, 0);
    const totalOvertimeHours = payrollData.reduce((sum, d) => sum + d.overtimeHours, 0);
    const totalLeaveDays = payrollData.reduce((sum, d) => sum + Number(d.leaveDays), 0);
    const totalRecoveryDays = payrollData.reduce((sum, d) => sum + d.recoveryDays, 0); // NOUVEAU
    const totalRecoveryHours = payrollData.reduce((sum, d) => sum + d.recoveryHours, 0); // NOUVEAU

    return {
      data: payrollData,
      summary: {
        totalEmployees,
        totalWorkedDays,
        totalNormalHours,
        totalOvertimeHours,
        totalLeaveDays,
        totalRecoveryDays, // NOUVEAU
        totalRecoveryHours, // NOUVEAU
        totalHours: totalNormalHours + totalOvertimeHours + totalRecoveryHours, // MODIFIÉ
        period: {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      },
    };
  }

  /**
   * Rapport Planning/Shifts
   */
  async getPlanningReport(tenantId: string, dto: any) {
    const where: any = {
      tenantId,
      date: {
        gte: new Date(dto.startDate),
        lte: new Date(dto.endDate),
      },
    };

    if (dto.employeeId) where.employeeId = dto.employeeId;
    if (dto.departmentId) where.employee = { departmentId: dto.departmentId };
    if (dto.siteId) where.employee = { ...where.employee, siteId: dto.siteId };
    if (dto.teamId) where.employee = { ...where.employee, teamId: dto.teamId };
    if (dto.shiftId) where.shiftId = dto.shiftId;

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
    }) as any[];

    const planningData = schedules.map((schedule: any) => ({
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

    // AJOUT: Récupérer les journées de récupération dans la période
    const employeeIds = schedules.map((s: any) => s.employee.id);
    const recoveryDays = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId: employeeIds.length > 0 ? { in: employeeIds } : undefined,
        status: { in: [RecoveryDayStatus.APPROVED, RecoveryDayStatus.USED] },
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

    // Transformer en format planning
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

    // Statistiques
    const totalSchedules = planningData.length;
    const uniqueEmployees = new Set(planningData.map(s => s.employee.id)).size;
    const uniqueShifts = new Set(planningData.filter(s => s.shift).map(s => s.shift.id)).size;

    return {
      data: [...planningData, ...recoveryDaysAsPlanning],
      summary: {
        totalSchedules: totalSchedules + recoveryDays.length,
        uniqueEmployees,
        uniqueShifts,
        totalRecoveryDays: recoveryDays.length, // NOUVEAU
        period: {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      },
    };
  }

  /**
   * Historique des rapports générés
   */
  async getReportHistory(tenantId: string, userId?: string) {
    const where: any = {
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
      take: 50, // Limiter à 50 derniers rapports
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

  /**
   * Calcule le nombre d'absences pour un jour donné en tenant compte des schedules
   *
   * Logique:
   * 1. Récupère les employés avec schedules PUBLISHED pour le jour
   * 2. Vérifie si le shift est terminé (fin du shift + buffer)
   * 3. Exclut les employés en congé approuvé
   * 4. Compte ceux qui n'ont pas de pointage IN
   *
   * @param tenantId - ID du tenant
   * @param employeeIds - Liste des IDs des employés à vérifier
   * @param date - Date du jour à vérifier
   * @param attendanceEmployeeIds - Set des IDs des employés ayant pointé IN
   * @returns Nombre d'absences
   */
  private async calculateAbsencesForDay(
    tenantId: string,
    employeeIds: string[],
    date: Date,
    attendanceEmployeeIds: Set<string>,
  ): Promise<number> {
    const now = new Date();
    const bufferMinutes = 60; // Buffer par défaut après fin du shift


    // Début et fin de la journée
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCMilliseconds(-1);

    // 1. Récupérer les schedules PUBLISHED pour ce jour et ces employés
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'PUBLISHED',
        suspendedByLeaveId: null, // Exclure schedules suspendus par congé
      },
      include: {
        shift: true,
        employee: {
          select: { id: true, userId: true },
        },
      },
    });

    if (schedules.length === 0) {
      return 0; // Pas de schedules = pas d'absences à détecter
    }

    // 2. Récupérer les congés approuvés pour ce jour
    const approvedLeaves = await this.prisma.leave.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        status: LeaveStatus.APPROVED,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { employeeId: true },
    });
    const employeesOnLeave = new Set(approvedLeaves.map(l => l.employeeId));

    // 3. Récupérer les récupérations approuvées pour ce jour
    const approvedRecoveries = await this.prisma.recoveryDay.findMany({
      where: {
        tenantId,
        employeeId: { in: employeeIds },
        status: RecoveryDayStatus.APPROVED,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { employeeId: true },
    });
    const employeesOnRecovery = new Set(approvedRecoveries.map(r => r.employeeId));

    let absenceCount = 0;

    for (const schedule of schedules) {
      const employeeId = schedule.employeeId;

      // Exclure si en congé ou récupération
      if (employeesOnLeave.has(employeeId) || employeesOnRecovery.has(employeeId)) {
        continue;
      }

      // Vérifier si le shift est terminé (seulement pour les jours passés ou si shift terminé)
      const shiftEndTime = schedule.customEndTime || schedule.shift?.endTime || '18:00';
      const [endHour, endMinute] = shiftEndTime.split(':').map(Number);

      // Créer la date de fin du shift
      const shiftEndDate = new Date(date);
      shiftEndDate.setHours(endHour, endMinute, 0, 0);

      // Ajouter le buffer
      const detectionTime = new Date(shiftEndDate.getTime() + bufferMinutes * 60 * 1000);

      // Gérer les shifts de nuit
      const shiftStartTime = schedule.customStartTime || schedule.shift?.startTime || '08:00';
      const [startHour] = shiftStartTime.split(':').map(Number);
      const isNightShift = endHour < startHour;

      // Pour les jours passés, on considère le shift comme terminé
      // IMPORTANT: Utiliser les dates locales pour la comparaison (pas UTC)
      const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isDateInPast = dateLocal.getTime() < nowLocal.getTime();

      // Si c'est aujourd'hui et le shift n'est pas terminé, ne pas compter comme absent
      if (!isDateInPast && now < detectionTime && !isNightShift) {
        continue;
      }

      // Vérifier si l'employé a pointé IN
      if (!attendanceEmployeeIds.has(employeeId)) {
        absenceCount++;
      }
    }

    return absenceCount;
  }

  /**
   * Rapport jours supplémentaires (weekend/férié)
   */
  async getSupplementaryDaysReport(tenantId: string, dto: OvertimeReportDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    const where: any = {
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

    // Filtres par employé (département, site, équipe)
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

    // Calculs de statistiques
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
    }, {} as Record<string, number>);

    const byType = supplementaryDaysRecords.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
}
