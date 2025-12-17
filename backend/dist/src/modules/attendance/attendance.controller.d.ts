import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { WebhookAttendanceDto } from './dto/webhook-attendance.dto';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto';
import { AttendanceStatsQueryDto } from './dto/attendance-stats.dto';
import { BulkCorrectAttendanceDto } from './dto/bulk-correct.dto';
import { AttendanceType } from '@prisma/client';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    create(tenantId: string, createAttendanceDto: CreateAttendanceDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            userId: string;
            matricule: string;
            photo: string;
            department: {
                id: string;
                managerId: string;
            };
            site: {
                id: string;
                siteManagers: {
                    managerId: string;
                }[];
            };
        };
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            departmentId: string | null;
            managerId: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isActive: boolean;
            name: string;
            siteId: string | null;
            ipAddress: string | null;
            deviceId: string;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            apiKey: string | null;
            lastSync: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    }>;
    handleWebhook(deviceId: string, tenantId: string, apiKey: string, webhookData: WebhookAttendanceDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            userId: string;
            matricule: string;
            department: {
                id: string;
                managerId: string;
            };
            site: {
                id: string;
                siteManagers: {
                    managerId: string;
                }[];
            };
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    }>;
    handlePushFromTerminal(body: any, headers: any): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            userId: string;
            matricule: string;
            department: {
                id: string;
                managerId: string;
            };
            site: {
                id: string;
                siteManagers: {
                    managerId: string;
                }[];
            };
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    }>;
    private mapAttendanceType;
    private mapVerifyMode;
    findAll(user: any, tenantId: string, employeeId?: string, siteId?: string, startDate?: string, endDate?: string, hasAnomaly?: string, type?: AttendanceType): Promise<({
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            photo: string;
            currentShift: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                code: string;
                startTime: string;
                endTime: string;
                breakDuration: number;
                isNightShift: boolean;
                color: string | null;
            };
        };
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            departmentId: string | null;
            managerId: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isActive: boolean;
            name: string;
            siteId: string | null;
            ipAddress: string | null;
            deviceId: string;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            apiKey: string | null;
            lastSync: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    })[]>;
    getAnomalies(user: any, tenantId: string, date?: string): Promise<({
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            photo: string;
            department: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            };
        };
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            departmentId: string | null;
            managerId: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    })[]>;
    getDailyReport(tenantId: string, date: string): Promise<{
        date: string;
        totalRecords: number;
        uniqueEmployees: number;
        lateEntries: number;
        anomalies: number;
    }>;
    findOne(tenantId: string, id: string): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            photo: string;
            position: string;
            department: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                code: string | null;
                description: string | null;
                managerId: string | null;
            };
            team: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                code: string;
                description: string | null;
                managerId: string | null;
                rotationEnabled: boolean;
                rotationCycleDays: number | null;
            };
        };
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            departmentId: string | null;
            managerId: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isActive: boolean;
            name: string;
            siteId: string | null;
            ipAddress: string | null;
            deviceId: string;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            apiKey: string | null;
            lastSync: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    }>;
    correctAttendance(user: any, tenantId: string, id: string, correctionDto: CorrectAttendanceDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            userId: string;
            matricule: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    }>;
    approveCorrection(user: any, tenantId: string, id: string, body: {
        approved: boolean;
        comment?: string;
    }): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            userId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        type: import(".prisma/client").$Enums.AttendanceType;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        method: import(".prisma/client").$Enums.DeviceType;
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
    }>;
    getPresenceRate(tenantId: string, query: AttendanceStatsQueryDto): Promise<{
        presenceRate: number;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        leaveDays: number;
    }>;
    getPunctualityRate(tenantId: string, query: AttendanceStatsQueryDto): Promise<{
        punctualityRate: number;
        totalEntries: number;
        onTimeEntries: number;
        lateEntries: number;
        averageLateMinutes: number;
    }>;
    getTrends(tenantId: string, query: AttendanceStatsQueryDto): Promise<{
        dailyTrends: Array<{
            date: string;
            lateCount: number;
            absentCount: number;
            earlyLeaveCount: number;
            anomaliesCount: number;
        }>;
        weeklyTrends: Array<{
            week: string;
            lateCount: number;
            absentCount: number;
            earlyLeaveCount: number;
            anomaliesCount: number;
        }>;
    }>;
    getRecurringAnomalies(tenantId: string, employeeId: string, days?: string): Promise<{
        type: string;
        count: number;
        lastOccurrence: Date;
        frequency: string;
    }[]>;
    getCorrectionHistory(tenantId: string, id: string): Promise<{
        id: string;
        action: string;
        correctedBy: string;
        correctedAt: Date;
        correctionNote: string;
        approvalStatus?: string;
        approvedBy?: string;
        approvedAt?: Date;
    }[]>;
    bulkCorrectAttendance(user: any, tenantId: string, bulkDto: BulkCorrectAttendanceDto): Promise<{
        total: number;
        success: number;
        failed: number;
        results: any[];
        errors: any[];
    }>;
    exportAnomalies(tenantId: string, format: 'csv' | 'excel', startDate?: string, endDate?: string, employeeId?: string, anomalyType?: string): Promise<string | {
        date: string;
        time: string;
        employee: string;
        matricule: string;
        department: string;
        site: string;
        anomalyType: string;
        note: string;
        status: string;
        correctedBy: string;
        correctedAt: string;
    }[]>;
    getAnomaliesDashboard(user: any, tenantId: string, startDate: string, endDate: string): Promise<{
        summary: {
            total: number;
            corrected: number;
            pending: number;
            correctionRate: number;
        };
        byType: any[];
        byEmployee: any[];
        byDay: any[];
    }>;
}
