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
let DepartmentsService = class DepartmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, createDepartmentDto) {
        return this.prisma.department.create({
            data: {
                ...createDepartmentDto,
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
    async findAll(tenantId) {
        return this.prisma.department.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: {
                        employees: true,
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
    async getStats(tenantId) {
        const departments = await this.findAll(tenantId);
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
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map