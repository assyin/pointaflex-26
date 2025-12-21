import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Dashboard personnel - Vue d'ensemble pour un employé
   */
  async getEmployeeDashboard(tenantId: string, employeeId: string, date: Date) {
    const cacheKey = `dashboard:employee:${tenantId}:${employeeId}:${date.toISOString().split('T')[0]}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    // Requête unique optimisée avec tous les compteurs
    const [attendance, leaves, overtime, todayAttendance] = await Promise.all([
      // Jours travaillés du mois
      this.prisma.attendance.count({
        where: {
          tenantId,
          employeeId,
          timestamp: { gte: startDate, lte: endDate },
          type: 'IN',
        },
      }),

      // Congés du mois
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

      // Heures supplémentaires du mois
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

      // Présence du jour
      this.prisma.attendance.findMany({
        where: {
          tenantId,
          employeeId,
          timestamp: {
            gte: startOfDay(date),
            lte: endOfDay(date)
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

    // Cache pour 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  /**
   * Dashboard équipe - Vue d'ensemble pour un manager
   */
  async getTeamDashboard(tenantId: string, managerId: string, date: Date) {
    const cacheKey = `dashboard:team:${tenantId}:${managerId}:${date.toISOString().split('T')[0]}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Récupérer les équipes gérées par ce manager
    const teams = await this.prisma.team.findMany({
      where: {
        tenantId,
        managerId,
      },
      select: { id: true },
    });

    const teamIds = teams.map(t => t.id);

    // Récupérer les employés de ces équipes
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

    const today = startOfDay(date);
    const todayEnd = endOfDay(date);

    // Requête unique pour toutes les métriques
    const [presentCount, leavesCount, pendingLeaves, pendingOvertime] = await Promise.all([
      // Employés présents aujourd'hui
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

      // Employés en congé aujourd'hui
      this.prisma.leave.count({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          startDate: { lte: date },
          endDate: { gte: date },
          status: 'APPROVED',
        },
      }),

      // Demandes de congé en attente
      this.prisma.leave.count({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          status: 'PENDING',
        },
      }),

      // Heures supplémentaires en attente
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

    // Cache pour 2 minutes (données plus dynamiques)
    await this.cacheManager.set(cacheKey, result, 120000);
    return result;
  }

  /**
   * Dashboard département - Vue d'ensemble pour un département
   */
  async getDepartmentDashboard(tenantId: string, departmentId: string, date: Date) {
    const cacheKey = `dashboard:department:${tenantId}:${departmentId}:${date.toISOString().split('T')[0]}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    // Employés du département
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

    const today = startOfDay(date);
    const todayEnd = endOfDay(date);

    // Requête optimisée avec agrégats
    const [presentCount, monthlyAttendance, monthlyOvertime, monthlyLeaves] = await Promise.all([
      // Présents aujourd'hui
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

      // Heures totales du mois (estimation)
      this.prisma.attendance.count({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          timestamp: { gte: startDate, lte: endDate },
          type: 'IN',
        },
      }),

      // Heures supplémentaires du mois
      this.prisma.overtime.aggregate({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          date: { gte: startDate, lte: endDate },
          status: 'APPROVED',
        },
        _sum: { hours: true },
      }),

      // Jours de congé du mois
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
        totalHours: monthlyAttendance * 8, // Estimation 8h/jour
        overtimeHours: monthlyOvertime._sum.hours || 0,
        leaveDays: monthlyLeaves,
      },
    };

    // Cache pour 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  /**
   * Dashboard site - Vue d'ensemble pour un site
   */
  async getSiteDashboard(tenantId: string, siteId: string, date: Date) {
    const cacheKey = `dashboard:site:${tenantId}:${siteId}:${date.toISOString().split('T')[0]}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Employés du site
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

    const today = startOfDay(date);
    const todayEnd = endOfDay(date);

    // Requête optimisée
    const [presentCount, onLeaveCount] = await Promise.all([
      // Présents aujourd'hui
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

      // En congé aujourd'hui
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

    // Cache pour 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  /**
   * Dashboard tenant - Vue d'ensemble globale
   */
  async getTenantDashboard(tenantId: string, date: Date) {
    const cacheKey = `dashboard:tenant:${tenantId}:${date.toISOString().split('T')[0]}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const today = startOfDay(date);
    const todayEnd = endOfDay(date);
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    // Requête unique optimisée
    const [
      totalEmployees,
      activeSites,
      activeDepartments,
      presentToday,
      onLeaveToday,
      monthlyOvertime,
      pendingLeaves,
      pendingOvertime,
    ] = await Promise.all([
      // Total employés actifs
      this.prisma.employee.count({
        where: { tenantId, isActive: true },
      }),

      // Sites actifs
      this.prisma.site.count({
        where: { tenantId },
      }),

      // Départements actifs
      this.prisma.department.count({
        where: { tenantId },
      }),

      // Présents aujourd'hui
      this.prisma.attendance.findMany({
        where: {
          tenantId,
          timestamp: { gte: today, lte: todayEnd },
          type: 'IN',
        },
        select: { employeeId: true },
        distinct: ['employeeId'],
      }),

      // En congé aujourd'hui
      this.prisma.leave.count({
        where: {
          tenantId,
          startDate: { lte: date },
          endDate: { gte: date },
          status: 'APPROVED',
        },
      }),

      // Heures supplémentaires du mois
      this.prisma.overtime.aggregate({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          status: 'APPROVED',
        },
        _sum: { hours: true },
      }),

      // Demandes en attente
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

    // Cache pour 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);
    return result;
  }

  /**
   * Invalider le cache pour un tenant
   * Note: cache-manager in-memory ne supporte pas les wildcards ni reset()
   * Pour une vraie implémentation Redis, utiliser del avec pattern matching
   */
  async invalidateTenantCache(tenantId: string) {
    // Pour l'instant, on ne peut pas invalider sélectivement avec cache-manager in-memory
    // Les clés expireront automatiquement après le TTL (2-5 minutes)
    // TODO: Implémenter avec Redis pour une meilleure gestion du cache
  }
}
