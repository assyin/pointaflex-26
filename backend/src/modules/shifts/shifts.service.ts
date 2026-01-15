import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateShiftDto) {
    // Check if shift code already exists for this tenant
    const existing = await this.prisma.shift.findFirst({
      where: {
        tenantId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException('Shift code already exists');
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

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      isNightShift?: boolean;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { code: { contains: filters.search, mode: 'insensitive' as const } },
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

    // Récupérer les statistiques d'utilisation pour chaque shift
    const shiftsWithUsage = await Promise.all(
      shifts.map(async (shift) => {
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
      })
    );

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

  async findOne(tenantId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async update(tenantId: string, id: string, dto: UpdateShiftDto) {
    await this.findOne(tenantId, id);

    // Check if new code conflicts with existing shift
    if (dto.code) {
      const existing = await this.prisma.shift.findFirst({
        where: {
          tenantId,
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Shift code already exists');
      }
    }

    return this.prisma.shift.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    const shift = await this.findOne(tenantId, id);

    // Vérifier si des employés utilisent ce shift comme shift par défaut
    const employeesWithShift = await this.prisma.employee.count({
      where: {
        tenantId,
        currentShiftId: id,
      },
    });

    if (employeesWithShift > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce shift : ${employeesWithShift} employé(s) l'utilisent comme shift par défaut. Veuillez d'abord réassigner ces employés à un autre shift.`
      );
    }

    // Vérifier si des schedules utilisent ce shift
    const schedulesWithShift = await this.prisma.schedule.count({
      where: {
        tenantId,
        shiftId: id,
      },
    });

    if (schedulesWithShift > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce shift : ${schedulesWithShift} planning(s) l'utilisent. Veuillez d'abord supprimer ou modifier ces plannings.`
      );
    }

    return this.prisma.shift.delete({
      where: { id },
    });
  }

  /**
   * Récupère les statistiques d'utilisation d'un shift
   */
  async getShiftUsage(tenantId: string, id: string) {
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
}
