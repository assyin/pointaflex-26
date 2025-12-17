import { PrismaService } from '../../database/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { WebhookAttendanceDto } from './dto/webhook-attendance.dto';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto';
import { AttendanceType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
export declare class AttendanceService {
    private prisma;
    constructor(prisma: PrismaService);
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
            latitude: Decimal | null;
            longitude: Decimal | null;
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
        latitude: Decimal | null;
        longitude: Decimal | null;
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
        hoursWorked: Decimal | null;
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
    handleWebhook(tenantId: string, deviceId: string, webhookData: WebhookAttendanceDto): Promise<{
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
        latitude: Decimal | null;
        longitude: Decimal | null;
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
        hoursWorked: Decimal | null;
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
    findAll(tenantId: string, filters?: {
        employeeId?: string;
        siteId?: string;
        startDate?: string;
        endDate?: string;
        hasAnomaly?: boolean;
        type?: AttendanceType;
    }, userId?: string, userPermissions?: string[]): Promise<({
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
            latitude: Decimal | null;
            longitude: Decimal | null;
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
        latitude: Decimal | null;
        longitude: Decimal | null;
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
        hoursWorked: Decimal | null;
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
            latitude: Decimal | null;
            longitude: Decimal | null;
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
        latitude: Decimal | null;
        longitude: Decimal | null;
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
        hoursWorked: Decimal | null;
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
    correctAttendance(tenantId: string, id: string, correctionDto: CorrectAttendanceDto): Promise<{
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
        latitude: Decimal | null;
        longitude: Decimal | null;
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
        hoursWorked: Decimal | null;
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
    private requiresApproval;
    private notifyManagersOfAnomaly;
    private notifyEmployeeOfCorrection;
    private notifyManagersOfApprovalRequired;
    getAnomalies(tenantId: string, date?: string, userId?: string, userPermissions?: string[]): Promise<({
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
            latitude: Decimal | null;
            longitude: Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: Decimal | null;
        longitude: Decimal | null;
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
        hoursWorked: Decimal | null;
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
    private validateBreakPunch;
    private calculateMetrics;
    private parseTimeString;
    private detectAnomalies;
    approveCorrection(tenantId: string, id: string, approvedBy: string, approved: boolean, comment?: string): Promise<{
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
        latitude: Decimal | null;
        longitude: Decimal | null;
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
        hoursWorked: Decimal | null;
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
    getPresenceRate(tenantId: string, employeeId: string, startDate: Date, endDate: Date): Promise<{
        presenceRate: number;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        leaveDays: number;
    }>;
    getPunctualityRate(tenantId: string, employeeId: string, startDate: Date, endDate: Date): Promise<{
        punctualityRate: number;
        totalEntries: number;
        onTimeEntries: number;
        lateEntries: number;
        averageLateMinutes: number;
    }>;
    getTrends(tenantId: string, employeeId: string, startDate: Date, endDate: Date): Promise<{
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
    detectRecurringAnomalies(tenantId: string, employeeId: string, days?: number): Promise<Array<{
        type: string;
        count: number;
        lastOccurrence: Date;
        frequency: string;
    }>>;
    getCorrectionHistory(tenantId: string, attendanceId: string): Promise<Array<{
        id: string;
        action: string;
        correctedBy: string;
        correctedAt: Date;
        correctionNote: string;
        approvalStatus?: string;
        approvedBy?: string;
        approvedAt?: Date;
    }>>;
    bulkCorrectAttendance(tenantId: string, bulkDto: {
        attendances: Array<{
            attendanceId: string;
            correctedTimestamp?: string;
            correctionNote?: string;
        }>;
        generalNote: string;
        correctedBy: string;
        forceApproval?: boolean;
    }): Promise<{
        total: number;
        success: number;
        failed: number;
        results: any[];
        errors: any[];
    }>;
    exportAnomalies(tenantId: string, filters: {
        startDate?: string;
        endDate?: string;
        employeeId?: string;
        anomalyType?: string;
    }, format: 'csv' | 'excel'): Promise<string | {
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
    getAnomaliesDashboard(tenantId: string, startDate: Date, endDate: Date, userId?: string, userPermissions?: string[]): Promise<{
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
    private getEmptyDashboard;
    getAnomalyPriority(anomalyType: string | null): number;
}
