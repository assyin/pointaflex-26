export declare enum ExportFormat {
    PDF = "PDF",
    EXCEL = "EXCEL",
    CSV = "CSV"
}
export declare class ExportReportDto {
    format: ExportFormat;
    startDate: string;
    endDate: string;
    employeeId?: string;
    departmentId?: string;
    siteId?: string;
    teamId?: string;
    columns?: string;
    template?: string;
    includeSummary?: boolean;
    includeCharts?: boolean;
}
