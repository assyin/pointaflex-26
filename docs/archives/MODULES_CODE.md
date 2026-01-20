# Code des Modules Restants - PointageFlex

Ce document contient le code essentiel pour les modules restants. Chaque module suit la même structure.

## Module Employees

### employees/dto/create-employee.dto.ts
```typescript
import { IsString, IsEmail, IsOptional, IsDateString, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  matricule: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsDateString()
  hireDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  currentShiftId?: string;
}
```

### employees/employees.service.ts
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateEmployeeDto) {
    // Vérifier si matricule existe
    const existing = await this.prisma.employee.findFirst({
      where: { tenantId, matricule: dto.matricule },
    });

    if (existing) {
      throw new ConflictException('Matricule already exists');
    }

    return this.prisma.employee.create({
      data: {
        ...dto,
        tenantId,
        hireDate: new Date(dto.hireDate),
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      include: {
        site: true,
        department: true,
        team: true,
        currentShift: true,
      },
    });
  }

  async findAll(tenantId: string, page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId, isActive: true };

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { matricule: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.teamId) where.teamId = filters.teamId;

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          site: true,
          department: true,
          team: true,
          currentShift: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        site: true,
        department: true,
        team: true,
        currentShift: true,
        user: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(tenantId, id);

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
      include: {
        site: true,
        department: true,
        team: true,
        currentShift: true,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async setBiometric(tenantId: string, id: string, type: string, data: string) {
    await this.findOne(tenantId, id);

    const updateData: any = {};

    switch (type) {
      case 'FINGERPRINT':
        updateData.fingerprintData = data;
        break;
      case 'FACE':
        updateData.faceData = data;
        break;
      case 'RFID':
        updateData.rfidBadge = data;
        break;
      case 'QR':
        updateData.qrCode = data;
        break;
      case 'PIN':
        updateData.pinCode = data;
        break;
    }

    return this.prisma.employee.update({
      where: { id },
      data: updateData,
    });
  }
}
```

### employees/employees.controller.ts
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Employees')
@Controller('employees')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Create employee' })
  create(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.employeesService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      { search, siteId, departmentId, teamId },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN_RH, Role.MANAGER)
  @ApiOperation({ summary: 'Update employee' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_RH)
  @ApiOperation({ summary: 'Deactivate employee' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.remove(user.tenantId, id);
  }

  @Post(':id/biometric')
  @Roles(Role.ADMIN_RH)
  @ApiOperation({ summary: 'Set biometric data' })
  setBiometric(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { type: string; data: string },
  ) {
    return this.employeesService.setBiometric(user.tenantId, id, body.type, body.data);
  }
}
```

---

## Module Attendance

### attendance/dto/create-attendance.dto.ts
```typescript
import { IsString, IsEnum, IsDateString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceType, DeviceType } from '@prisma/client';

export class CreateAttendanceDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ enum: AttendanceType })
  @IsEnum(AttendanceType)
  type: AttendanceType;

  @ApiProperty({ enum: DeviceType })
  @IsEnum(DeviceType)
  method: DeviceType;

  @ApiProperty()
  @IsDateString()
  timestamp: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
```

### attendance/attendance.service.ts
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { AnomalyDetectionService } from './anomaly-detection.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private anomalyDetection: AnomalyDetectionService,
  ) {}

  async create(tenantId: string, dto: CreateAttendanceDto) {
    const attendance = await this.prisma.attendance.create({
      data: {
        ...dto,
        tenantId,
        timestamp: new Date(dto.timestamp),
      },
      include: {
        employee: true,
        device: true,
      },
    });

    // Détecter anomalies
    await this.anomalyDetection.detectAnomalies(attendance);

    return attendance;
  }

  async findAll(tenantId: string, page = 1, limit = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.hasAnomaly !== undefined) where.hasAnomaly = filters.hasAnomaly;

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: true,
          device: true,
        },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: true,
        device: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    return attendance;
  }

  async correct(tenantId: string, id: string, userId: string, dto: any) {
    await this.findOne(tenantId, id);

    return this.prisma.attendance.update({
      where: { id },
      data: {
        ...dto,
        isCorrected: true,
        correctedBy: userId,
        correctedAt: new Date(),
        timestamp: dto.timestamp ? new Date(dto.timestamp) : undefined,
      },
    });
  }

  async getAnomalies(tenantId: string, page = 1, limit = 20, filters?: any) {
    return this.findAll(tenantId, page, limit, { ...filters, hasAnomaly: true });
  }

  async getEmployeeAttendance(tenantId: string, employeeId: string, startDate: string, endDate: string) {
    const attendance = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculer les heures travaillées par jour
    const dailyHours = this.calculateDailyHours(attendance);

    return {
      attendance,
      summary: dailyHours,
    };
  }

  private calculateDailyHours(attendance: any[]) {
    // Logic to calculate daily hours from IN/OUT pairs
    // Grouper par jour, matcher IN/OUT, calculer durée
    const dailyMap = new Map();

    attendance.forEach((record) => {
      const date = record.timestamp.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { in: null, out: null, hours: 0 });
      }

      const day = dailyMap.get(date);
      if (record.type === 'IN' && !day.in) {
        day.in = record.timestamp;
      } else if (record.type === 'OUT') {
        day.out = record.timestamp;
      }

      // Calculate hours if both in and out exist
      if (day.in && day.out) {
        day.hours = (day.out - day.in) / (1000 * 60 * 60); // hours
      }
    });

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }
}
```

### attendance/anomaly-detection.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnomalyDetectionService {
  constructor(private prisma: PrismaService) {}

  async detectAnomalies(attendance: any) {
    const anomalies: string[] = [];

    // 1. Vérifier double pointage IN
    if (attendance.type === 'IN') {
      const lastAttendance = await this.prisma.attendance.findFirst({
        where: {
          employeeId: attendance.employeeId,
          timestamp: {
            lt: attendance.timestamp,
            gte: new Date(attendance.timestamp.getTime() - 24 * 60 * 60 * 1000), // 24h avant
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (lastAttendance && lastAttendance.type === 'IN') {
        anomalies.push('DOUBLE_IN');
      }
    }

    // 2. Vérifier OUT sans IN
    if (attendance.type === 'OUT') {
      const lastAttendance = await this.prisma.attendance.findFirst({
        where: {
          employeeId: attendance.employeeId,
          timestamp: {
            lt: attendance.timestamp,
            gte: new Date(attendance.timestamp.getTime() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastAttendance || lastAttendance.type !== 'IN') {
        anomalies.push('OUT_WITHOUT_IN');
      }
    }

    // 3. Vérifier retard (exemple : après 8h15)
    const employee = await this.prisma.employee.findUnique({
      where: { id: attendance.employeeId },
      include: { currentShift: true },
    });

    if (employee?.currentShift && attendance.type === 'IN') {
      const shiftStart = employee.currentShift.startTime; // "08:00"
      const attendanceTime = attendance.timestamp.toTimeString().substring(0, 5);

      if (attendanceTime > shiftStart) {
        anomalies.push('LATE');
      }
    }

    // Mettre à jour si anomalies détectées
    if (anomalies.length > 0) {
      await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          hasAnomaly: true,
          anomalyType: anomalies.join(','),
          anomalyNote: `Anomalies détectées: ${anomalies.join(', ')}`,
        },
      });
    }
  }
}
```

---

## Note pour les modules restants

Les modules **Shifts**, **Teams**, **Schedules**, **Leaves**, **Overtime**, **Reports**, et **Audit** suivent la même structure :

1. **DTOs** dans `/dto`
2. **Service** avec CRUD + logique métier
3. **Controller** avec routes et guards
4. **Module** pour importer/exporter

Chaque service utilise `PrismaService` et respecte l'isolation multi-tenant avec `tenantId`.

### Exemple de structure générique :

```
module-name/
├── dto/
│   ├── create-{entity}.dto.ts
│   ├── update-{entity}.dto.ts
│   └── filter-{entity}.dto.ts
├── {entity}.service.ts
├── {entity}.controller.ts
└── {entity}.module.ts
```

Tous les contrôleurs utilisent :
- `@CurrentUser()` pour récupérer l'utilisateur connecté
- `@Roles()` pour les permissions
- `@ApiBearerAuth()` pour Swagger
- Pagination standard pour les listes

Les services implémentent :
- `create()`, `findAll()`, `findOne()`, `update()`, `remove()`
- Filtres personnalisés selon le module
- Logique métier spécifique
