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
exports.TeamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let TeamsService = class TeamsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        const existing = await this.prisma.team.findFirst({
            where: {
                tenantId,
                code: dto.code,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Team code already exists');
        }
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
                throw new common_1.NotFoundException('Manager not found');
            }
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
    async findAll(tenantId, page = 1, limit = 20, filters) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
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
    async findOne(tenantId, id) {
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
            throw new common_1.NotFoundException('Team not found');
        }
        return team;
    }
    async update(tenantId, id, dto) {
        await this.findOne(tenantId, id);
        if (dto.code) {
            const existing = await this.prisma.team.findFirst({
                where: {
                    tenantId,
                    code: dto.code,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException('Team code already exists');
            }
        }
        if (dto.managerId) {
            const manager = await this.prisma.employee.findFirst({
                where: {
                    id: dto.managerId,
                    tenantId,
                },
            });
            if (!manager) {
                throw new common_1.NotFoundException('Manager not found');
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
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.team.delete({
            where: { id },
        });
    }
    async addMember(tenantId, teamId, dto) {
        const team = await this.findOne(tenantId, teamId);
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: dto.employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        if (employee.teamId === teamId) {
            throw new common_1.ConflictException('Employee is already a member of this team');
        }
        await this.prisma.employee.update({
            where: { id: dto.employeeId },
            data: { teamId },
        });
        return this.findOne(tenantId, teamId);
    }
    async removeMember(tenantId, teamId, employeeId) {
        await this.findOne(tenantId, teamId);
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        if (employee.teamId !== teamId) {
            throw new common_1.BadRequestException('Employee is not a member of this team');
        }
        await this.prisma.employee.update({
            where: { id: employeeId },
            data: { teamId: null },
        });
        return this.findOne(tenantId, teamId);
    }
    async addMembersBulk(tenantId, teamId, dto) {
        await this.findOne(tenantId, teamId);
        const employees = await this.prisma.employee.findMany({
            where: {
                id: { in: dto.employeeIds },
                tenantId,
            },
        });
        if (employees.length !== dto.employeeIds.length) {
            throw new common_1.NotFoundException('One or more employees not found');
        }
        const employeesInTeam = employees.filter(emp => emp.teamId === teamId);
        if (employeesInTeam.length > 0) {
            throw new common_1.ConflictException(`${employeesInTeam.length} employee(s) are already members of this team`);
        }
        await this.prisma.employee.updateMany({
            where: {
                id: { in: dto.employeeIds },
                tenantId,
            },
            data: { teamId },
        });
        return this.findOne(tenantId, teamId);
    }
    async removeMembersBulk(tenantId, teamId, dto) {
        await this.findOne(tenantId, teamId);
        const employees = await this.prisma.employee.findMany({
            where: {
                id: { in: dto.employeeIds },
                tenantId,
            },
        });
        if (employees.length !== dto.employeeIds.length) {
            throw new common_1.NotFoundException('One or more employees not found');
        }
        const employeesNotInTeam = employees.filter(emp => emp.teamId !== teamId);
        if (employeesNotInTeam.length > 0) {
            throw new common_1.BadRequestException(`${employeesNotInTeam.length} employee(s) are not members of this team`);
        }
        await this.prisma.employee.updateMany({
            where: {
                id: { in: dto.employeeIds },
                tenantId,
            },
            data: { teamId: null },
        });
        return this.findOne(tenantId, teamId);
    }
    async getTeamStats(tenantId, teamId) {
        const team = await this.findOne(tenantId, teamId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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
};
exports.TeamsService = TeamsService;
exports.TeamsService = TeamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeamsService);
//# sourceMappingURL=teams.service.js.map