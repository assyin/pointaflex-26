import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { LeaveStatus, LegacyRole } from '@prisma/client';
import { getManagerLevel, getManagedEmployeeIds } from '../../common/utils/manager-level.util';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLeaveDto) {
    // Verify employee belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify leave type belongs to tenant
    const leaveType = await this.prisma.leaveType.findFirst({
      where: {
        id: dto.leaveTypeId,
        tenantId,
      },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate days if not provided
    let days = dto.days;
    if (!days) {
      const timeDiff = endDate.getTime() - startDate.getTime();
      days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    }

    // Check for overlapping leaves
    const overlapping = await this.prisma.leave.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: {
          notIn: [LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Leave request overlaps with existing leave');
    }

    return this.prisma.leave.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        days,
        reason: dto.reason,
        document: dto.document,
        status: LeaveStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        leaveType: true,
      },
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: {
      employeeId?: string;
      leaveTypeId?: string;
      status?: LeaveStatus;
      startDate?: string;
      endDate?: string;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Filtrer par employé si l'utilisateur n'a que la permission 'leave.view_own'
    const hasViewAll = userPermissions?.includes('leave.view_all');
    const hasViewOwn = userPermissions?.includes('leave.view_own');
    const hasViewTeam = userPermissions?.includes('leave.view_team');
    const hasViewDepartment = userPermissions?.includes('leave.view_department');
    const hasViewSite = userPermissions?.includes('leave.view_site');

    // IMPORTANT: Détecter si l'utilisateur est un manager, mais seulement s'il n'a pas 'view_all'
    // Les admins avec 'view_all' doivent voir toutes les données, indépendamment de leur statut de manager
    // PRIORITÉ: La permission 'view_all' prime sur le statut de manager
    if (userId && !hasViewAll) {
      const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

      // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
      if (managerLevel.type === 'DEPARTMENT') {
        // Manager de département : filtrer par les employés du département
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'SITE') {
        // Manager régional : filtrer par les employés du site ET département
        const managedEmployeeIds = await getManagedEmployeeIds(this.prisma, managerLevel, tenantId);
        if (managedEmployeeIds.length === 0) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        where.employeeId = { in: managedEmployeeIds };
      } else if (managerLevel.type === 'TEAM') {
        // Manager d'équipe : filtrer par l'équipe de l'utilisateur
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { teamId: true },
        });

        if (employee?.teamId) {
          // Récupérer tous les employés de la même équipe
          const teamMembers = await this.prisma.employee.findMany({
            where: { teamId: employee.teamId, tenantId },
            select: { id: true },
          });

          where.employeeId = {
            in: teamMembers.map(m => m.id),
          };
        } else {
          // Si pas d'équipe, retourner vide
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
      } else if (!hasViewAll && hasViewOwn) {
        // Si pas manager et a seulement 'view_own', filtrer par son propre ID
        const employee = await this.prisma.employee.findFirst({
          where: { userId, tenantId },
          select: { id: true },
        });

        if (employee) {
          where.employeeId = employee.id;
        } else {
          // Si pas d'employé lié, retourner vide
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
      }
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.leaveTypeId) {
      where.leaveTypeId = filters.leaveTypeId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        where.startDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startDate.lte = new Date(filters.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              site: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          leaveType: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leave.count({ where }),
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
    const leave = await this.prisma.leave.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            position: true,
            email: true,
          },
        },
        leaveType: true,
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave not found');
    }

    return leave;
  }

  async update(tenantId: string, id: string, dto: UpdateLeaveDto) {
    const leave = await this.findOne(tenantId, id);

    // Only allow updates if leave is still pending
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Cannot update leave that is not pending');
    }

    // Verify leave type belongs to tenant (if provided)
    if (dto.leaveTypeId) {
      const leaveType = await this.prisma.leaveType.findFirst({
        where: {
          id: dto.leaveTypeId,
          tenantId,
        },
      });

      if (!leaveType) {
        throw new NotFoundException('Leave type not found');
      }
    }

    // Validate dates if provided
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : leave.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : leave.endDate;

      if (endDate < startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.prisma.leave.update({
      where: { id },
      data: {
        ...(dto.leaveTypeId && { leaveTypeId: dto.leaveTypeId }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.days !== undefined && { days: dto.days }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.document !== undefined && { document: dto.document }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        leaveType: true,
      },
    });
  }

  async approve(
    tenantId: string,
    id: string,
    userId: string,
    userRole: LegacyRole,
    dto: ApproveLeaveDto,
  ) {
    const leave = await this.findOne(tenantId, id);

    // Only allow approval if leave is pending or in workflow
    const allowedStatuses = [LeaveStatus.PENDING, LeaveStatus.MANAGER_APPROVED];
    if (!allowedStatuses.includes(leave.status as any)) {
      throw new BadRequestException('Leave cannot be approved at this stage');
    }

    const updateData: any = {};

    // SUPER_ADMIN can approve at any level
    if (userRole === LegacyRole.SUPER_ADMIN) {
      if (dto.status === LeaveStatus.MANAGER_APPROVED) {
        updateData.status = LeaveStatus.MANAGER_APPROVED;
        updateData.managerApprovedBy = userId;
        updateData.managerApprovedAt = new Date();
        updateData.managerComment = dto.comment;
      } else if (dto.status === LeaveStatus.APPROVED || dto.status === LeaveStatus.HR_APPROVED) {
        updateData.status = LeaveStatus.APPROVED;
        updateData.hrApprovedBy = userId;
        updateData.hrApprovedAt = new Date();
        updateData.hrComment = dto.comment;
      } else if (dto.status === LeaveStatus.REJECTED) {
        updateData.status = LeaveStatus.REJECTED;
        // For rejection, only set comment without approval timestamps
        updateData.hrComment = dto.comment;
      }
    }
    // Manager approval
    else if (userRole === LegacyRole.MANAGER) {
      if (dto.status === LeaveStatus.MANAGER_APPROVED) {
        updateData.status = LeaveStatus.MANAGER_APPROVED;
        updateData.managerApprovedBy = userId;
        updateData.managerApprovedAt = new Date();
        updateData.managerComment = dto.comment;
      } else if (dto.status === LeaveStatus.REJECTED) {
        updateData.status = LeaveStatus.REJECTED;
        // For rejection, only set comment without approval timestamps
        updateData.managerComment = dto.comment;
      }
    }
    // HR approval - ONLY after manager approval
    else if (userRole === LegacyRole.ADMIN_RH) {
      // IMPORTANT: RH can only approve/reject if the leave has been approved by manager first
      if (leave.status !== LeaveStatus.MANAGER_APPROVED) {
        throw new ForbiddenException(
          'Vous ne pouvez pas approuver ou rejeter ce congé. Le manager doit d\'abord approuver la demande.'
        );
      }

      if (dto.status === LeaveStatus.APPROVED || dto.status === LeaveStatus.HR_APPROVED) {
        updateData.status = LeaveStatus.APPROVED;
        updateData.hrApprovedBy = userId;
        updateData.hrApprovedAt = new Date();
        updateData.hrComment = dto.comment;
      } else if (dto.status === LeaveStatus.REJECTED) {
        updateData.status = LeaveStatus.REJECTED;
        // For rejection, only set comment without approval timestamps
        updateData.hrComment = dto.comment;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Invalid status transition');
    }

    return this.prisma.leave.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        leaveType: true,
      },
    });
  }

  async cancel(tenantId: string, id: string, userId: string) {
    const leave = await this.findOne(tenantId, id);

    // Only allow cancellation if leave is not already rejected or cancelled
    const rejectedStatuses = [LeaveStatus.REJECTED, LeaveStatus.CANCELLED];
    if (rejectedStatuses.includes(leave.status as any)) {
      throw new BadRequestException('Leave is already rejected or cancelled');
    }

    return this.prisma.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        leaveType: true,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.leave.delete({
      where: { id },
    });
  }

  async getLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createLeaveType(tenantId: string, data: any) {
    return this.prisma.leaveType.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async updateLeaveType(tenantId: string, id: string, data: any) {
    // Verify leave type belongs to tenant
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id, tenantId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return this.prisma.leaveType.update({
      where: { id },
      data,
    });
  }

  async deleteLeaveType(tenantId: string, id: string) {
    // Verify leave type belongs to tenant
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id, tenantId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Check if any leaves use this type
    const leavesCount = await this.prisma.leave.count({
      where: { leaveTypeId: id },
    });

    if (leavesCount > 0) {
      throw new BadRequestException(
        `Cannot delete leave type. ${leavesCount} leave request(s) are using this type.`
      );
    }

    return this.prisma.leaveType.delete({
      where: { id },
    });
  }
}
