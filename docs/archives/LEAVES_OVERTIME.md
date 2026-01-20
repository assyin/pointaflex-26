# Modules Leaves, Overtime & Recovery - Code Complet

## Module Leaves (Congés)

### leaves/dto/create-leave.dto.ts
```typescript
import { IsString, IsDateString, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsUUID()
  leaveTypeId: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-01-20' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  document?: string;
}

export class ApproveLeaveDto {
  @ApiProperty()
  @IsString()
  comment: string;

  @ApiProperty({ enum: ['MANAGER', 'HR'] })
  @IsString()
  approverRole: 'MANAGER' | 'HR';
}
```

### leaves/leave-types.service.ts
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLeaveTypeDto) {
    return this.prisma.leaveType.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            leaves: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id, tenantId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return leaveType;
  }
}
```

### leaves/leave-balance.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveBalanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcule le solde de congés pour un employé
   */
  async getBalance(tenantId: string, employeeId: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { tenantId },
    });

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const balances = [];

    for (const leaveType of leaveTypes) {
      // Récupérer les congés pris et pending
      const leaves = await this.prisma.leave.findMany({
        where: {
          tenantId,
          employeeId,
          leaveTypeId: leaveType.id,
          startDate: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
      });

      const taken = leaves
        .filter((l) => l.status === LeaveStatus.APPROVED || l.status === LeaveStatus.HR_APPROVED)
        .reduce((sum, l) => sum + parseFloat(l.days.toString()), 0);

      const pending = leaves
        .filter((l) => l.status === LeaveStatus.PENDING || l.status === LeaveStatus.MANAGER_APPROVED)
        .reduce((sum, l) => sum + parseFloat(l.days.toString()), 0);

      const acquired = leaveType.maxDaysPerYear || settings?.annualLeaveDays || 18;
      const remaining = acquired - taken - pending;

      balances.push({
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        acquired,
        taken,
        pending,
        remaining: Math.max(0, remaining),
      });
    }

    return {
      employeeId,
      year: currentYear,
      leaveTypes: balances,
    };
  }
}
```

### leaves/leaves.service.ts
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeaveDto, ApproveLeaveDto } from './dto/create-leave.dto';
import { LeaveStatus } from '@prisma/client';
import { LeaveBalanceService } from './leave-balance.service';

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService,
    private leaveBalanceService: LeaveBalanceService,
  ) {}

  async create(tenantId: string, dto: CreateLeaveDto) {
    // Vérifier que l'employé existe
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Calculer le nombre de jours
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const days = this.calculateWorkingDays(startDate, endDate);

    // Vérifier le solde disponible
    const balance = await this.leaveBalanceService.getBalance(tenantId, dto.employeeId);
    const leaveTypeBalance = balance.leaveTypes.find((lt) => lt.leaveTypeId === dto.leaveTypeId);

    if (leaveTypeBalance && leaveTypeBalance.remaining < days) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${leaveTypeBalance.remaining} days, Requested: ${days} days`,
      );
    }

    // Créer la demande de congé
    return this.prisma.leave.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days,
        reason: dto.reason,
        document: dto.document,
        status: LeaveStatus.PENDING,
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });
  }

  async findAll(tenantId: string, page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.startDate.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: true,
          leaveType: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leave.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, tenantId },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave not found');
    }

    return leave;
  }

  async approve(tenantId: string, id: string, userId: string, dto: ApproveLeaveDto) {
    const leave = await this.findOne(tenantId, id);

    let newStatus: LeaveStatus;

    if (dto.approverRole === 'MANAGER') {
      if (leave.status !== LeaveStatus.PENDING) {
        throw new BadRequestException('Leave can only be approved by manager when status is PENDING');
      }

      newStatus = LeaveStatus.MANAGER_APPROVED;

      return this.prisma.leave.update({
        where: { id },
        data: {
          status: newStatus,
          managerApprovedBy: userId,
          managerApprovedAt: new Date(),
          managerComment: dto.comment,
        },
      });
    } else if (dto.approverRole === 'HR') {
      if (leave.status !== LeaveStatus.MANAGER_APPROVED) {
        throw new BadRequestException('Leave must be approved by manager first');
      }

      newStatus = LeaveStatus.APPROVED;

      return this.prisma.leave.update({
        where: { id },
        data: {
          status: newStatus,
          hrApprovedBy: userId,
          hrApprovedAt: new Date(),
          hrComment: dto.comment,
        },
      });
    }

    throw new BadRequestException('Invalid approver role');
  }

  async reject(tenantId: string, id: string, userId: string, comment: string) {
    await this.findOne(tenantId, id);

    return this.prisma.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        managerComment: comment,
        managerApprovedBy: userId,
        managerApprovedAt: new Date(),
      },
    });
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Exclure samedi (6) et dimanche (0) - ajuster selon le pays
      // Au Maroc, le weekend est généralement samedi-dimanche
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }
}
```

---

## Module Overtime (Heures Supplémentaires)

### overtime/dto/approve-overtime.dto.ts
```typescript
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveOvertimeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ConvertToRecoveryDto {
  @ApiProperty()
  @IsNumber()
  hours: number;
}
```

### overtime/overtime.service.ts
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OvertimeStatus } from '@prisma/client';
import { RecoveryService } from './recovery.service';

@Injectable()
export class OvertimeService {
  constructor(
    private prisma: PrismaService,
    private recoveryService: RecoveryService,
  ) {}

  /**
   * Calculer les heures supplémentaires automatiquement depuis les pointages
   */
  async calculateFromAttendance(tenantId: string, employeeId: string, date: string) {
    const targetDate = new Date(date);

    // Récupérer le planning de l'employé
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        tenantId,
        employeeId,
        date: targetDate,
      },
      include: {
        shift: true,
      },
    });

    if (!schedule) {
      return null; // Pas de planning = pas de calcul
    }

    // Récupérer les pointages du jour
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Trouver la première entrée et la dernière sortie
    const firstIn = attendances.find((a) => a.type === 'IN');
    const lastOut = attendances.reverse().find((a) => a.type === 'OUT');

    if (!firstIn || !lastOut) {
      return null; // Pointages incomplets
    }

    // Calculer les heures travaillées
    const workedMs = lastOut.timestamp.getTime() - firstIn.timestamp.getTime();
    const workedHours = workedMs / (1000 * 60 * 60);

    // Calculer les heures prévues
    const shiftStart = this.parseTime(schedule.customStartTime || schedule.shift.startTime);
    const shiftEnd = this.parseTime(schedule.customEndTime || schedule.shift.endTime);
    const plannedHours = this.calculateHoursDiff(shiftStart, shiftEnd) - (schedule.shift.breakDuration / 60);

    // Calculer les heures sup
    const overtimeHours = Math.max(0, workedHours - plannedHours);

    if (overtimeHours > 0) {
      // Créer ou mettre à jour l'overtime
      const existing = await this.prisma.overtime.findFirst({
        where: {
          tenantId,
          employeeId,
          date: targetDate,
        },
      });

      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
      });

      const rate = schedule.shift.isNightShift
        ? parseFloat(settings?.nightShiftRate?.toString() || '1.5')
        : parseFloat(settings?.overtimeRate?.toString() || '1.25');

      if (existing) {
        return this.prisma.overtime.update({
          where: { id: existing.id },
          data: {
            hours: overtimeHours,
            rate,
            isNightShift: schedule.shift.isNightShift,
          },
        });
      } else {
        return this.prisma.overtime.create({
          data: {
            tenantId,
            employeeId,
            date: targetDate,
            hours: overtimeHours,
            rate,
            isNightShift: schedule.shift.isNightShift,
            status: OvertimeStatus.PENDING,
          },
        });
      }
    }

    return null;
  }

  async findAll(tenantId: string, page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.overtime.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: true,
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.overtime.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByEmployee(tenantId: string, employeeId: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId, employeeId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const overtimes = await this.prisma.overtime.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const totalHours = overtimes.reduce((sum, ot) => sum + parseFloat(ot.hours.toString()), 0);
    const approvedHours = overtimes
      .filter((ot) => ot.status === OvertimeStatus.APPROVED)
      .reduce((sum, ot) => sum + parseFloat(ot.hours.toString()), 0);

    return {
      overtimes,
      summary: {
        totalHours,
        approvedHours,
        pendingHours: totalHours - approvedHours,
      },
    };
  }

  async approve(tenantId: string, id: string, userId: string) {
    const overtime = await this.prisma.overtime.findFirst({
      where: { id, tenantId },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime not found');
    }

    if (overtime.status !== OvertimeStatus.PENDING) {
      throw new BadRequestException('Overtime already processed');
    }

    return this.prisma.overtime.update({
      where: { id },
      data: {
        status: OvertimeStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
  }

  async convertToRecovery(tenantId: string, id: string, hours: number) {
    const overtime = await this.prisma.overtime.findFirst({
      where: { id, tenantId },
    });

    if (!overtime) {
      throw new NotFoundException('Overtime not found');
    }

    if (overtime.status !== OvertimeStatus.APPROVED) {
      throw new BadRequestException('Can only convert approved overtime');
    }

    if (overtime.convertedToRecovery) {
      throw new BadRequestException('Overtime already converted');
    }

    const availableHours = parseFloat(overtime.hours.toString());

    if (hours > availableHours) {
      throw new BadRequestException('Cannot convert more hours than available');
    }

    // Créer la récupération
    const recovery = await this.recoveryService.create(tenantId, {
      employeeId: overtime.employeeId,
      hours,
      source: 'OVERTIME',
    });

    // Marquer l'overtime comme converti
    await this.prisma.overtime.update({
      where: { id },
      data: {
        convertedToRecovery: true,
        recoveryId: recovery.id,
      },
    });

    return recovery;
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private calculateHoursDiff(start: any, end: any): number {
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;
    return (endMinutes - startMinutes) / 60;
  }
}
```

### overtime/recovery.service.ts
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RecoveryService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: any) {
    return this.prisma.recovery.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        hours: data.hours,
        source: data.source,
        usedHours: 0,
        remainingHours: data.hours,
        expiryDate: data.expiryDate,
      },
    });
  }

  async getBalance(tenantId: string, employeeId: string) {
    const recoveries = await this.prisma.recovery.findMany({
      where: {
        tenantId,
        employeeId,
      },
    });

    const totalHours = recoveries.reduce((sum, r) => sum + parseFloat(r.hours.toString()), 0);
    const usedHours = recoveries.reduce((sum, r) => sum + parseFloat(r.usedHours.toString()), 0);
    const remainingHours = recoveries.reduce((sum, r) => sum + parseFloat(r.remainingHours.toString()), 0);

    return {
      employeeId,
      totalHours,
      usedHours,
      remainingHours,
      details: recoveries,
    };
  }

  async use(tenantId: string, employeeId: string, hours: number) {
    const balance = await this.getBalance(tenantId, employeeId);

    if (balance.remainingHours < hours) {
      throw new Error('Insufficient recovery hours');
    }

    // Utiliser les récupérations les plus anciennes en premier (FIFO)
    const recoveries = await this.prisma.recovery.findMany({
      where: {
        tenantId,
        employeeId,
        remainingHours: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    let hoursToUse = hours;

    for (const recovery of recoveries) {
      if (hoursToUse <= 0) break;

      const availableHours = parseFloat(recovery.remainingHours.toString());
      const toUse = Math.min(hoursToUse, availableHours);

      await this.prisma.recovery.update({
        where: { id: recovery.id },
        data: {
          usedHours: { increment: toUse },
          remainingHours: { decrement: toUse },
        },
      });

      hoursToUse -= toUse;
    }

    return this.getBalance(tenantId, employeeId);
  }
}
```

---

## Workflow des Congés & Heures Sup

### Workflow Congés
1. Employé crée une demande → Status: `PENDING`
2. Manager approuve → Status: `MANAGER_APPROVED`
3. RH approuve → Status: `APPROVED` (finalisé)

Ou rejection à n'importe quel niveau → Status: `REJECTED`

### Workflow Heures Sup
1. Calcul automatique depuis pointages → Status: `PENDING`
2. Manager/RH approuve → Status: `APPROVED`
3. Option : Conversion en récupération

### Points Clés
- **Solde dynamique** : Calculé en temps réel
- **Workflow flexible** : Niveaux d'approbation configurables
- **Conversion** : Heures sup → Récupération
- **FIFO** : Utilisation des récupérations les plus anciennes en premier
