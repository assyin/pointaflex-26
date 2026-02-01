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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let DepartmentsService = class DepartmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateUniqueCode(tenantId, departmentName) {
        const normalized = departmentName
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
            const existing = await this.prisma.department.findFirst({
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
                const existing = await this.prisma.department.findFirst({
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
                return `DEPT${Date.now().toString().slice(-6)}`;
            }
        } while (true);
    }
    async create(tenantId, createDepartmentDto) {
        let finalCode = createDepartmentDto.code;
        if (!finalCode) {
            finalCode = await this.generateUniqueCode(tenantId, createDepartmentDto.name);
        }
        else {
            try {
                const existing = await this.prisma.department.findFirst({
                    where: {
                        tenantId,
                        code: createDepartmentDto.code,
                    },
                });
                if (existing) {
                    throw new common_1.ConflictException(`Le code "${createDepartmentDto.code}" existe déjà pour ce tenant`);
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
        return this.prisma.department.create({
            data: {
                ...createDepartmentDto,
                code: finalCode,
                tenantId,
            },
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async findAll(tenantId, userId, userPermissions) {
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('department.view_all') || false;
        if (userId) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
                where.id = managerLevel.departmentId;
            }
            else if (managerLevel.type === 'SITE') {
                if (managerLevel.departmentId) {
                    where.id = managerLevel.departmentId;
                }
                else {
                    return [];
                }
            }
            else if (managerLevel.type === 'TEAM') {
                const team = await this.prisma.team.findUnique({
                    where: { id: managerLevel.teamId },
                    select: {
                        employees: {
                            select: { departmentId: true },
                            take: 1,
                        },
                    },
                });
                if (team?.employees?.[0]?.departmentId) {
                    where.id = team.employees[0].departmentId;
                }
                else {
                    return [];
                }
            }
        }
        return this.prisma.department.findMany({
            where,
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id, tenantId) {
        const department = await this.prisma.department.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                employees: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        position: true,
                        email: true,
                    },
                    take: 100,
                    orderBy: { lastName: 'asc' },
                },
            },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${id} not found`);
        }
        return department;
    }
    async update(id, tenantId, updateDepartmentDto) {
        const department = await this.findOne(id, tenantId);
        return this.prisma.department.update({
            where: { id: department.id },
            data: updateDepartmentDto,
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async remove(id, tenantId) {
        const department = await this.findOne(id, tenantId);
        const employeeCount = await this.prisma.employee.count({
            where: { departmentId: id },
        });
        if (employeeCount > 0) {
            throw new Error(`Cannot delete department. It has ${employeeCount} employee(s). Please reassign them first.`);
        }
        return this.prisma.department.delete({
            where: { id: department.id },
        });
    }
    async getStats(tenantId, userId, userPermissions) {
        const departments = await this.findAll(tenantId, userId, userPermissions);
        const total = departments.length;
        const totalEmployees = await this.prisma.employee.count({
            where: { tenantId, departmentId: { not: null } },
        });
        const employeesWithoutDepartment = await this.prisma.employee.count({
            where: { tenantId, departmentId: null },
        });
        const departmentStats = departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            code: dept.code,
            employeeCount: dept._count.employees,
            percentage: total > 0 ? ((dept._count.employees / totalEmployees) * 100).toFixed(1) : 0,
        }));
        return {
            totalDepartments: total,
            totalEmployees,
            employeesWithoutDepartment,
            departments: departmentStats.sort((a, b) => b.employeeCount - a.employeeCount),
        };
    }
    async getSettings(departmentId, tenantId) {
        const dept = await this.prisma.department.findFirst({
            where: { id: departmentId, tenantId },
        });
        if (!dept)
            throw new common_1.NotFoundException('Département non trouvé');
        const settings = await this.prisma.departmentSettings.findUnique({
            where: { departmentId },
        });
        const tenantSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: {
                enableWrongTypeDetection: true,
                wrongTypeAutoCorrect: true,
                wrongTypeShiftMarginMinutes: true,
            },
        });
        return {
            departmentId,
            departmentName: dept.name,
            settings: settings ? {
                wrongTypeDetectionEnabled: settings.wrongTypeDetectionEnabled,
                wrongTypeAutoCorrect: settings.wrongTypeAutoCorrect,
                wrongTypeShiftMarginMinutes: settings.wrongTypeShiftMarginMinutes,
            } : {
                wrongTypeDetectionEnabled: null,
                wrongTypeAutoCorrect: null,
                wrongTypeShiftMarginMinutes: null,
            },
            tenantDefaults: {
                enableWrongTypeDetection: tenantSettings?.enableWrongTypeDetection ?? false,
                wrongTypeAutoCorrect: tenantSettings?.wrongTypeAutoCorrect ?? false,
                wrongTypeShiftMarginMinutes: tenantSettings?.wrongTypeShiftMarginMinutes ?? 120,
            },
        };
    }
    async updateSettings(departmentId, tenantId, data) {
        const dept = await this.prisma.department.findFirst({
            where: { id: departmentId, tenantId },
        });
        if (!dept)
            throw new common_1.NotFoundException('Département non trouvé');
        return this.prisma.departmentSettings.upsert({
            where: { departmentId },
            create: {
                departmentId,
                ...data,
            },
            update: data,
        });
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map