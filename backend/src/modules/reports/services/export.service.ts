import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { ExportReportDto, ExportFormat } from '../dto/export-report.dto';
import { ReportsService } from '../reports.service';

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async exportReport(
    tenantId: string,
    userId: string,
    reportType: string,
    dto: ExportReportDto,
    res: Response,
  ): Promise<void> {
    // Récupérer les données du rapport
    let reportData: any;
    
    switch (reportType) {
      case 'attendance':
        reportData = await this.reportsService.getAttendanceReport(tenantId, {
          startDate: dto.startDate,
          endDate: dto.endDate,
          employeeId: dto.employeeId,
          departmentId: dto.departmentId,
          siteId: dto.siteId,
          teamId: dto.teamId,
        });
        break;
      case 'overtime':
        reportData = await this.reportsService.getOvertimeReport(tenantId, {
          startDate: dto.startDate,
          endDate: dto.endDate,
          employeeId: dto.employeeId,
          departmentId: dto.departmentId,
          siteId: dto.siteId,
          teamId: dto.teamId,
        });
        break;
      case 'absences':
        reportData = await this.reportsService.getAbsencesReport(tenantId, {
          startDate: dto.startDate,
          endDate: dto.endDate,
          employeeId: dto.employeeId,
          departmentId: dto.departmentId,
          siteId: dto.siteId,
          teamId: dto.teamId,
        });
        break;
      case 'payroll':
        reportData = await this.reportsService.getPayrollReport(tenantId, {
          startDate: dto.startDate,
          endDate: dto.endDate,
          employeeId: dto.employeeId,
          departmentId: dto.departmentId,
          siteId: dto.siteId,
          teamId: dto.teamId,
        });
        break;
      default:
        throw new Error(`Type de rapport non supporté: ${reportType}`);
    }

    // Générer le fichier selon le format
    const fileName = `rapport_${reportType}_${dto.startDate}_${dto.endDate}`;
    
    // Préparer les colonnes à inclure
    const columnsToInclude = dto.columns ? dto.columns.split(',') : null;
    const template = dto.template || 'standard';
    const includeSummary = dto.includeSummary !== false; // Par défaut true
    const includeCharts = dto.includeCharts === true && dto.format === ExportFormat.PDF;
    
    switch (dto.format) {
      case ExportFormat.PDF:
        await this.exportToPDF(reportType, reportData, fileName, res, {
          columns: columnsToInclude,
          template,
          includeSummary,
          includeCharts,
        });
        break;
      case ExportFormat.EXCEL:
        await this.exportToExcel(reportType, reportData, fileName, res, {
          columns: columnsToInclude,
          template,
          includeSummary,
        });
        break;
      case ExportFormat.CSV:
        await this.exportToCSV(reportType, reportData, fileName, res, {
          columns: columnsToInclude,
        });
        break;
    }

    // Sauvegarder dans l'historique
    await this.saveReportHistory(tenantId, userId, reportType, dto.format, fileName, dto);
  }

  private async exportToPDF(
    reportType: string,
    data: any,
    fileName: string,
    res: Response,
    options?: {
      columns?: string[] | null;
      template?: string;
      includeSummary?: boolean;
      includeCharts?: boolean;
    },
  ): Promise<void> {
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
    
    doc.pipe(res);

    // En-tête
    doc.fontSize(20).text(`Rapport ${reportType}`, { align: 'center' });
    doc.moveDown();
    
    if (data.summary?.period) {
      doc.fontSize(12).text(
        `Période: ${data.summary.period.startDate} - ${data.summary.period.endDate}`,
        { align: 'center' }
      );
      doc.moveDown();
    }

    // Statistiques
    if (data.summary) {
      doc.fontSize(14).text('Résumé', { underline: true });
      doc.moveDown(0.5);
      
      Object.entries(data.summary).forEach(([key, value]) => {
        if (key !== 'period' && typeof value !== 'object') {
          doc.fontSize(10).text(`${key}: ${value}`);
        }
      });
      doc.moveDown();
    }

    // Tableau des données (simplifié - première page seulement)
    if (data.data && data.data.length > 0) {
      doc.fontSize(14).text('Données', { underline: true });
      doc.moveDown(0.5);
      
      // Limiter à 20 lignes pour éviter les PDF trop longs
      const limitedData = data.data.slice(0, 20);
      
      limitedData.forEach((item: any, index: number) => {
        doc.fontSize(9).text(`${index + 1}. ${JSON.stringify(item).substring(0, 100)}...`);
        doc.moveDown(0.3);
      });

      if (data.data.length > 20) {
        doc.moveDown();
        doc.fontSize(10).text(`... et ${data.data.length - 20} autres entrées`, { align: 'center' });
      }
    }

    doc.end();
  }

  private async exportToExcel(
    reportType: string,
    data: any,
    fileName: string,
    res: Response,
    options?: {
      columns?: string[] | null;
      template?: string;
      includeSummary?: boolean;
    },
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Feuille de résumé
    if (data.summary) {
      const summaryData = [
        ['Résumé du Rapport'],
        [],
        ...Object.entries(data.summary)
          .filter(([key, value]) => key !== 'period' && typeof value !== 'object')
          .map(([key, value]) => [key, value]),
      ];
      
      if (data.summary.period) {
        summaryData.push([], ['Période', `${data.summary.period.startDate} - ${data.summary.period.endDate}`]);
      }

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');
    }

    // Feuille de données
    if (data.data && data.data.length > 0) {
      // Convertir les données en format plat pour Excel
      const flatData = data.data.map((item: any) => {
        const flat: any = {};
        
        // Aplatir l'objet récursivement
        const flatten = (obj: any, prefix = '') => {
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            const newKey = prefix ? `${prefix}_${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
              flatten(value, newKey);
            } else {
              flat[newKey] = value instanceof Date ? value.toISOString() : value;
            }
          });
        };
        
        flatten(item);
        return flat;
      });

      const dataSheet = XLSX.utils.json_to_sheet(flatData);
      XLSX.utils.book_append_sheet(workbook, dataSheet, 'Données');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  }

  private async exportToCSV(
    reportType: string,
    data: any,
    fileName: string,
    res: Response,
    options?: {
      columns?: string[] | null;
    },
  ): Promise<void> {
    if (!data.data || data.data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
      res.send('Aucune donnée disponible\n');
      return;
    }

    // Convertir en format plat
    const flatData = data.data.map((item: any) => {
      const flat: any = {};
      const flatten = (obj: any, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const newKey = prefix ? `${prefix}_${key}` : key;
          
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            flatten(value, newKey);
          } else {
            flat[newKey] = value instanceof Date ? value.toISOString() : String(value || '');
          }
        });
      };
      flatten(item);
      return flat;
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
    res.send('\ufeff' + csv); // BOM pour Excel UTF-8
  }

  async downloadReportFromHistory(
    tenantId: string,
    userId: string,
    reportId: string,
    res: any,
  ): Promise<void> {
    const report = await this.prisma.reportHistory.findFirst({
      where: {
        id: reportId,
        tenantId,
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Pour l'instant, on ne stocke pas les fichiers physiquement
    // On pourrait régénérer le rapport avec les filtres stockés
    throw new Error('Report file download not implemented. Please regenerate the report.');
  }

  private async saveReportHistory(
    tenantId: string,
    userId: string,
    reportType: string,
    format: ExportFormat,
    fileName: string,
    filters: ExportReportDto,
  ): Promise<void> {
    await this.prisma.reportHistory.create({
      data: {
        tenantId,
        userId,
        reportType,
        format,
        fileName: `${fileName}.${format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase()}`,
        filters: filters as any,
      },
    });
  }
}

