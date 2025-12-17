import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ExportService } from './services/export.service';
import { DashboardStatsQueryDto } from './dto/dashboard-stats.dto';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { OvertimeReportDto } from './dto/overtime-report.dto';
import { AbsencesReportDto } from './dto/absences-report.dto';
import { PayrollReportDto } from './dto/payroll-report.dto';
import { PlanningReportDto } from './dto/planning-report.dto';
import { ExportReportDto } from './dto/export-report.dto';
export declare class ReportsController {
    private reportsService;
    private exportService;
    constructor(reportsService: ReportsService, exportService: ExportService);
    getDashboardStats(user: any, query: DashboardStatsQueryDto): Promise<{
        scope: string;
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        personal: {
            workedDays: number;
            totalHours: number;
            lateCount: number;
            overtimeHours: number | import("@prisma/client/runtime/library").Decimal;
            leaveDays: number | import("@prisma/client/runtime/library").Decimal;
        };
        weeklyAttendance: any[];
    } | {
        scope: string;
        team: {
            id: string;
            name: string;
        };
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
        weeklyAttendance: any[];
    } | {
        scope: string;
        department: {
            id: string;
            name: string;
            code: string;
        };
        sites: {
            id: string;
            name: string;
            code: string;
            employeeCount: number;
        }[];
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
        weeklyAttendance: any[];
    } | {
        scope: string;
        site: {
            id: string;
            name: string;
            code: string;
            city: string;
        };
        departments: {
            id: string;
            name: string;
            code: string;
            employeeCount: number;
        }[];
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
        weeklyAttendance: any[];
    } | {
        scope: string;
        attendanceRate: number;
        lates: number;
        totalPointages: number;
        overtimeHours: number | import("@prisma/client/runtime/library").Decimal;
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        weeklyAttendance: any[];
        shiftDistribution: {
            name: string;
            value: number;
        }[];
        overtimeTrend: any[];
        anomalies: number;
    } | {
        scope: string;
        tenants: {
            total: number;
            active: number;
        };
        employees: {
            total: number;
            activeToday: number;
            onLeave: number;
        };
        pendingApprovals: {
            leaves: number;
            overtime: number;
        };
        attendance: {
            total: number;
            anomalies: number;
            anomalyRate: string | number;
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
            current: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendanceRate: number;
    }>;
    getAttendanceReport(user: any, dto: AttendanceReportDto): Promise<{
        data: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                department: {
                    name: string;
                };
                team: {
                    name: string;
                };
            };
            site: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            siteId: string | null;
            deviceId: string | null;
            timestamp: Date;
            type: import(".prisma/client").$Enums.AttendanceType;
            method: import(".prisma/client").$Enums.DeviceType;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            hasAnomaly: boolean;
            anomalyType: string | null;
            anomalyNote: string | null;
            isCorrected: boolean;
            correctedBy: string | null;
            correctedAt: Date | null;
            correctionNote: string | null;
            hoursWorked: import("@prisma/client/runtime/library").Decimal | null;
            lateMinutes: number | null;
            earlyLeaveMinutes: number | null;
            overtimeMinutes: number | null;
            needsApproval: boolean;
            approvalStatus: string | null;
            approvedBy: string | null;
            approvedAt: Date | null;
            rawData: import("@prisma/client/runtime/library").JsonValue | null;
            generatedBy: string | null;
            isGenerated: boolean;
        })[];
        summary: {
            total: number;
            anomalies: number;
            totalWorkedHours: number;
            uniqueEmployees: number;
            totalDays: number;
            byDay: {
                date: string;
                total: number;
                anomalies: number;
                employees: number;
            }[];
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    getEmployeeReport(user: any, id: string, startDate: string, endDate: string): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
            department: string;
            team: string;
            site: string;
            currentShift: string;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendance: {
            total: number;
            byType: {
                type: import(".prisma/client").$Enums.AttendanceType;
                count: number;
            }[];
        };
        overtime: {
            totalRecords: number;
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalRequests: number;
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
        };
        schedules: {
            total: number;
        };
    }>;
    getTeamReport(user: any, id: string, startDate: string, endDate: string): Promise<{
        team: {
            id: string;
            name: string;
            code: string;
            totalEmployees: number;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        attendance: {
            total: number;
        };
        overtime: {
            totalHours: number | import("@prisma/client/runtime/library").Decimal;
        };
        leaves: {
            totalDays: number | import("@prisma/client/runtime/library").Decimal;
        };
        employees: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
        }[];
    }>;
    getOvertimeReport(user: any, dto: OvertimeReportDto): Promise<{
        data: ({
            employee: {
                id: string;
                site: {
                    name: string;
                };
                firstName: string;
                lastName: string;
                matricule: string;
                department: {
                    name: string;
                };
                team: {
                    name: string;
                };
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            type: import(".prisma/client").$Enums.OvertimeType;
            approvedBy: string | null;
            approvedAt: Date | null;
            date: Date;
            hours: import("@prisma/client/runtime/library").Decimal;
            approvedHours: import("@prisma/client/runtime/library").Decimal | null;
            isNightShift: boolean;
            rate: import("@prisma/client/runtime/library").Decimal;
            convertedToRecovery: boolean;
            recoveryId: string | null;
            status: import(".prisma/client").$Enums.OvertimeStatus;
            rejectionReason: string | null;
            notes: string | null;
        })[];
        summary: {
            total: number;
            totalHours: number;
            totalApprovedHours: number;
            byStatus: Record<string, number>;
            byType: Record<string, number>;
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    getAbsencesReport(user: any, dto: AbsencesReportDto): Promise<{
        data: {
            anomalies: {
                type: string;
                employee: {
                    id: string;
                    site: {
                        name: string;
                    };
                    firstName: string;
                    lastName: string;
                    matricule: string;
                    department: {
                        name: string;
                    };
                };
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                employeeId: string;
                siteId: string | null;
                deviceId: string | null;
                timestamp: Date;
                method: import(".prisma/client").$Enums.DeviceType;
                latitude: import("@prisma/client/runtime/library").Decimal | null;
                longitude: import("@prisma/client/runtime/library").Decimal | null;
                hasAnomaly: boolean;
                anomalyType: string | null;
                anomalyNote: string | null;
                isCorrected: boolean;
                correctedBy: string | null;
                correctedAt: Date | null;
                correctionNote: string | null;
                hoursWorked: import("@prisma/client/runtime/library").Decimal | null;
                lateMinutes: number | null;
                earlyLeaveMinutes: number | null;
                overtimeMinutes: number | null;
                needsApproval: boolean;
                approvalStatus: string | null;
                approvedBy: string | null;
                approvedAt: Date | null;
                rawData: import("@prisma/client/runtime/library").JsonValue | null;
                generatedBy: string | null;
                isGenerated: boolean;
            }[];
            absences: any[];
        };
        summary: {
            totalAnomalies: number;
            totalAbsences: number;
            lateCount: number;
            earlyLeaveCount: number;
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    getPayrollReport(user: any, dto: PayrollReportDto): Promise<{
        data: {
            employee: {
                id: string;
                matricule: string;
                firstName: string;
                lastName: string;
                fullName: string;
                department: string;
                site: string;
                position: string;
            };
            period: {
                startDate: string;
                endDate: string;
            };
            workedDays: number;
            normalHours: number;
            overtimeHours: number;
            leaveDays: number | import("@prisma/client/runtime/library").Decimal;
            lateHours: number;
            absenceDays: number;
            totalHours: number;
        }[];
        summary: {
            totalEmployees: number;
            totalWorkedDays: number;
            totalNormalHours: number;
            totalOvertimeHours: number;
            totalLeaveDays: number;
            period: {
                startDate: string;
                endDate: string;
            };
        };
    }>;
    exportReport(user: any, type: string, dto: ExportReportDto, res: Response): Promise<void>;
    getPlanningReport(user: any, dto: PlanningReportDto): Promise<{
        data: {
            id: any;
            date: any;
            employee: {
                id: any;
                name: string;
                employeeNumber: any;
                department: any;
                position: any;
                site: any;
                team: any;
            };
            shift: {
                id: any;
                name: any;
                startTime: any;
                endTime: any;
                color: any;
            };
            customStartTime: any;
            customEndTime: any;
            notes: any;
        }[];
        summary: {
            totalSchedules: number;
            uniqueEmployees: number;
            uniqueShifts: number;
            period: {
                startDate: any;
                endDate: any;
            };
        };
    }>;
    getReportHistory(user: any): Promise<{
        id: string;
        name: string;
        reportType: string;
        format: string;
        createdAt: Date;
        fileSize: number;
        filters: import("@prisma/client/runtime/library").JsonValue;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    }[]>;
    downloadReportFromHistory(user: any, id: string, res: Response): Promise<void>;
}
