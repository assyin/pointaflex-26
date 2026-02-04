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

    // Appeler la méthode appropriée selon le type de rapport
    switch (reportType) {
      case 'absences':
        this.buildAbsencesExcel(workbook, data);
        break;
      case 'attendance':
        this.buildAttendanceExcel(workbook, data);
        break;
      case 'overtime':
        this.buildOvertimeExcel(workbook, data);
        break;
      case 'payroll':
        this.buildPayrollExcel(workbook, data);
        break;
      default:
        this.buildGenericExcel(workbook, data);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  }

  /**
   * Export Excel pour le rapport Absences/Retards
   */
  private buildAbsencesExcel(workbook: XLSX.WorkBook, data: any): void {
    const { anomalies = [], absences = [], recoveryDays = [] } = data.data || {};
    const summary = data.summary || {};

    // ============ FEUILLE RÉSUMÉ ============
    const summaryRows = [
      ['RAPPORT ABSENCES ET RETARDS'],
      [],
      ['Période', `${summary.period?.startDate || '-'} au ${summary.period?.endDate || '-'}`],
      [],
      ['STATISTIQUES GLOBALES'],
      ['Total Anomalies', summary.totalAnomalies || 0],
      ['Total Retards', summary.lateCount || 0],
      ['Total Absences', summary.totalAbsences || 0],
      ['Total Départs Anticipés', summary.earlyLeaveCount || 0],
      ['Total Jours de Récupération', summary.totalRecoveryDays || 0],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    // Largeur des colonnes
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // ============ FEUILLE RETARDS ============
    const retards = anomalies.filter((a: any) => a.anomalyType?.includes('LATE') || a.type?.includes('LATE'));
    const retardsHeaders = ['Matricule', 'Nom', 'Prénom', 'Département', 'Site', 'Date', 'Heure Pointage', 'Type Anomalie', 'Remarque'];
    const retardsData = retards.map((r: any) => [
      r.employee?.matricule || '-',
      r.employee?.lastName || '-',
      r.employee?.firstName || '-',
      r.employee?.department?.name || '-',
      r.employee?.site?.name || '-',
      this.formatDateFr(r.timestamp),
      this.formatTimeFr(r.timestamp),
      this.translateAnomalyType(r.anomalyType || r.type),
      r.comment || '-',
    ]);

    const retardsSheet = XLSX.utils.aoa_to_sheet([retardsHeaders, ...retardsData]);
    retardsSheet['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(workbook, retardsSheet, `Retards (${retards.length})`);

    // ============ FEUILLE ABSENCES ============
    const absencesHeaders = ['Matricule', 'Nom', 'Prénom', 'Département', 'Site', 'Équipe', 'Date', 'Shift', 'Statut'];
    const absencesData = absences.map((a: any) => [
      a.employee?.matricule || '-',
      a.employee?.lastName || '-',
      a.employee?.firstName || '-',
      a.employee?.department?.name || '-',
      a.employee?.site?.name || '-',
      a.employee?.team?.name || '-',
      a.date || '-',
      a.shiftName || '-',
      'Absent',
    ]);

    const absencesSheet = XLSX.utils.aoa_to_sheet([absencesHeaders, ...absencesData]);
    absencesSheet['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, absencesSheet, `Absences (${absences.length})`);

    // ============ FEUILLE DÉPARTS ANTICIPÉS ============
    const earlyLeaves = anomalies.filter((a: any) => a.anomalyType?.includes('EARLY_LEAVE') || a.type?.includes('EARLY_LEAVE'));
    const earlyLeavesHeaders = ['Matricule', 'Nom', 'Prénom', 'Département', 'Site', 'Date', 'Heure Sortie', 'Type', 'Remarque'];
    const earlyLeavesData = earlyLeaves.map((e: any) => [
      e.employee?.matricule || '-',
      e.employee?.lastName || '-',
      e.employee?.firstName || '-',
      e.employee?.department?.name || '-',
      e.employee?.site?.name || '-',
      this.formatDateFr(e.timestamp),
      this.formatTimeFr(e.timestamp),
      'Départ anticipé',
      e.comment || '-',
    ]);

    const earlyLeavesSheet = XLSX.utils.aoa_to_sheet([earlyLeavesHeaders, ...earlyLeavesData]);
    earlyLeavesSheet['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(workbook, earlyLeavesSheet, `Départs Anticipés (${earlyLeaves.length})`);

    // ============ FEUILLE RÉCUPÉRATION ============
    if (recoveryDays.length > 0) {
      const recoveryHeaders = ['Employé ID', 'Date Début', 'Date Fin', 'Motif', 'Statut', 'Créé le'];
      const recoveryData = recoveryDays.map((rd: any) => [
        rd.employeeId || '-',
        this.formatDateFr(rd.startDate),
        this.formatDateFr(rd.endDate),
        rd.reason || '-',
        this.translateRecoveryStatus(rd.status),
        this.formatDateFr(rd.createdAt),
      ]);

      const recoverySheet = XLSX.utils.aoa_to_sheet([recoveryHeaders, ...recoveryData]);
      recoverySheet['!cols'] = [
        { wch: 36 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, recoverySheet, `Récupérations (${recoveryDays.length})`);
    }
  }

  /**
   * Export Excel pour le rapport Pointage (Attendance)
   */
  private buildAttendanceExcel(workbook: XLSX.WorkBook, data: any): void {
    const attendanceData = Array.isArray(data.data) ? data.data : [];
    const summary = data.summary || {};

    // ============ FEUILLE RÉSUMÉ ============
    const summaryRows = [
      ['RAPPORT DE POINTAGE'],
      [],
      ['Période', `${summary.period?.startDate || '-'} au ${summary.period?.endDate || '-'}`],
      [],
      ['STATISTIQUES GLOBALES'],
      ['Total Employés', summary.totalEmployees || 0],
      ['Total Jours Travaillés', summary.totalDaysWorked || 0],
      ['Total Heures Travaillées', this.formatHours(summary.totalHoursWorked || 0)],
      ['Heures Moyennes/Jour', this.formatHours(summary.averageHoursPerDay || 0)],
      ['Total Pointages', summary.totalAttendance || 0],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // ============ FEUILLE DÉTAIL POINTAGES ============
    const headers = [
      'Matricule', 'Nom', 'Prénom', 'Département', 'Site',
      'Date', 'Entrée', 'Sortie', 'Durée (h)', 'Shift',
      'Anomalie', 'Type Anomalie', 'Commentaire'
    ];

    const rows = attendanceData.map((att: any) => [
      att.employee?.matricule || att.matricule || '-',
      att.employee?.lastName || att.lastName || '-',
      att.employee?.firstName || att.firstName || '-',
      att.employee?.department?.name || att.department || '-',
      att.employee?.site?.name || att.site || '-',
      this.formatDateFr(att.date || att.timestamp),
      this.formatTimeFr(att.checkIn || att.timestamp),
      this.formatTimeFr(att.checkOut),
      att.hoursWorked ? this.formatHours(att.hoursWorked) : '-',
      att.shift?.name || att.shiftName || '-',
      att.hasAnomaly ? 'Oui' : 'Non',
      att.hasAnomaly ? this.translateAnomalyType(att.anomalyType) : '-',
      att.comment || '-',
    ]);

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    dataSheet['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
      { wch: 10 }, { wch: 20 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, `Pointages (${rows.length})`);

    // ============ FEUILLE PAR EMPLOYÉ (Résumé) ============
    if (summary.byEmployee && Array.isArray(summary.byEmployee)) {
      const empHeaders = ['Matricule', 'Nom Complet', 'Département', 'Jours Travaillés', 'Heures Totales', 'Heures Moyennes/Jour', 'Retards', 'Absences'];
      const empRows = summary.byEmployee.map((emp: any) => [
        emp.matricule || '-',
        emp.fullName || `${emp.lastName || ''} ${emp.firstName || ''}`.trim() || '-',
        emp.department || '-',
        emp.daysWorked || 0,
        this.formatHours(emp.totalHours || 0),
        this.formatHours(emp.averageHoursPerDay || 0),
        emp.lateCount || 0,
        emp.absenceCount || 0,
      ]);

      const empSheet = XLSX.utils.aoa_to_sheet([empHeaders, ...empRows]);
      empSheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(workbook, empSheet, 'Résumé par Employé');
    }
  }

  /**
   * Export Excel pour le rapport Heures Supplémentaires
   */
  private buildOvertimeExcel(workbook: XLSX.WorkBook, data: any): void {
    const overtimeData = Array.isArray(data.data) ? data.data : [];
    const summary = data.summary || {};

    // ============ FEUILLE RÉSUMÉ ============
    const summaryRows = [
      ['RAPPORT HEURES SUPPLÉMENTAIRES'],
      [],
      ['Période', `${summary.period?.startDate || '-'} au ${summary.period?.endDate || '-'}`],
      [],
      ['STATISTIQUES GLOBALES'],
      ['Total Heures Supp.', this.formatHours(summary.totalOvertimeHours || 0)],
      ['Employés avec HS', summary.employeesWithOvertime || 0],
      ['Moyenne HS/Employé', this.formatHours(summary.averageOvertimePerEmployee || 0)],
      ['Coût Total Estimé', `${summary.totalOvertimeCost || 0} DH`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // ============ FEUILLE DÉTAIL HS ============
    const headers = [
      'Matricule', 'Nom', 'Prénom', 'Département', 'Site',
      'Date', 'Heure Début', 'Heure Fin', 'Durée HS (h)',
      'Taux', 'Montant', 'Validé', 'Commentaire'
    ];

    const rows = overtimeData.map((ot: any) => [
      ot.employee?.matricule || '-',
      ot.employee?.lastName || '-',
      ot.employee?.firstName || '-',
      ot.employee?.department?.name || '-',
      ot.employee?.site?.name || '-',
      this.formatDateFr(ot.date),
      this.formatTimeFr(ot.startTime),
      this.formatTimeFr(ot.endTime),
      this.formatHours(ot.hours || ot.overtimeHours || 0),
      ot.rate ? `${ot.rate}%` : '-',
      ot.amount ? `${ot.amount} DH` : '-',
      ot.validated ? 'Oui' : 'Non',
      ot.comment || '-',
    ]);

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    dataSheet['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, `Heures Supp. (${rows.length})`);

    // ============ FEUILLE RÉSUMÉ PAR EMPLOYÉ ============
    if (summary.byEmployee && Array.isArray(summary.byEmployee)) {
      const empHeaders = ['Matricule', 'Nom Complet', 'Département', 'Total HS (h)', 'Montant Total', 'Nb Jours avec HS'];
      const empRows = summary.byEmployee.map((emp: any) => [
        emp.matricule || '-',
        emp.fullName || '-',
        emp.department || '-',
        this.formatHours(emp.totalOvertimeHours || 0),
        `${emp.totalAmount || 0} DH`,
        emp.daysWithOvertime || 0,
      ]);

      const empSheet = XLSX.utils.aoa_to_sheet([empHeaders, ...empRows]);
      empSheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, empSheet, 'Résumé par Employé');
    }
  }

  /**
   * Export Excel pour le rapport Paie
   */
  private buildPayrollExcel(workbook: XLSX.WorkBook, data: any): void {
    const payrollData = Array.isArray(data.data) ? data.data : [];
    const summary = data.summary || {};

    // ============ FEUILLE RÉSUMÉ ============
    const summaryRows = [
      ['RAPPORT EXPORT PAIE'],
      [],
      ['Période', `${summary.period?.startDate || '-'} au ${summary.period?.endDate || '-'}`],
      [],
      ['STATISTIQUES GLOBALES'],
      ['Total Employés', summary.totalEmployees || 0],
      ['Total Heures Normales', this.formatHours(summary.totalNormalHours || 0)],
      ['Total Heures Supp.', this.formatHours(summary.totalOvertimeHours || 0)],
      ['Total Absences', summary.totalAbsences || 0],
      ['Total Retards', summary.totalLateArrivals || 0],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // ============ FEUILLE DÉTAIL PAIE ============
    const headers = [
      'Matricule', 'Nom', 'Prénom', 'Département', 'Site',
      'Jours Travaillés', 'Heures Normales', 'Heures Supp.',
      'Absences', 'Retards', 'Jours Récup.', 'Jours Congé'
    ];

    const rows = payrollData.map((p: any) => [
      p.employee?.matricule || p.matricule || '-',
      p.employee?.lastName || p.lastName || '-',
      p.employee?.firstName || p.firstName || '-',
      p.employee?.department?.name || p.department || '-',
      p.employee?.site?.name || p.site || '-',
      p.daysWorked || 0,
      this.formatHours(p.normalHours || 0),
      this.formatHours(p.overtimeHours || 0),
      p.absences || 0,
      p.lateArrivals || 0,
      p.recoveryDays || 0,
      p.leaveDays || 0,
    ]);

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    dataSheet['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, `Détail Paie (${rows.length})`);
  }

  /**
   * Export Excel générique (fallback)
   */
  private buildGenericExcel(workbook: XLSX.WorkBook, data: any): void {
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
    const dataArray = Array.isArray(data.data) ? data.data : [];
    if (dataArray.length > 0) {
      const flatData = dataArray.map((item: any) => {
        const flat: any = {};
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
  }

  // ============ HELPERS ============

  private formatDateFr(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatTimeFr(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private formatHours(hours: number): string {
    if (!hours && hours !== 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  private translateAnomalyType(type: string): string {
    if (!type) return '-';
    const translations: Record<string, string> = {
      'LATE_ARRIVAL': 'Retard',
      'LATE': 'Retard',
      'EARLY_LEAVE': 'Départ anticipé',
      'EARLY_DEPARTURE': 'Départ anticipé',
      'MISSING_CHECKOUT': 'Sortie manquante',
      'MISSING_CHECKIN': 'Entrée manquante',
      'WEEKEND_WORK': 'Travail weekend',
      'HOLIDAY_WORK': 'Travail jour férié',
      'OVERTIME': 'Heures supplémentaires',
    };
    return translations[type] || type;
  }

  private translateRecoveryStatus(status: string): string {
    if (!status) return '-';
    const translations: Record<string, string> = {
      'PENDING': 'En attente',
      'APPROVED': 'Approuvé',
      'USED': 'Utilisé',
      'REJECTED': 'Rejeté',
      'EXPIRED': 'Expiré',
    };
    return translations[status] || status;
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

  // ============================================
  // EXPORT SOLDE DE CONGÉS
  // ============================================

  async exportLeaveBalance(
    tenantId: string,
    filters: {
      year?: number;
      siteId?: string;
      departmentId?: string;
      teamId?: string;
    },
    res: Response,
  ): Promise<void> {
    const currentYear = filters.year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    // Get tenant settings for default quota
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { annualLeaveDays: true },
    });
    const defaultQuota = tenantSettings?.annualLeaveDays ?? 18;

    // Build employee filter
    const whereClause: any = {
      tenantId,
      isActive: true,
    };
    if (filters.siteId) whereClause.siteId = filters.siteId;
    if (filters.departmentId) whereClause.departmentId = filters.departmentId;
    if (filters.teamId) whereClause.teamId = filters.teamId;

    // Get all active employees with their leaves
    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      include: {
        site: { select: { name: true } },
        department: { select: { name: true } },
        team: { select: { name: true } },
        leaves: {
          where: {
            startDate: { lte: endOfYear },
            endDate: { gte: startOfYear },
          },
          include: {
            leaveType: { select: { name: true } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Calculate balances
    const balanceData = employees.map((emp) => {
      const quota = emp.leaveQuota ?? defaultQuota;
      const quotaSource = emp.leaveQuota !== null ? 'Personnalisé' : 'Défaut';

      // Approved leaves
      const approvedLeaves = emp.leaves.filter((l) => l.status === 'APPROVED' || l.status === 'HR_APPROVED');
      const taken = approvedLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);

      // Pending leaves
      const pendingLeaves = emp.leaves.filter((l) => l.status === 'PENDING' || l.status === 'MANAGER_APPROVED');
      const pending = pendingLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);

      // Remaining
      const remaining = quota - taken;

      return {
        matricule: emp.matricule,
        lastName: emp.lastName,
        firstName: emp.firstName,
        site: emp.site?.name || '-',
        department: emp.department?.name || '-',
        team: emp.team?.name || '-',
        quota,
        quotaSource,
        taken,
        pending,
        remaining,
        status: remaining <= 0 ? 'ÉPUISÉ' : remaining <= 3 ? 'FAIBLE' : 'OK',
        approvedDetails: approvedLeaves.map((l) => ({
          type: l.leaveType?.name || 'N/A',
          start: this.formatDateFr(l.startDate),
          end: this.formatDateFr(l.endDate),
          days: Number(l.days) || 0,
        })),
      };
    });

    // Build Excel
    const workbook = XLSX.utils.book_new();

    // ============ FEUILLE RÉSUMÉ ============
    const totalEmployees = balanceData.length;
    const totalQuota = balanceData.reduce((sum, b) => sum + b.quota, 0);
    const totalTaken = balanceData.reduce((sum, b) => sum + b.taken, 0);
    const totalPending = balanceData.reduce((sum, b) => sum + b.pending, 0);
    const totalRemaining = balanceData.reduce((sum, b) => sum + b.remaining, 0);
    const withCustomQuota = balanceData.filter((b) => b.quotaSource === 'Personnalisé').length;
    const lowBalance = balanceData.filter((b) => b.remaining <= 3 && b.remaining > 0).length;
    const noBalance = balanceData.filter((b) => b.remaining <= 0).length;

    const summaryRows = [
      ['RAPPORT SOLDE DE CONGÉS'],
      [],
      ['Année', currentYear.toString()],
      ['Date de génération', new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
      [],
      ['STATISTIQUES GLOBALES'],
      ['Total Employés', totalEmployees],
      ['Quota Total', `${totalQuota} jours`],
      ['Jours Pris', `${totalTaken} jours`],
      ['Jours En Attente', `${totalPending} jours`],
      ['Jours Restants', `${totalRemaining} jours`],
      ['Quotas Personnalisés', withCustomQuota],
      ['Soldes Faibles (≤3j)', lowBalance],
      ['Soldes Épuisés (≤0j)', noBalance],
      [],
      ['Quota par Défaut', `${defaultQuota} jours`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // ============ FEUILLE SOLDES ============
    const balanceHeaders = [
      'Matricule', 'Nom', 'Prénom', 'Site', 'Département', 'Équipe',
      'Quota', 'Source Quota', 'Jours Pris', 'En Attente', 'Restant', 'Statut'
    ];
    const balanceRows = balanceData.map((b) => [
      b.matricule,
      b.lastName,
      b.firstName,
      b.site,
      b.department,
      b.team,
      b.quota,
      b.quotaSource,
      b.taken,
      b.pending,
      b.remaining,
      b.status,
    ]);

    const balanceSheet = XLSX.utils.aoa_to_sheet([balanceHeaders, ...balanceRows]);
    balanceSheet['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
      { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(workbook, balanceSheet, `Soldes (${totalEmployees})`);

    // ============ FEUILLE ALERTES ============
    const alertEmployees = balanceData.filter((b) => b.remaining <= 3);
    if (alertEmployees.length > 0) {
      const alertHeaders = ['Matricule', 'Nom Complet', 'Site', 'Département', 'Quota', 'Pris', 'Restant', 'Statut'];
      const alertRows = alertEmployees.map((b) => [
        b.matricule,
        `${b.lastName} ${b.firstName}`,
        b.site,
        b.department,
        b.quota,
        b.taken,
        b.remaining,
        b.status,
      ]);

      const alertSheet = XLSX.utils.aoa_to_sheet([alertHeaders, ...alertRows]);
      alertSheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
        { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(workbook, alertSheet, `Alertes (${alertEmployees.length})`);
    }

    // ============ FEUILLE DÉTAIL CONGÉS ============
    const detailRows: any[] = [];
    balanceData.forEach((b) => {
      b.approvedDetails.forEach((leave) => {
        detailRows.push([
          b.matricule,
          `${b.lastName} ${b.firstName}`,
          b.department,
          leave.type,
          leave.start,
          leave.end,
          leave.days,
        ]);
      });
    });

    if (detailRows.length > 0) {
      const detailHeaders = ['Matricule', 'Employé', 'Département', 'Type Congé', 'Date Début', 'Date Fin', 'Jours'];
      const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
      detailSheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 20 },
        { wch: 12 }, { wch: 12 }, { wch: 8 }
      ];
      XLSX.utils.book_append_sheet(workbook, detailSheet, `Détail Congés (${detailRows.length})`);
    }

    // Send file
    const fileName = `solde_conges_${currentYear}`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  }
}

