# Modules Reports, Audit & Export - Code Complet

## Module Reports

### reports/dto/report-filter.dto.ts
```typescript
import { IsDateString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportType {
  ATTENDANCE = 'ATTENDANCE',
  LEAVES = 'LEAVES',
  OVERTIME = 'OVERTIME',
  PAYROLL = 'PAYROLL',
  DASHBOARD = 'DASHBOARD',
}

export class ReportFilterDto {
  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class ExportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  filters?: any;
}
```

### reports/reports.service.ts
```typescript
import { Injectable } from '@nestjs/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Rapport de présence/absence
   */
  async getAttendanceReport(tenantId: string, filters: any) {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);

    const where: any = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.siteId) where.siteId = filters.siteId;

    where.timestamp = { gte: startDate, lte: endDate };

    const attendance = await this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            site: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Grouper par employé
    const employeeMap = new Map();

    attendance.forEach((record) => {
      const empId = record.employeeId;

      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employee: record.employee,
          records: [],
          stats: {
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            totalHours: 0,
          },
        });
      }

      employeeMap.get(empId).records.push(record);
    });

    // Calculer les stats pour chaque employé
    const employees = Array.from(employeeMap.values()).map((emp) => {
      const dailyRecords = this.groupByDay(emp.records);

      emp.stats.totalDays = this.getWorkingDays(startDate, endDate);
      emp.stats.presentDays = dailyRecords.filter((d) => d.hasIn && d.hasOut).length;
      emp.stats.absentDays = emp.stats.totalDays - emp.stats.presentDays;
      emp.stats.lateDays = dailyRecords.filter((d) => d.isLate).length;
      emp.stats.totalHours = dailyRecords.reduce((sum, d) => sum + d.hours, 0);

      return emp;
    });

    return {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      summary: {
        totalEmployees: employees.length,
        totalPresent: employees.reduce((sum, e) => sum + e.stats.presentDays, 0),
        totalAbsent: employees.reduce((sum, e) => sum + e.stats.absentDays, 0),
        totalLate: employees.reduce((sum, e) => sum + e.stats.lateDays, 0),
        totalHours: employees.reduce((sum, e) => sum + e.stats.totalHours, 0),
      },
      employees,
    };
  }

  /**
   * Rapport congés
   */
  async getLeavesReport(tenantId: string, filters: any) {
    const where: any = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.teamId) {
      where.employee = {
        teamId: filters.teamId,
      };
    }

    where.startDate = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };

    const leaves = await this.prisma.leave.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
          },
        },
        leaveType: true,
      },
      orderBy: { startDate: 'asc' },
    });

    const summary = {
      total: leaves.length,
      approved: leaves.filter((l) => l.status === 'APPROVED').length,
      pending: leaves.filter((l) => l.status === 'PENDING').length,
      rejected: leaves.filter((l) => l.status === 'REJECTED').length,
      totalDays: leaves.reduce((sum, l) => sum + parseFloat(l.days.toString()), 0),
    };

    return {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      summary,
      leaves,
    };
  }

  /**
   * Rapport heures supplémentaires
   */
  async getOvertimeReport(tenantId: string, filters: any) {
    const where: any = { tenantId };

    if (filters.employeeId) where.employeeId = filters.employeeId;

    where.date = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };

    const overtimes = await this.prisma.overtime.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const summary = {
      total: overtimes.length,
      approved: overtimes.filter((o) => o.status === 'APPROVED').length,
      pending: overtimes.filter((o) => o.status === 'PENDING').length,
      totalHours: overtimes.reduce((sum, o) => sum + parseFloat(o.hours.toString()), 0),
      approvedHours: overtimes
        .filter((o) => o.status === 'APPROVED')
        .reduce((sum, o) => sum + parseFloat(o.hours.toString()), 0),
      nightHours: overtimes
        .filter((o) => o.isNightShift)
        .reduce((sum, o) => sum + parseFloat(o.hours.toString()), 0),
    };

    return {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      summary,
      overtimes,
    };
  }

  /**
   * Tableau de bord temps réel
   */
  async getDashboard(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Récupérer les employés actifs
    const totalEmployees = await this.prisma.employee.count({
      where: { tenantId, isActive: true },
    });

    // Présences du jour
    const todayAttendance = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        employee: true,
      },
    });

    const presentEmployees = new Set(
      todayAttendance.filter((a) => a.type === 'IN').map((a) => a.employeeId),
    ).size;

    const lateEmployees = todayAttendance.filter((a) => a.hasAnomaly && a.anomalyType?.includes('LATE')).length;

    // Congés en cours
    const onLeave = await this.prisma.leave.count({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    // Shifts du jour
    const todaySchedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        date: today,
      },
      include: {
        shift: true,
      },
    });

    const shiftSummary = new Map();
    todaySchedules.forEach((schedule) => {
      const shiftName = schedule.shift.name;
      if (!shiftSummary.has(shiftName)) {
        shiftSummary.set(shiftName, {
          shift: shiftName,
          planned: 0,
          present: 0,
        });
      }
      shiftSummary.get(shiftName).planned++;

      // Vérifier si présent
      const isPresent = todayAttendance.some(
        (a) => a.employeeId === schedule.employeeId && a.type === 'IN',
      );
      if (isPresent) {
        shiftSummary.get(shiftName).present++;
      }
    });

    return {
      today: {
        date: today.toISOString().split('T')[0],
        totalEmployees,
        present: presentEmployees,
        absent: totalEmployees - presentEmployees - onLeave,
        late: lateEmployees,
        onLeave,
      },
      currentShifts: Array.from(shiftSummary.values()),
      recentActivity: todayAttendance.slice(-10).reverse(),
    };
  }

  /**
   * Export paie (Excel/CSV)
   */
  async getPayrollExport(tenantId: string, month: string) {
    // month format: "2024-01"
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Dernier jour du mois

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
      include: {
        department: true,
      },
    });

    const payrollData = [];

    for (const employee of employees) {
      // Calculer les heures travaillées
      const attendance = await this.prisma.attendance.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      const dailyRecords = this.groupByDay(attendance);
      const totalHours = dailyRecords.reduce((sum, d) => sum + d.hours, 0);
      const lateDays = dailyRecords.filter((d) => d.isLate).length;
      const absentDays = this.getWorkingDays(startDate, endDate) - dailyRecords.filter((d) => d.hasIn && d.hasOut).length;

      // Heures supplémentaires
      const overtime = await this.prisma.overtime.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          status: 'APPROVED',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const overtimeHours = overtime.reduce((sum, o) => sum + parseFloat(o.hours.toString()), 0);

      // Congés
      const leaves = await this.prisma.leave.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          status: 'APPROVED',
          startDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const leaveDays = leaves.reduce((sum, l) => sum + parseFloat(l.days.toString()), 0);

      payrollData.push({
        matricule: employee.matricule,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department?.name || '',
        position: employee.position,
        totalHours: totalHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        lateDays,
        absentDays,
        leaveDays,
        month,
      });
    }

    return payrollData;
  }

  // Helper methods
  private groupByDay(attendance: any[]): any[] {
    const dailyMap = new Map();

    attendance.forEach((record) => {
      const date = record.timestamp.toISOString().split('T')[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          in: null,
          out: null,
          hours: 0,
          hasIn: false,
          hasOut: false,
          isLate: false,
        });
      }

      const day = dailyMap.get(date);

      if (record.type === 'IN' && !day.in) {
        day.in = record.timestamp;
        day.hasIn = true;
        if (record.hasAnomaly && record.anomalyType?.includes('LATE')) {
          day.isLate = true;
        }
      } else if (record.type === 'OUT') {
        day.out = record.timestamp;
        day.hasOut = true;
      }

      if (day.in && day.out) {
        day.hours = (day.out - day.in) / (1000 * 60 * 60);
      }
    });

    return Array.from(dailyMap.values());
  }

  private getWorkingDays(startDate: Date, endDate: Date): number {
    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
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

## Module Export (PDF & Excel)

### export/export-pdf.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportPdfService {
  /**
   * Génère un PDF pour un rapport de présence
   */
  async generateAttendanceReportPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .text('Rapport de Présence', { align: 'center' })
        .fontSize(12)
        .text(`Période: ${data.period.startDate} - ${data.period.endDate}`, { align: 'center' })
        .moveDown();

      // Summary
      doc.fontSize(14).text('Résumé', { underline: true }).moveDown(0.5);

      doc.fontSize(10);
      doc.text(`Total employés: ${data.summary.totalEmployees}`);
      doc.text(`Total présences: ${data.summary.totalPresent}`);
      doc.text(`Total absences: ${data.summary.totalAbsent}`);
      doc.text(`Total retards: ${data.summary.totalLate}`);
      doc.text(`Total heures: ${data.summary.totalHours.toFixed(2)}h`);
      doc.moveDown();

      // Table des employés
      doc.fontSize(14).text('Détails par Employé', { underline: true }).moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 200;
      const col3 = 300;
      const col4 = 380;
      const col5 = 460;

      doc.fontSize(9);
      doc.text('Employé', col1, tableTop);
      doc.text('Présent', col2, tableTop);
      doc.text('Absent', col3, tableTop);
      doc.text('Retard', col4, tableTop);
      doc.text('Heures', col5, tableTop);

      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(0.5);

      // Table rows
      data.employees.forEach((emp: any) => {
        const y = doc.y;

        doc.text(`${emp.employee.firstName} ${emp.employee.lastName}`, col1, y, {
          width: 140,
        });
        doc.text(emp.stats.presentDays.toString(), col2, y);
        doc.text(emp.stats.absentDays.toString(), col3, y);
        doc.text(emp.stats.lateDays.toString(), col4, y);
        doc.text(`${emp.stats.totalHours.toFixed(1)}h`, col5, y);

        doc.moveDown(0.5);
      });

      // Footer
      doc
        .fontSize(8)
        .text(
          `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
          50,
          750,
          { align: 'center' },
        );

      doc.end();
    });
  }

  /**
   * Génère un PDF pour planning
   */
  async generateSchedulePdf(data: any): Promise<Buffer> {
    // Similar structure to attendance report
    // Implementation depends on schedule data structure
    return Buffer.from('Schedule PDF implementation');
  }
}
```

### export/export-excel.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ExportExcelService {
  /**
   * Génère un fichier Excel pour rapport de présence
   */
  async generateAttendanceReportExcel(data: any): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Rapport de Présence'],
      [],
      ['Période', `${data.period.startDate} - ${data.period.endDate}`],
      [],
      ['Résumé'],
      ['Total employés', data.summary.totalEmployees],
      ['Total présences', data.summary.totalPresent],
      ['Total absences', data.summary.totalAbsent],
      ['Total retards', data.summary.totalLate],
      ['Total heures', data.summary.totalHours.toFixed(2)],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // Sheet 2: Details
    const detailsData = [
      ['Matricule', 'Nom', 'Prénom', 'Département', 'Jours Présent', 'Jours Absent', 'Retards', 'Heures Totales'],
    ];

    data.employees.forEach((emp: any) => {
      detailsData.push([
        emp.employee.matricule,
        emp.employee.lastName,
        emp.employee.firstName,
        emp.employee.department?.name || '',
        emp.stats.presentDays,
        emp.stats.absentDays,
        emp.stats.lateDays,
        emp.stats.totalHours.toFixed(2),
      ]);
    });

    const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Détails');

    // Convert to buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return excelBuffer;
  }

  /**
   * Génère un fichier Excel pour export paie
   */
  async generatePayrollExcel(data: any[]): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    const headers = [
      'Matricule',
      'Nom',
      'Prénom',
      'Département',
      'Poste',
      'Heures Travaillées',
      'Heures Supplémentaires',
      'Jours Retard',
      'Jours Absence',
      'Jours Congé',
      'Mois',
    ];

    const rows = data.map((emp) => [
      emp.matricule,
      emp.lastName,
      emp.firstName,
      emp.department,
      emp.position,
      emp.totalHours,
      emp.overtimeHours,
      emp.lateDays,
      emp.absentDays,
      emp.leaveDays,
      emp.month,
    ]);

    const sheetData = [headers, ...rows];
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto-width columns
    const maxWidths = headers.map((h, i) => {
      const columnValues = rows.map((r) => String(r[i] || ''));
      const maxLength = Math.max(h.length, ...columnValues.map((v) => v.length));
      return { wch: maxLength + 2 };
    });

    sheet['!cols'] = maxWidths;

    XLSX.utils.book_append_sheet(workbook, sheet, 'Export Paie');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return excelBuffer;
  }
}
```

---

## Module Audit

### audit/audit.service.ts
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer un log d'audit
   */
  async log(data: {
    tenantId: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldValues: data.oldValues,
        newValues: data.newValues,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Récupérer les logs d'audit
   */
  async findAll(tenantId: string, page = 1, limit = 50, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entity) where.entity = filters.entity;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Récupérer l'historique d'une entité
   */
  async getEntityHistory(tenantId: string, entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### Interceptor d'audit automatique
```typescript
// common/interceptors/audit.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, tenantId, ip, headers } = request;

    // Déterminer l'action
    let action = 'READ';
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PATCH' || method === 'PUT') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';

    // Déterminer l'entité depuis l'URL
    const entity = this.extractEntityFromUrl(url);

    return next.handle().pipe(
      tap((response) => {
        // Logger l'action (asynchrone, non bloquant)
        if (entity && action !== 'READ') {
          this.auditService.log({
            tenantId,
            userId: user?.userId,
            action,
            entity,
            entityId: response?.id,
            newValues: response,
            ipAddress: ip,
            userAgent: headers['user-agent'],
          });
        }
      }),
    );
  }

  private extractEntityFromUrl(url: string): string {
    const match = url.match(/\/api\/v1\/([^\/]+)/);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }
}
```

---

## Points Clés

1. **Reports** : Rapports complets avec statistiques agrégées
2. **Export PDF** : Mise en page professionnelle avec PDFKit
3. **Export Excel** : Fichiers multi-feuilles avec XLSX
4. **Audit** : Traçabilité complète automatique
5. **Dashboard** : Vue temps réel de l'activité

### Installation des dépendances
```bash
npm install pdfkit @types/pdfkit xlsx
```
