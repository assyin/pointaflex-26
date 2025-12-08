import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createDepartmentDto: CreateDepartmentDto) {
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

  async findAll(tenantId: string) {
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

  async findOne(id: string, tenantId: string) {
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
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(id: string, tenantId: string, updateDepartmentDto: UpdateDepartmentDto) {
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

  async remove(id: string, tenantId: string) {
    const department = await this.findOne(id, tenantId);

    // Vérifier s'il y a des employés dans ce département
    const employeeCount = await this.prisma.employee.count({
      where: { departmentId: id },
    });

    if (employeeCount > 0) {
      throw new Error(
        `Cannot delete department. It has ${employeeCount} employee(s). Please reassign them first.`,
      );
    }

    return this.prisma.department.delete({
      where: { id: department.id },
    });
  }

  async getStats(tenantId: string) {
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
}
