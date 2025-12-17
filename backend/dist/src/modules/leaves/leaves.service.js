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
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let LeavesService = class LeavesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: dto.employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const leaveType = await this.prisma.leaveType.findFirst({
            where: {
                id: dto.leaveTypeId,
                tenantId,
            },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('Leave type not found');
        }
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (endDate < startDate) {
            throw new common_1.BadRequestException('End date must be after start date');
        }
        let days = dto.days;
        if (!days) {
            const timeDiff = endDate.getTime() - startDate.getTime();
            days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        }
        const overlapping = await this.prisma.leave.findFirst({
            where: {
                employeeId: dto.employeeId,
                status: {
                    notIn: [client_1.LeaveStatus.REJECTED, client_1.LeaveStatus.CANCELLED],
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
            throw new common_1.BadRequestException('Leave request overlaps with existing leave');
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
                status: client_1.LeaveStatus.PENDING,
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
    async findAll(tenantId, page = 1, limit = 20, filters, userId, userPermissions) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('leave.view_all');
        const hasViewOwn = userPermissions?.includes('leave.view_own');
        const hasViewTeam = userPermissions?.includes('leave.view_team');
        const hasViewDepartment = userPermissions?.includes('leave.view_department');
        const hasViewSite = userPermissions?.includes('leave.view_site');
        if (userId && !hasViewAll) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
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
            }
            else if (managerLevel.type === 'SITE') {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
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
            }
            else if (managerLevel.type === 'TEAM') {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { teamId: true },
                });
                if (employee?.teamId) {
                    const teamMembers = await this.prisma.employee.findMany({
                        where: { teamId: employee.teamId, tenantId },
                        select: { id: true },
                    });
                    where.employeeId = {
                        in: teamMembers.map(m => m.id),
                    };
                }
                else {
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
            else if (!hasViewAll && hasViewOwn) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                if (employee) {
                    where.employeeId = employee.id;
                }
                else {
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
    async findOne(tenantId, id) {
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
            throw new common_1.NotFoundException('Leave not found');
        }
        return leave;
    }
    async update(tenantId, id, dto) {
        const leave = await this.findOne(tenantId, id);
        if (leave.status !== client_1.LeaveStatus.PENDING) {
            throw new common_1.BadRequestException('Cannot update leave that is not pending');
        }
        if (dto.leaveTypeId) {
            const leaveType = await this.prisma.leaveType.findFirst({
                where: {
                    id: dto.leaveTypeId,
                    tenantId,
                },
            });
            if (!leaveType) {
                throw new common_1.NotFoundException('Leave type not found');
            }
        }
        if (dto.startDate || dto.endDate) {
            const startDate = dto.startDate ? new Date(dto.startDate) : leave.startDate;
            const endDate = dto.endDate ? new Date(dto.endDate) : leave.endDate;
            if (endDate < startDate) {
                throw new common_1.BadRequestException('End date must be after start date');
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
    async approve(tenantId, id, userId, userRole, dto) {
        const leave = await this.findOne(tenantId, id);
        const allowedStatuses = [client_1.LeaveStatus.PENDING, client_1.LeaveStatus.MANAGER_APPROVED];
        if (!allowedStatuses.includes(leave.status)) {
            throw new common_1.BadRequestException('Leave cannot be approved at this stage');
        }
        const updateData = {};
        if (userRole === client_1.LegacyRole.SUPER_ADMIN) {
            if (dto.status === client_1.LeaveStatus.MANAGER_APPROVED) {
                updateData.status = client_1.LeaveStatus.MANAGER_APPROVED;
                updateData.managerApprovedBy = userId;
                updateData.managerApprovedAt = new Date();
                updateData.managerComment = dto.comment;
            }
            else if (dto.status === client_1.LeaveStatus.APPROVED || dto.status === client_1.LeaveStatus.HR_APPROVED) {
                updateData.status = client_1.LeaveStatus.APPROVED;
                updateData.hrApprovedBy = userId;
                updateData.hrApprovedAt = new Date();
                updateData.hrComment = dto.comment;
            }
            else if (dto.status === client_1.LeaveStatus.REJECTED) {
                updateData.status = client_1.LeaveStatus.REJECTED;
                updateData.hrComment = dto.comment;
            }
        }
        else if (userRole === client_1.LegacyRole.MANAGER) {
            if (dto.status === client_1.LeaveStatus.MANAGER_APPROVED) {
                updateData.status = client_1.LeaveStatus.MANAGER_APPROVED;
                updateData.managerApprovedBy = userId;
                updateData.managerApprovedAt = new Date();
                updateData.managerComment = dto.comment;
            }
            else if (dto.status === client_1.LeaveStatus.REJECTED) {
                updateData.status = client_1.LeaveStatus.REJECTED;
                updateData.managerComment = dto.comment;
            }
        }
        else if (userRole === client_1.LegacyRole.ADMIN_RH) {
            if (leave.status !== client_1.LeaveStatus.MANAGER_APPROVED) {
                throw new common_1.ForbiddenException('Vous ne pouvez pas approuver ou rejeter ce congé. Le manager doit d\'abord approuver la demande.');
            }
            if (dto.status === client_1.LeaveStatus.APPROVED || dto.status === client_1.LeaveStatus.HR_APPROVED) {
                updateData.status = client_1.LeaveStatus.APPROVED;
                updateData.hrApprovedBy = userId;
                updateData.hrApprovedAt = new Date();
                updateData.hrComment = dto.comment;
            }
            else if (dto.status === client_1.LeaveStatus.REJECTED) {
                updateData.status = client_1.LeaveStatus.REJECTED;
                updateData.hrComment = dto.comment;
            }
        }
        if (Object.keys(updateData).length === 0) {
            throw new common_1.BadRequestException('Invalid status transition');
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
    async cancel(tenantId, id, userId) {
        const leave = await this.findOne(tenantId, id);
        const rejectedStatuses = [client_1.LeaveStatus.REJECTED, client_1.LeaveStatus.CANCELLED];
        if (rejectedStatuses.includes(leave.status)) {
            throw new common_1.BadRequestException('Leave is already rejected or cancelled');
        }
        return this.prisma.leave.update({
            where: { id },
            data: {
                status: client_1.LeaveStatus.CANCELLED,
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
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.leave.delete({
            where: { id },
        });
    }
    async getLeaveTypes(tenantId) {
        return this.prisma.leaveType.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
        });
    }
    async createLeaveType(tenantId, data) {
        return this.prisma.leaveType.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }
    async updateLeaveType(tenantId, id, data) {
        const leaveType = await this.prisma.leaveType.findFirst({
            where: { id, tenantId },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('Leave type not found');
        }
        return this.prisma.leaveType.update({
            where: { id },
            data,
        });
    }
    async deleteLeaveType(tenantId, id) {
        const leaveType = await this.prisma.leaveType.findFirst({
            where: { id, tenantId },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('Leave type not found');
        }
        const leavesCount = await this.prisma.leave.count({
            where: { leaveTypeId: id },
        });
        if (leavesCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete leave type. ${leavesCount} leave request(s) are using this type.`);
        }
        return this.prisma.leaveType.delete({
            where: { id },
        });
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map