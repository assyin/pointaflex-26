import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createPositionDto: CreatePositionDto) {
    return this.prisma.position.create({
      data: {
        ...createPositionDto,
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

  async findAll(tenantId: string, category?: string) {
    const where: any = { tenantId };
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

  async findOne(id: string, tenantId: string) {
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
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    return position;
  }

  async update(id: string, tenantId: string, updatePositionDto: UpdatePositionDto) {
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

  async remove(id: string, tenantId: string) {
    const position = await this.findOne(id, tenantId);

    // Vérifier s'il y a des employés avec cette position
    const employeeCount = await this.prisma.employee.count({
      where: { positionId: id },
    });

    if (employeeCount > 0) {
      throw new Error(
        `Cannot delete position. It has ${employeeCount} employee(s). Please reassign them first.`,
      );
    }

    return this.prisma.position.delete({
      where: { id: position.id },
    });
  }

  async getStats(tenantId: string) {
    const positions = await this.findAll(tenantId);

    const total = positions.length;
    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId, positionId: { not: null } },
    });

    const employeesWithoutPosition = await this.prisma.employee.count({
      where: { tenantId, positionId: null },
    });

    // Grouper par catégorie
    const categoryStats = positions.reduce((acc: any, pos) => {
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

  async getCategories(tenantId: string) {
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
}
