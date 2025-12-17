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
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
const XLSX = require("xlsx");
const pdfkit_1 = require("pdfkit");
const export_report_dto_1 = require("../dto/export-report.dto");
const reports_service_1 = require("../reports.service");
let ExportService = class ExportService {
    constructor(prisma, reportsService) {
        this.prisma = prisma;
        this.reportsService = reportsService;
    }
    async exportReport(tenantId, userId, reportType, dto, res) {
        let reportData;
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
        const fileName = `rapport_${reportType}_${dto.startDate}_${dto.endDate}`;
        const columnsToInclude = dto.columns ? dto.columns.split(',') : null;
        const template = dto.template || 'standard';
        const includeSummary = dto.includeSummary !== false;
        const includeCharts = dto.includeCharts === true && dto.format === export_report_dto_1.ExportFormat.PDF;
        switch (dto.format) {
            case export_report_dto_1.ExportFormat.PDF:
                await this.exportToPDF(reportType, reportData, fileName, res, {
                    columns: columnsToInclude,
                    template,
                    includeSummary,
                    includeCharts,
                });
                break;
            case export_report_dto_1.ExportFormat.EXCEL:
                await this.exportToExcel(reportType, reportData, fileName, res, {
                    columns: columnsToInclude,
                    template,
                    includeSummary,
                });
                break;
            case export_report_dto_1.ExportFormat.CSV:
                await this.exportToCSV(reportType, reportData, fileName, res, {
                    columns: columnsToInclude,
                });
                break;
        }
        await this.saveReportHistory(tenantId, userId, reportType, dto.format, fileName, dto);
    }
    async exportToPDF(reportType, data, fileName, res, options) {
        const doc = new pdfkit_1.default({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
        doc.pipe(res);
        doc.fontSize(20).text(`Rapport ${reportType}`, { align: 'center' });
        doc.moveDown();
        if (data.summary?.period) {
            doc.fontSize(12).text(`Période: ${data.summary.period.startDate} - ${data.summary.period.endDate}`, { align: 'center' });
            doc.moveDown();
        }
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
        if (data.data && data.data.length > 0) {
            doc.fontSize(14).text('Données', { underline: true });
            doc.moveDown(0.5);
            const limitedData = data.data.slice(0, 20);
            limitedData.forEach((item, index) => {
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
    async exportToExcel(reportType, data, fileName, res, options) {
        const workbook = XLSX.utils.book_new();
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
        if (data.data && data.data.length > 0) {
            const flatData = data.data.map((item) => {
                const flat = {};
                const flatten = (obj, prefix = '') => {
                    Object.keys(obj).forEach(key => {
                        const value = obj[key];
                        const newKey = prefix ? `${prefix}_${key}` : key;
                        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                            flatten(value, newKey);
                        }
                        else {
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
    async exportToCSV(reportType, data, fileName, res, options) {
        if (!data.data || data.data.length === 0) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
            res.send('Aucune donnée disponible\n');
            return;
        }
        const flatData = data.data.map((item) => {
            const flat = {};
            const flatten = (obj, prefix = '') => {
                Object.keys(obj).forEach(key => {
                    const value = obj[key];
                    const newKey = prefix ? `${prefix}_${key}` : key;
                    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                        flatten(value, newKey);
                    }
                    else {
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
        res.send('\ufeff' + csv);
    }
    async downloadReportFromHistory(tenantId, userId, reportId, res) {
        const report = await this.prisma.reportHistory.findFirst({
            where: {
                id: reportId,
                tenantId,
            },
        });
        if (!report) {
            throw new Error('Report not found');
        }
        throw new Error('Report file download not implemented. Please regenerate the report.');
    }
    async saveReportHistory(tenantId, userId, reportType, format, fileName, filters) {
        await this.prisma.reportHistory.create({
            data: {
                tenantId,
                userId,
                reportType,
                format,
                fileName: `${fileName}.${format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase()}`,
                filters: filters,
            },
        });
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        reports_service_1.ReportsService])
], ExportService);
//# sourceMappingURL=export.service.js.map