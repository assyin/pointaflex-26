import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { BulkMembersDto } from './dto/bulk-members.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTeamDto) {
    // Check if team code already exists for this tenant
    const existing = await this.prisma.team.findFirst({
      where: {
        tenantId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException('Team code already exists');
    }

    // Validate manager if provided
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: {
          id: dto.managerId,
          tenantId,
        },
        include: {
          user: {
            select: {
              role: true,
            },
          },
        },
      });

      if (!manager) {
        throw new NotFoundException('Manager not found');
      }

      // Optional: Check if manager has appropriate role
      // if (manager.user?.role !== 'MANAGER' && manager.user?.role !== 'ADMIN_RH') {
      //   throw new BadRequestException('Manager must have MANAGER or ADMIN_RH role');
      // }
    }

    return this.prisma.team.create({
      data: {
        ...dto,
        tenantId,
        rotationEnabled: dto.rotationEnabled || false,
      },
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      rotationEnabled?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { code: { contains: filters.search, mode: 'insensitive' as const } },
        { description: { contains: filters.search, mode: 'insensitive' as const } },
      ];
    }

    if (filters?.rotationEnabled !== undefined) {
      where.rotationEnabled = filters.rotationEnabled;
    }

    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip,
        take: limit,
        include: {
          employees: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
            },
          },
          _count: {
            select: {
              employees: true,
              schedules: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.team.count({ where }),
    ]);

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

  async findOne(tenantId: string, id: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id,
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
            email: true,
          },
        },
        _count: {
          select: {
            employees: true,
            schedules: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async update(tenantId: string, id: string, dto: UpdateTeamDto) {
    await this.findOne(tenantId, id);

    // Check if new code conflicts with existing team
    if (dto.code) {
      const existing = await this.prisma.team.findFirst({
        where: {
          tenantId,
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Team code already exists');
      }
    }

    // Validate manager if provided
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: {
          id: dto.managerId,
          tenantId,
        },
      });

      if (!manager) {
        throw new NotFoundException('Manager not found');
      }
    }

    return this.prisma.team.update({
      where: { id },
      data: dto,
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.team.delete({
      where: { id },
    });
  }

  async addMember(tenantId: string, teamId: string, dto: AddMemberDto) {
    // Verify team exists
    const team = await this.findOne(tenantId, teamId);

    // Verify employee exists and belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is already in this team
    if (employee.teamId === teamId) {
      throw new ConflictException('Employee is already a member of this team');
    }

    // Update employee's team
    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { teamId },
    });

    // Return updated team
    return this.findOne(tenantId, teamId);
  }

  async removeMember(tenantId: string, teamId: string, employeeId: string) {
    // Verify team exists
    await this.findOne(tenantId, teamId);

    // Verify employee exists and belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is in this team
    if (employee.teamId !== teamId) {
      throw new BadRequestException('Employee is not a member of this team');
    }

    // Remove employee from team
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { teamId: null },
    });

    // Return updated team
    return this.findOne(tenantId, teamId);
  }

  async addMembersBulk(tenantId: string, teamId: string, dto: BulkMembersDto) {
    // Verify team exists
    await this.findOne(tenantId, teamId);

    // Verify all employees exist and belong to tenant
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: dto.employeeIds },
        tenantId,
      },
    });

    if (employees.length !== dto.employeeIds.length) {
      throw new NotFoundException('One or more employees not found');
    }

    // Check for employees already in a team
    const employeesInTeam = employees.filter(emp => emp.teamId === teamId);
    if (employeesInTeam.length > 0) {
      throw new ConflictException(
        `${employeesInTeam.length} employee(s) are already members of this team`
      );
    }

    // Update all employees' team
    await this.prisma.employee.updateMany({
      where: {
        id: { in: dto.employeeIds },
        tenantId,
      },
      data: { teamId },
    });

    // Return updated team
    return this.findOne(tenantId, teamId);
  }

  async removeMembersBulk(tenantId: string, teamId: string, dto: BulkMembersDto) {
    // Verify team exists
    await this.findOne(tenantId, teamId);

    // Verify all employees exist and belong to tenant
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: dto.employeeIds },
        tenantId,
      },
    });

    if (employees.length !== dto.employeeIds.length) {
      throw new NotFoundException('One or more employees not found');
    }

    // Check for employees not in this team
    const employeesNotInTeam = employees.filter(emp => emp.teamId !== teamId);
    if (employeesNotInTeam.length > 0) {
      throw new BadRequestException(
        `${employeesNotInTeam.length} employee(s) are not members of this team`
      );
    }

    // Remove all employees from team
    await this.prisma.employee.updateMany({
      where: {
        id: { in: dto.employeeIds },
        tenantId,
      },
      data: { teamId: null },
    });

    // Return updated team
    return this.findOne(tenantId, teamId);
  }

  async getTeamStats(tenantId: string, teamId: string) {
    // Verify team exists
    const team = await this.findOne(tenantId, teamId);

    // Get current date for presence calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get schedules for today
    const todaySchedules = await this.prisma.schedule.findMany({
      where: {
        teamId,
        date: today,
        tenantId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get schedules for current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthSchedules = await this.prisma.schedule.findMany({
      where: {
        teamId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        tenantId,
      },
    });

    // Get shift distribution
    const shiftDistribution = await this.prisma.schedule.groupBy({
      by: ['shiftId'],
      where: {
        teamId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        tenantId,
      },
      _count: {
        id: true,
      },
    });

    // Get shift details
    const shiftIds = shiftDistribution.map(s => s.shiftId);
    const shifts = await this.prisma.shift.findMany({
      where: {
        id: { in: shiftIds },
        tenantId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    const shiftStats = shiftDistribution.map(dist => {
      const shift = shifts.find(s => s.id === dist.shiftId);
      return {
        shiftId: dist.shiftId,
        shiftName: shift?.name || 'Unknown',
        shiftType: shift?.code || 'CUSTOM',
        count: dist._count.id,
      };
    });

    const totalSchedules = monthSchedules.length;
    const shiftTotal = shiftStats.reduce((sum, s) => sum + s.count, 0);
    const shiftPercentages = shiftStats.map(s => ({
      ...s,
      percentage: shiftTotal > 0 ? Math.round((s.count / shiftTotal) * 100) : 0,
    }));

    return {
      team: {
        id: team.id,
        name: team.name,
        code: team.code,
      },
      members: {
        total: team._count.employees,
        presentToday: todaySchedules.length,
        absentToday: team._count.employees - todaySchedules.length,
      },
      schedules: {
        total: team._count.schedules,
        thisMonth: totalSchedules,
        today: todaySchedules.length,
      },
      shiftDistribution: shiftPercentages,
    };
  }
}
