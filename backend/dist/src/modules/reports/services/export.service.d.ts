import { PrismaService } from '../../../database/prisma.service';
import { Response } from 'express';
import { ExportReportDto } from '../dto/export-report.dto';
import { ReportsService } from '../reports.service';
export declare class ExportService {
    private prisma;
    private reportsService;
    constructor(prisma: PrismaService, reportsService: ReportsService);
    exportReport(tenantId: string, userId: string, reportType: string, dto: ExportReportDto, res: Response): Promise<void>;
    private exportToPDF;
    private exportToExcel;
    private exportToCSV;
    downloadReportFromHistory(tenantId: string, userId: string, reportId: string, res: any): Promise<void>;
    private saveReportHistory;
}
