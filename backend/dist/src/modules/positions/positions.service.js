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
exports.PositionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PositionsService = class PositionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateUniqueCode(tenantId, positionName) {
        const normalized = positionName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
        let baseCode = normalized
            .replace(/\s/g, '')
            .substring(0, 3);
        if (baseCode.length < 3) {
            baseCode = baseCode.padEnd(3, 'X');
        }
        try {
            const existing = await this.prisma.position.findFirst({
                where: {
                    tenantId,
                    code: baseCode,
                },
            });
            if (!existing) {
                return baseCode;
            }
        }
        catch (error) {
            if (error.message?.includes('does not exist')) {
                return baseCode;
            }
            throw error;
        }
        let counter = 1;
        let uniqueCode;
        do {
            uniqueCode = `${baseCode}${String(counter).padStart(3, '0')}`;
            try {
                const existing = await this.prisma.position.findFirst({
                    where: {
                        tenantId,
                        code: uniqueCode,
                    },
                });
                if (!existing) {
                    return uniqueCode;
                }
            }
            catch (error) {
                if (error.message?.includes('does not exist')) {
                    return uniqueCode;
                }
                throw error;
            }
            counter++;
            if (counter > 9999) {
                return `POS${Date.now().toString().slice(-6)}`;
            }
        } while (true);
    }
    async create(tenantId, createPositionDto) {
        let finalCode = createPositionDto.code;
        if (!finalCode) {
            finalCode = await this.generateUniqueCode(tenantId, createPositionDto.name);
        }
        else {
            try {
                const existing = await this.prisma.position.findFirst({
                    where: {
                        tenantId,
                        code: createPositionDto.code,
                    },
                });
                if (existing) {
                    throw new common_1.ConflictException(`Le code "${createPositionDto.code}" existe déjà pour ce tenant`);
                }
            }
            catch (error) {
                if (error.message?.includes('does not exist')) {
                }
                else {
                    throw error;
                }
            }
        }
        return this.prisma.position.create({
            data: {
                ...createPositionDto,
                code: finalCode,
                tenantId,
            },
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
        });
    }
    async findAll(tenantId, category) {
        const where = { tenantId };
        if (category) {
            where.category = category;
        }
        return this.prisma.position.findMany({
            where,
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
    }
    async findOne(id, tenantId) {
        const position = await this.prisma.position.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
                employees: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    take: 100,
                    orderBy: { lastName: 'asc' },
                },
            },
        });
        if (!position) {
            throw new common_1.NotFoundException(`Position with ID ${id} not found`);
        }
        return position;
    }
    async update(id, tenantId, updatePositionDto) {
        const position = await this.findOne(id, tenantId);
        return this.prisma.position.update({
            where: { id: position.id },
            data: updatePositionDto,
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
        });
    }
    async remove(id, tenantId) {
        const position = await this.findOne(id, tenantId);
        const employeeCount = await this.prisma.employee.count({
            where: { positionId: id },
        });
        if (employeeCount > 0) {
            throw new Error(`Cannot delete position. It has ${employeeCount} employee(s). Please reassign them first.`);
        }
        return this.prisma.position.delete({
            where: { id: position.id },
        });
    }
    async getStats(tenantId) {
        const positions = await this.findAll(tenantId);
        const total = positions.length;
        const totalEmployees = await this.prisma.employee.count({
            where: { tenantId, positionId: { not: null } },
        });
        const employeesWithoutPosition = await this.prisma.employee.count({
            where: { tenantId, positionId: null },
        });
        const categoryStats = positions.reduce((acc, pos) => {
            const cat = pos.category || 'Non catégorisé';
            if (!acc[cat]) {
                acc[cat] = { category: cat, count: 0, employeeCount: 0 };
            }
            acc[cat].count++;
            acc[cat].employeeCount += pos._count.employees;
            return acc;
        }, {});
        const positionStats = positions.map(pos => ({
            id: pos.id,
            name: pos.name,
            code: pos.code,
            category: pos.category,
            employeeCount: pos._count.employees,
            percentage: totalEmployees > 0 ? ((pos._count.employees / totalEmployees) * 100).toFixed(1) : 0,
        }));
        return {
            totalPositions: total,
            totalEmployees,
            employeesWithoutPosition,
            categories: Object.values(categoryStats),
            positions: positionStats.sort((a, b) => b.employeeCount - a.employeeCount),
        };
    }
    async getCategories(tenantId) {
        const positions = await this.prisma.position.findMany({
            where: { tenantId },
            select: { category: true },
            distinct: ['category'],
        });
        return positions
            .filter(p => p.category)
            .map(p => p.category)
            .sort();
    }
};
exports.PositionsService = PositionsService;
exports.PositionsService = PositionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PositionsService);
//# sourceMappingURL=positions.service.js.map