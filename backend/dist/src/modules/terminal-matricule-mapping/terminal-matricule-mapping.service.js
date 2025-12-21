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
exports.TerminalMatriculeMappingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let TerminalMatriculeMappingService = class TerminalMatriculeMappingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createMapping(tenantId, employeeId, terminalMatricule, officialMatricule, deviceId) {
        const existing = await this.prisma.terminalMatriculeMapping.findFirst({
            where: {
                tenantId,
                terminalMatricule,
                isActive: true,
            },
        });
        if (existing && existing.employeeId !== employeeId) {
            throw new common_1.ConflictException(`Le matricule terminal "${terminalMatricule}" est déjà utilisé par un autre employé`);
        }
        if (existing && existing.employeeId === employeeId) {
            await this.prisma.terminalMatriculeMapping.update({
                where: { id: existing.id },
                data: { isActive: false },
            });
        }
        return this.prisma.terminalMatriculeMapping.create({
            data: {
                tenantId,
                employeeId,
                terminalMatricule,
                officialMatricule,
                deviceId,
                isActive: true,
                assignedAt: new Date(),
            },
        });
    }
    async findEmployeeByTerminalMatricule(tenantId, terminalMatricule) {
        const mapping = await this.prisma.terminalMatriculeMapping.findFirst({
            where: {
                tenantId,
                terminalMatricule,
                isActive: true,
            },
            include: {
                employee: true,
            },
        });
        return mapping?.employee || null;
    }
    async updateOfficialMatricule(employeeId, officialMatricule) {
        return this.prisma.terminalMatriculeMapping.updateMany({
            where: {
                employeeId,
                isActive: true,
            },
            data: {
                officialMatricule,
                updatedAt: new Date(),
            },
        });
    }
    async deactivateMappings(employeeId) {
        return this.prisma.terminalMatriculeMapping.updateMany({
            where: {
                employeeId,
                isActive: true,
            },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    }
    async getEmployeeMappings(employeeId) {
        return this.prisma.terminalMatriculeMapping.findMany({
            where: {
                employeeId,
                isActive: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async getExpiringTemporaryMatricules(tenantId, expiryDays) {
        const employeesWithTempMatricule = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
                matricule: {
                    startsWith: 'TEMP-',
                },
            },
            select: {
                id: true,
                matricule: true,
                firstName: true,
                lastName: true,
                email: true,
                hireDate: true,
                createdAt: true,
            },
        });
        const results = await Promise.all(employeesWithTempMatricule.map(async (employee) => {
            let mapping = await this.prisma.terminalMatriculeMapping.findFirst({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    isActive: true,
                },
            });
            if (!mapping) {
                mapping = await this.createMapping(tenantId, employee.id, employee.matricule, employee.matricule);
            }
            const assignedDate = mapping.assignedAt || employee.createdAt;
            const daysSince = Math.floor((new Date().getTime() - new Date(assignedDate).getTime()) /
                (1000 * 60 * 60 * 24));
            return {
                ...mapping,
                employee,
                daysSinceAssignment: daysSince,
            };
        }));
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - expiryDays);
        return results.filter((result) => {
            const assignedDate = result.assignedAt || result.employee.createdAt;
            return new Date(assignedDate) <= expiryDate;
        });
    }
    async getAllTemporaryMatricules(tenantId, expiryDays) {
        const employeesWithTempMatricule = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
                matricule: {
                    startsWith: 'TEMP-',
                },
            },
            select: {
                id: true,
                matricule: true,
                firstName: true,
                lastName: true,
                email: true,
                hireDate: true,
                createdAt: true,
            },
        });
        const results = await Promise.all(employeesWithTempMatricule.map(async (employee) => {
            let mapping = await this.prisma.terminalMatriculeMapping.findFirst({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    isActive: true,
                },
            });
            if (!mapping) {
                mapping = await this.createMapping(tenantId, employee.id, employee.matricule, employee.matricule);
            }
            const assignedDate = mapping.assignedAt || employee.createdAt;
            const daysSince = Math.floor((new Date().getTime() - new Date(assignedDate).getTime()) /
                (1000 * 60 * 60 * 24));
            return {
                ...mapping,
                employee,
                daysSinceAssignment: daysSince,
            };
        }));
        return results;
    }
    async getMappingHistory(tenantId, filters) {
        const where = {
            tenantId,
        };
        if (filters?.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters?.terminalMatricule) {
            where.terminalMatricule = {
                contains: filters.terminalMatricule,
                mode: 'insensitive',
            };
        }
        if (filters?.officialMatricule) {
            where.officialMatricule = {
                contains: filters.officialMatricule,
                mode: 'insensitive',
            };
        }
        if (filters?.startDate || filters?.endDate) {
            where.assignedAt = {};
            if (filters.startDate) {
                where.assignedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.assignedAt.lte = filters.endDate;
            }
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;
        const total = await this.prisma.terminalMatriculeMapping.count({
            where,
        });
        const mappings = await this.prisma.terminalMatriculeMapping.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        matricule: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        hireDate: true,
                    },
                },
            },
            orderBy: {
                assignedAt: 'desc',
            },
            skip,
            take: limit,
        });
        const data = mappings.map((mapping) => ({
            ...mapping,
            daysSinceAssignment: Math.floor((new Date().getTime() - mapping.assignedAt.getTime()) /
                (1000 * 60 * 60 * 24)),
        }));
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    isTemporaryMatricule(matricule) {
        return matricule.startsWith('TEMP-');
    }
};
exports.TerminalMatriculeMappingService = TerminalMatriculeMappingService;
exports.TerminalMatriculeMappingService = TerminalMatriculeMappingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TerminalMatriculeMappingService);
//# sourceMappingURL=terminal-matricule-mapping.service.js.map