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
exports.ShiftsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ShiftsService = class ShiftsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        const existing = await this.prisma.shift.findFirst({
            where: {
                tenantId,
                code: dto.code,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Shift code already exists');
        }
        return this.prisma.shift.create({
            data: {
                ...dto,
                tenantId,
                breakDuration: dto.breakDuration || 60,
                isNightShift: dto.isNightShift || false,
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
            ];
        }
        if (filters?.isNightShift !== undefined) {
            where.isNightShift = filters.isNightShift;
        }
        const [shifts, total] = await Promise.all([
            this.prisma.shift.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            this.prisma.shift.count({ where }),
        ]);
        const shiftsWithUsage = await Promise.all(shifts.map(async (shift) => {
            const [employeeCount, scheduleCount] = await Promise.all([
                this.prisma.employee.count({
                    where: {
                        tenantId,
                        currentShiftId: shift.id,
                    },
                }),
                this.prisma.schedule.count({
                    where: {
                        tenantId,
                        shiftId: shift.id,
                    },
                }),
            ]);
            return {
                ...shift,
                _usage: {
                    employeeCount,
                    scheduleCount,
                    canDelete: employeeCount === 0 && scheduleCount === 0,
                },
            };
        }));
        return {
            data: shiftsWithUsage,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(tenantId, id) {
        const shift = await this.prisma.shift.findFirst({
            where: {
                id,
                tenantId,
            },
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        return shift;
    }
    async update(tenantId, id, dto) {
        await this.findOne(tenantId, id);
        if (dto.code) {
            const existing = await this.prisma.shift.findFirst({
                where: {
                    tenantId,
                    code: dto.code,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException('Shift code already exists');
            }
        }
        return this.prisma.shift.update({
            where: { id },
            data: dto,
        });
    }
    async remove(tenantId, id) {
        const shift = await this.findOne(tenantId, id);
        const employeesWithShift = await this.prisma.employee.count({
            where: {
                tenantId,
                currentShiftId: id,
            },
        });
        if (employeesWithShift > 0) {
            throw new common_1.ConflictException(`Impossible de supprimer ce shift : ${employeesWithShift} employé(s) l'utilisent comme shift par défaut. Veuillez d'abord réassigner ces employés à un autre shift.`);
        }
        const schedulesWithShift = await this.prisma.schedule.count({
            where: {
                tenantId,
                shiftId: id,
            },
        });
        if (schedulesWithShift > 0) {
            throw new common_1.ConflictException(`Impossible de supprimer ce shift : ${schedulesWithShift} planning(s) l'utilisent. Veuillez d'abord supprimer ou modifier ces plannings.`);
        }
        return this.prisma.shift.delete({
            where: { id },
        });
    }
    async getShiftUsage(tenantId, id) {
        await this.findOne(tenantId, id);
        const [employeeCount, scheduleCount] = await Promise.all([
            this.prisma.employee.count({
                where: {
                    tenantId,
                    currentShiftId: id,
                },
            }),
            this.prisma.schedule.count({
                where: {
                    tenantId,
                    shiftId: id,
                },
            }),
        ]);
        return {
            employeeCount,
            scheduleCount,
            canDelete: employeeCount === 0 && scheduleCount === 0,
        };
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShiftsService);
//# sourceMappingURL=shifts.service.js.map