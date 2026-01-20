# Modules Shifts, Teams & Schedules - Code Complet

## Module Shifts

### shifts/dto/create-shift.dto.ts
```typescript
import { IsString, IsBoolean, IsOptional, IsInt, IsHexColor } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiProperty({ example: 'Matin' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  code: string;

  @ApiProperty({ example: '08:00', description: 'Format HH:mm' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '16:00', description: 'Format HH:mm' })
  @IsString()
  endTime: string;

  @ApiProperty({ required: false, default: 60 })
  @IsOptional()
  @IsInt()
  breakDuration?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isNightShift?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
```

### shifts/shifts.service.ts
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateShiftDto) {
    // Vérifier si le code existe déjà
    const existing = await this.prisma.shift.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Shift code already exists');
    }

    return this.prisma.shift.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.shift.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            employees: true,
            schedules: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, tenantId },
      include: {
        employees: true,
        _count: {
          select: {
            schedules: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async update(tenantId: string, id: string, dto: UpdateShiftDto) {
    await this.findOne(tenantId, id);

    return this.prisma.shift.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    // Vérifier s'il y a des employés ou schedules associés
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            schedules: true,
          },
        },
      },
    });

    if (shift._count.employees > 0 || shift._count.schedules > 0) {
      throw new ConflictException('Cannot delete shift with assigned employees or schedules');
    }

    return this.prisma.shift.delete({
      where: { id },
    });
  }
}
```

---

## Module Teams

### teams/dto/create-team.dto.ts
```typescript
import { IsString, IsBoolean, IsOptional, IsInt, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Équipe A' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiProperty({ required: false, default: false, description: 'Activer rotation des shifts (optionnel)' })
  @IsOptional()
  @IsBoolean()
  rotationEnabled?: boolean;

  @ApiProperty({ required: false, description: 'Nombre de jours du cycle de rotation' })
  @IsOptional()
  @IsInt()
  rotationCycleDays?: number;
}
```

### teams/teams.service.ts
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTeamDto) {
    const existing = await this.prisma.team.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Team code already exists');
    }

    return this.prisma.team.create({
      data: {
        ...dto,
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
    return this.prisma.team.findMany({
      where: { tenantId },
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        _count: {
          select: {
            employees: true,
            schedules: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, tenantId },
      include: {
        employees: {
          include: {
            currentShift: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async update(tenantId: string, id: string, dto: UpdateTeamDto) {
    await this.findOne(tenantId, id);

    return this.prisma.team.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.team.delete({
      where: { id },
    });
  }

  async assignEmployees(tenantId: string, teamId: string, employeeIds: string[]) {
    await this.findOne(tenantId, teamId);

    // Mettre à jour tous les employés
    await this.prisma.employee.updateMany({
      where: {
        id: { in: employeeIds },
        tenantId,
      },
      data: {
        teamId,
      },
    });

    return this.findOne(tenantId, teamId);
  }
}
```

---

## Module Schedules (avec Alertes Légales Non Bloquantes)

### schedules/dto/create-schedule.dto.ts
```typescript
import { IsString, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsUUID()
  shiftId: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiProperty({ required: false, description: 'Override shift start time' })
  @IsOptional()
  @IsString()
  customStartTime?: string;

  @ApiProperty({ required: false, description: 'Override shift end time' })
  @IsOptional()
  @IsString()
  customEndTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkScheduleDto {
  @ApiProperty({ type: [String] })
  employeeIds: string[];

  @ApiProperty()
  @IsUUID()
  shiftId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;
}
```

### schedules/alerts.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface LegalAlert {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  employeeId: string;
  employeeName: string;
  message: string;
  details?: any;
}

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère des alertes légales NON BLOQUANTES
   * Conformément au cahier des charges : alertes informatives uniquement
   */
  async generateAlerts(tenantId: string, startDate?: string, endDate?: string): Promise<LegalAlert[]> {
    const alerts: LegalAlert[] = [];

    // Récupérer les paramètres du tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      return alerts;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Alerte : Heures hebdomadaires dépassées
    if (settings.alertWeeklyHoursExceeded) {
      const weeklyAlerts = await this.checkWeeklyHours(tenantId, start, end, settings.maxWeeklyHours);
      alerts.push(...weeklyAlerts);
    }

    // 2. Alerte : Repos insuffisant entre shifts
    if (settings.alertInsufficientRest) {
      const restAlerts = await this.checkInsufficientRest(tenantId, start, end);
      alerts.push(...restAlerts);
    }

    // 3. Alerte : Travail de nuit répétitif
    if (settings.alertNightWorkRepetitive) {
      const nightAlerts = await this.checkNightWorkRepetitive(tenantId, start, end);
      alerts.push(...nightAlerts);
    }

    // 4. Alerte : Effectif minimum non atteint
    if (settings.alertMinimumStaffing) {
      const staffingAlerts = await this.checkMinimumStaffing(tenantId, start, end);
      alerts.push(...staffingAlerts);
    }

    return alerts;
  }

  private async checkWeeklyHours(
    tenantId: string,
    start: Date,
    end: Date,
    maxHours: any,
  ): Promise<LegalAlert[]> {
    const alerts: LegalAlert[] = [];

    // Récupérer tous les employés
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    for (const employee of employees) {
      // Calculer les heures de la semaine
      const schedules = await this.prisma.schedule.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          shift: true,
        },
      });

      let totalHours = 0;

      for (const schedule of schedules) {
        const startTime = schedule.customStartTime || schedule.shift.startTime;
        const endTime = schedule.customEndTime || schedule.shift.endTime;

        const hours = this.calculateHours(startTime, endTime) - (schedule.shift.breakDuration / 60);
        totalHours += hours;
      }

      const maxWeeklyHours = parseFloat(maxHours.toString());

      if (totalHours > maxWeeklyHours) {
        alerts.push({
          type: 'WEEKLY_HOURS_EXCEEDED',
          severity: 'WARNING',
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          message: `Heures hebdomadaires dépassent ${maxWeeklyHours}h (${totalHours.toFixed(1)}h)`,
          details: {
            totalHours: totalHours.toFixed(1),
            maxHours: maxWeeklyHours,
            excess: (totalHours - maxWeeklyHours).toFixed(1),
          },
        });
      }
    }

    return alerts;
  }

  private async checkInsufficientRest(tenantId: string, start: Date, end: Date): Promise<LegalAlert[]> {
    const alerts: LegalAlert[] = [];
    const MIN_REST_HOURS = 11; // 11h de repos minimum entre 2 shifts (loi marocaine)

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    for (const employee of employees) {
      const schedules = await this.prisma.schedule.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          shift: true,
        },
        orderBy: { date: 'asc' },
      });

      // Vérifier les repos entre shifts consécutifs
      for (let i = 0; i < schedules.length - 1; i++) {
        const currentSchedule = schedules[i];
        const nextSchedule = schedules[i + 1];

        const currentEnd = this.parseTime(currentSchedule.customEndTime || currentSchedule.shift.endTime);
        const nextStart = this.parseTime(nextSchedule.customStartTime || nextSchedule.shift.startTime);

        // Calculer le temps de repos (en heures)
        const restHours = this.calculateRestHours(currentEnd, nextStart);

        if (restHours < MIN_REST_HOURS) {
          alerts.push({
            type: 'INSUFFICIENT_REST',
            severity: 'WARNING',
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            message: `Repos insuffisant entre shifts (${restHours.toFixed(1)}h au lieu de ${MIN_REST_HOURS}h minimum)`,
            details: {
              date1: currentSchedule.date,
              date2: nextSchedule.date,
              restHours: restHours.toFixed(1),
              minRestHours: MIN_REST_HOURS,
            },
          });
        }
      }
    }

    return alerts;
  }

  private async checkNightWorkRepetitive(tenantId: string, start: Date, end: Date): Promise<LegalAlert[]> {
    const alerts: LegalAlert[] = [];
    const MAX_CONSECUTIVE_NIGHTS = 5; // Maximum 5 nuits consécutives

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    for (const employee of employees) {
      const schedules = await this.prisma.schedule.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          shift: true,
        },
        orderBy: { date: 'asc' },
      });

      // Compter les nuits consécutives
      let consecutiveNights = 0;

      for (const schedule of schedules) {
        if (schedule.shift.isNightShift) {
          consecutiveNights++;

          if (consecutiveNights > MAX_CONSECUTIVE_NIGHTS) {
            alerts.push({
              type: 'NIGHT_WORK_REPETITIVE',
              severity: 'CRITICAL',
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              message: `Travail de nuit répétitif (${consecutiveNights} nuits consécutives, max recommandé: ${MAX_CONSECUTIVE_NIGHTS})`,
              details: {
                consecutiveNights,
                maxRecommended: MAX_CONSECUTIVE_NIGHTS,
              },
            });
            break;
          }
        } else {
          consecutiveNights = 0;
        }
      }
    }

    return alerts;
  }

  private async checkMinimumStaffing(tenantId: string, start: Date, end: Date): Promise<LegalAlert[]> {
    const alerts: LegalAlert[] = [];
    const MIN_STAFFING = 2; // Minimum 2 personnes par shift (exemple)

    // Grouper les schedules par date et shift
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        shift: true,
        employee: true,
      },
    });

    const grouped = new Map<string, any[]>();

    schedules.forEach((schedule) => {
      const key = `${schedule.date.toISOString().split('T')[0]}_${schedule.shiftId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(schedule);
    });

    grouped.forEach((scheduleGroup, key) => {
      if (scheduleGroup.length < MIN_STAFFING) {
        const [date, shiftId] = key.split('_');
        const shift = scheduleGroup[0]?.shift;

        alerts.push({
          type: 'MINIMUM_STAFFING',
          severity: 'WARNING',
          employeeId: '',
          employeeName: '',
          message: `Effectif insuffisant pour le shift "${shift?.name}" le ${date} (${scheduleGroup.length}/${MIN_STAFFING})`,
          details: {
            date,
            shiftName: shift?.name,
            currentStaffing: scheduleGroup.length,
            minimumStaffing: MIN_STAFFING,
          },
        });
      }
    });

    return alerts;
  }

  // Helper methods
  private calculateHours(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let hours = endH - startH;
    let minutes = endM - startM;

    if (minutes < 0) {
      hours--;
      minutes += 60;
    }

    return hours + minutes / 60;
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private calculateRestHours(endTime: any, startTime: any): number {
    // Simplification : on suppose que les shifts sont dans la même journée ou jour suivant
    let restMinutes = (startTime.hours * 60 + startTime.minutes) - (endTime.hours * 60 + endTime.minutes);

    if (restMinutes < 0) {
      restMinutes += 24 * 60; // Jour suivant
    }

    return restMinutes / 60;
  }
}
```

### schedules/schedules.service.ts
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto, BulkScheduleDto } from './dto/create-schedule.dto';
import { AlertsService } from './alerts.service';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
  ) {}

  async create(tenantId: string, dto: CreateScheduleDto) {
    // Vérifier si l'employé existe
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Vérifier si le schedule existe déjà pour cette date
    const existing = await this.prisma.schedule.findFirst({
      where: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
      },
    });

    if (existing) {
      throw new ConflictException('Schedule already exists for this date');
    }

    return this.prisma.schedule.create({
      data: {
        ...dto,
        tenantId,
        date: new Date(dto.date),
      },
      include: {
        employee: true,
        shift: true,
        team: true,
      },
    });
  }

  async createBulk(tenantId: string, dto: BulkScheduleDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const schedules = [];

    // Créer un schedule pour chaque jour entre startDate et endDate
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      for (const employeeId of dto.employeeIds) {
        schedules.push({
          tenantId,
          employeeId,
          shiftId: dto.shiftId,
          date: new Date(date),
        });
      }
    }

    // Insérer en masse
    await this.prisma.schedule.createMany({
      data: schedules,
      skipDuplicates: true,
    });

    return { created: schedules.length };
  }

  async findAll(tenantId: string, page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.date) where.date = new Date(filters.date);

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: true,
          shift: true,
          team: true,
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getWeekSchedule(tenantId: string, date: string, filters?: any) {
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Dimanche

    const where: any = {
      tenantId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    };

    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.siteId) {
      where.employee = {
        siteId: filters.siteId,
      };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        employee: true,
        shift: true,
      },
      orderBy: { date: 'asc' },
    });

    // Grouper par jour
    const grouped = new Map();

    schedules.forEach((schedule) => {
      const dateKey = schedule.date.toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey).push(schedule);
    });

    return Array.from(grouped.entries()).map(([date, schedules]) => ({
      date,
      schedules,
    }));
  }

  async getMonthSchedule(tenantId: string, date: string, filters?: any) {
    const monthStart = new Date(date);
    monthStart.setDate(1);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    return this.getWeekSchedule(tenantId, monthStart.toISOString(), filters);
  }

  async getAlerts(tenantId: string, startDate?: string, endDate?: string) {
    return this.alertsService.generateAlerts(tenantId, startDate, endDate);
  }
}
```

### schedules/schedules.controller.ts
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, BulkScheduleDto } from './dto/create-schedule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Schedules')
@Controller('schedules')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Post()
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Create schedule' })
  create(@CurrentUser() user: any, @Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(user.tenantId, dto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Create multiple schedules' })
  createBulk(@CurrentUser() user: any, @Body() dto: BulkScheduleDto) {
    return this.schedulesService.createBulk(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('teamId') teamId?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.schedulesService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      { employeeId, teamId, date, startDate, endDate },
    );
  }

  @Get('week/:date')
  @ApiOperation({ summary: 'Get week schedule' })
  getWeek(
    @CurrentUser() user: any,
    @Param('date') date: string,
    @Query('teamId') teamId?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.schedulesService.getWeekSchedule(user.tenantId, date, { teamId, siteId });
  }

  @Get('month/:date')
  @ApiOperation({ summary: 'Get month schedule' })
  getMonth(
    @CurrentUser() user: any,
    @Param('date') date: string,
    @Query('teamId') teamId?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.schedulesService.getMonthSchedule(user.tenantId, date, { teamId, siteId });
  }

  @Get('alerts')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({
    summary: 'Get legal alerts (NON-BLOCKING - Informative only)',
    description: 'Returns informative alerts about legal constraints. These alerts DO NOT block operations.',
  })
  getAlerts(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.schedulesService.getAlerts(user.tenantId, startDate, endDate);
  }
}
```

---

## Points Clés des Alertes Non Bloquantes

1. **Aucune exception levée** : Les alertes sont retournées comme des données informatives
2. **Severité informative** : INFO, WARNING, CRITICAL (mais jamais de blocage)
3. **Flexibilité totale** : Le système alerte mais n'empêche jamais une action
4. **Conformité au cahier des charges** : "Un admin peut ignorer l'alerte, jamais de blocage"

### Types d'alertes implémentées :
- `WEEKLY_HOURS_EXCEEDED` : Heures hebdo > 44h
- `INSUFFICIENT_REST` : Repos < 11h entre shifts
- `NIGHT_WORK_REPETITIVE` : > 5 nuits consécutives
- `MINIMUM_STAFFING` : Effectif insuffisant

Toutes ces alertes sont **configurables** via `TenantSettings` et peuvent être désactivées individuellement.
