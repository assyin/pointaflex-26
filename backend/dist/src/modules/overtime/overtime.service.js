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
exports.OvertimeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
let OvertimeService = class OvertimeService {
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
        const settings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
        });
        const rate = dto.rate || (dto.isNightShift
            ? Number(settings?.nightShiftRate || 1.5)
            : Number(settings?.overtimeRate || 1.25));
        return this.prisma.overtime.create({
            data: {
                tenantId,
                employeeId: dto.employeeId,
                date: new Date(dto.date),
                hours: dto.hours,
                isNightShift: dto.isNightShift || false,
                rate,
                status: client_1.OvertimeStatus.PENDING,
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
            },
        });
    }
    async findAll(tenantId, page = 1, limit = 20, filters) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (filters?.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.isNightShift !== undefined) {
            where.isNightShift = filters.isNightShift;
        }
        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
        }
        const [data, total] = await Promise.all([
            this.prisma.overtime.findMany({
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
                        },
                    },
                },
                orderBy: { date: 'desc' },
            }),
            this.prisma.overtime.count({ where }),
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
        const overtime = await this.prisma.overtime.findFirst({
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
            },
        });
        if (!overtime) {
            throw new common_1.NotFoundException('Overtime record not found');
        }
        return overtime;
    }
    async update(tenantId, id, dto) {
        const overtime = await this.findOne(tenantId, id);
        if (overtime.status !== client_1.OvertimeStatus.PENDING) {
            throw new common_1.BadRequestException('Cannot update overtime that is not pending');
        }
        return this.prisma.overtime.update({
            where: { id },
            data: {
                ...(dto.date && { date: new Date(dto.date) }),
                ...(dto.hours !== undefined && { hours: dto.hours }),
                ...(dto.isNightShift !== undefined && { isNightShift: dto.isNightShift }),
                ...(dto.rate !== undefined && { rate: dto.rate }),
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
            },
        });
    }
    async approve(tenantId, id, userId, dto) {
        const overtime = await this.findOne(tenantId, id);
        if (overtime.status !== client_1.OvertimeStatus.PENDING) {
            throw new common_1.BadRequestException('Overtime can only be approved or rejected when pending');
        }
        return this.prisma.overtime.update({
            where: { id },
            data: {
                status: dto.status,
                approvedBy: dto.status === client_1.OvertimeStatus.APPROVED ? userId : undefined,
                approvedAt: dto.status === client_1.OvertimeStatus.APPROVED ? new Date() : undefined,
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
            },
        });
    }
    async convertToRecovery(tenantId, id) {
        const overtime = await this.findOne(tenantId, id);
        if (overtime.status !== client_1.OvertimeStatus.APPROVED) {
            throw new common_1.BadRequestException('Only approved overtime can be converted to recovery');
        }
        if (overtime.convertedToRecovery) {
            throw new common_1.BadRequestException('Overtime already converted to recovery');
        }
        const recovery = await this.prisma.recovery.create({
            data: {
                tenantId,
                employeeId: overtime.employeeId,
                hours: overtime.hours,
                source: 'OVERTIME',
                usedHours: 0,
                remainingHours: overtime.hours,
            },
        });
        await this.prisma.overtime.update({
            where: { id },
            data: {
                convertedToRecovery: true,
                recoveryId: recovery.id,
            },
        });
        return recovery;
    }
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.overtime.delete({
            where: { id },
        });
    }
};
exports.OvertimeService = OvertimeService;
exports.OvertimeService = OvertimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OvertimeService);
//# sourceMappingURL=overtime.service.js.map