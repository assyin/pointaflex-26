import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DashboardStatsQueryDto } from './dto/dashboard-stats.dto';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { AttendanceType, LeaveStatus, OvertimeStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(tenantId: string, query: DashboardStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Total employees
    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId, isActive: true },
    });

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

    // Weekly attendance data (last 7 days)
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
          type: AttendanceType.IN,
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
    const endDate = new Date(dto.endDate);

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
}
