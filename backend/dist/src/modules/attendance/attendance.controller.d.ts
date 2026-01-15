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
    create(tenantId: string, createAttendanceDto: CreateAttendanceDto): Promise<({
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
            phone: string | null;
            address: string | null;
            timezone: string | null;
            city: string | null;
            tenantId: string;
            code: string | null;
            name: string;
            departmentId: string | null;
            managerId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            isActive: boolean;
            siteId: string | null;
            deviceId: string;
            ipAddress: string | null;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            apiKey: string | null;
            apiKeyHash: string | null;
            apiKeyLastRotation: Date | null;
            apiKeyExpiresAt: Date | null;
            allowedIPs: string[];
            enforceIPWhitelist: boolean;
            lastSync: Date | null;
            lastHeartbeat: Date | null;
            heartbeatInterval: number;
            totalSyncs: number;
            failedSyncs: number;
            avgResponseTime: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
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
    }) | {
        _debounced: boolean;
        _debounceInfo: {
            reason: string;
            message: string;
            previousPunchId: string;
            previousPunchTime: Date;
            configuredTolerance: number;
        };
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            photo: string;
        };
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            address: string | null;
            timezone: string | null;
            city: string | null;
            tenantId: string;
            code: string | null;
            name: string;
            departmentId: string | null;
            managerId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            isActive: boolean;
            siteId: string | null;
            deviceId: string;
            ipAddress: string | null;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            apiKey: string | null;
            apiKeyHash: string | null;
            apiKeyLastRotation: Date | null;
            apiKeyExpiresAt: Date | null;
            allowedIPs: string[];
            enforceIPWhitelist: boolean;
            lastSync: Date | null;
            lastHeartbeat: Date | null;
            heartbeatInterval: number;
            totalSyncs: number;
            failedSyncs: number;
            avgResponseTime: number | null;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
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
    handleWebhook(deviceId: string, tenantId: string, apiKey: string, webhookData: WebhookAttendanceDto): Promise<({
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
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
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
    }) | {
        status: string;
        reason: string;
        message: string;
        existingAttendanceId: string;
        attendanceId?: undefined;
        lastPunchTime?: undefined;
        lastPunchType?: undefined;
        configuredTolerance?: undefined;
    } | {
        status: string;
        reason: string;
        message: string;
        attendanceId: string;
        lastPunchTime: Date;
        lastPunchType: import(".prisma/client").$Enums.AttendanceType;
        configuredTolerance: number;
        existingAttendanceId?: undefined;
    }>;
    handleWebhookFast(deviceId: string, tenantId: string, apiKey: string, webhookData: WebhookAttendanceDto): Promise<{
        status: string;
        reason: string;
        message: string;
        existingAttendanceId: string;
        attendanceId?: undefined;
        lastPunchTime?: undefined;
        lastPunchType?: undefined;
        configuredTolerance?: undefined;
        success?: undefined;
        employee?: undefined;
        timestamp?: undefined;
        type?: undefined;
    } | {
        status: string;
        reason: string;
        message: string;
        attendanceId: string;
        lastPunchTime: Date;
        lastPunchType: import(".prisma/client").$Enums.AttendanceType;
        configuredTolerance: number;
        existingAttendanceId?: undefined;
        success?: undefined;
        employee?: undefined;
        timestamp?: undefined;
        type?: undefined;
    } | {
        success: boolean;
        attendanceId: string;
        employee: {
            id: any;
            matricule: any;
            name: string;
        };
        timestamp: string;
        type: import(".prisma/client").$Enums.AttendanceType;
        status?: undefined;
        reason?: undefined;
        message?: undefined;
        existingAttendanceId?: undefined;
        lastPunchTime?: undefined;
        lastPunchType?: undefined;
        configuredTolerance?: undefined;
    }>;
    getPunchCount(deviceId: string, tenantId: string, apiKey: string, employeeId: string, date: string, punchTime?: string): Promise<{
        count: number;
        forceType: any;
        reason?: undefined;
        openSessionFrom?: undefined;
        nightShiftConfig?: undefined;
    } | {
        count: number;
        forceType: string;
        reason: string;
        openSessionFrom: Date;
        nightShiftConfig: {
            nightShiftEnd: string;
            isNightShiftEmployee: boolean;
            inHour: number;
        };
    }>;
    handlePushFromTerminal(body: any, headers: any): Promise<({
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
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
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
    }) | {
        status: string;
        reason: string;
        message: string;
        existingAttendanceId: string;
        attendanceId?: undefined;
        lastPunchTime?: undefined;
        lastPunchType?: undefined;
        configuredTolerance?: undefined;
    } | {
        status: string;
        reason: string;
        message: string;
        attendanceId: string;
        lastPunchTime: Date;
        lastPunchType: import(".prisma/client").$Enums.AttendanceType;
        configuredTolerance: number;
        existingAttendanceId?: undefined;
    }>;
    private mapAttendanceType;
    private mapVerifyMode;
    findAll(user: any, tenantId: string, employeeId?: string, siteId?: string, startDate?: string, endDate?: string, hasAnomaly?: string, type?: AttendanceType): Promise<{
        hoursWorked: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
            photo: string;
            currentShift: {
                id: string;
                code: string;
                name: string;
                startTime: string;
                endTime: string;
            };
        };
        siteId: string;
        site: {
            id: string;
            code: string;
            name: string;
        };
        latitude: import("@prisma/client/runtime/library").Decimal;
        longitude: import("@prisma/client/runtime/library").Decimal;
        employeeId: string;
        deviceId: string;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
        method: import(".prisma/client").$Enums.DeviceType;
        hasAnomaly: boolean;
        anomalyType: string;
        anomalyNote: string;
        isCorrected: boolean;
        correctedBy: string;
        correctedAt: Date;
        correctionNote: string;
        lateMinutes: number;
        earlyLeaveMinutes: number;
        overtimeMinutes: number;
        needsApproval: boolean;
        approvalStatus: string;
        approvedBy: string;
        approvedAt: Date;
        rawData: import("@prisma/client/runtime/library").JsonValue;
        generatedBy: string;
        isGenerated: boolean;
        device: {
            id: string;
            name: string;
            deviceId: string;
            deviceType: import(".prisma/client").$Enums.DeviceType;
        };
    }[] | {
        data: {
            hoursWorked: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                photo: string;
                currentShift: {
                    id: string;
                    code: string;
                    name: string;
                    startTime: string;
                    endTime: string;
                };
            };
            siteId: string;
            site: {
                id: string;
                code: string;
                name: string;
            };
            latitude: import("@prisma/client/runtime/library").Decimal;
            longitude: import("@prisma/client/runtime/library").Decimal;
            employeeId: string;
            deviceId: string;
            timestamp: Date;
            type: import(".prisma/client").$Enums.AttendanceType;
            method: import(".prisma/client").$Enums.DeviceType;
            hasAnomaly: boolean;
            anomalyType: string;
            anomalyNote: string;
            isCorrected: boolean;
            correctedBy: string;
            correctedAt: Date;
            correctionNote: string;
            lateMinutes: number;
            earlyLeaveMinutes: number;
            overtimeMinutes: number;
            needsApproval: boolean;
            approvalStatus: string;
            approvedBy: string;
            approvedAt: Date;
            rawData: import("@prisma/client/runtime/library").JsonValue;
            generatedBy: string;
            isGenerated: boolean;
            device: {
                id: string;
                name: string;
                deviceId: string;
                deviceType: import(".prisma/client").$Enums.DeviceType;
            };
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getAnomalies(user: any, tenantId: string, startDate?: string, endDate?: string, employeeId?: string, departmentId?: string, siteId?: string, anomalyType?: string, isCorrected?: string, page?: string, limit?: string, date?: string): Promise<{
        data: ({
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
                phone: string | null;
                address: string | null;
                timezone: string | null;
                city: string | null;
                tenantId: string;
                code: string | null;
                name: string;
                departmentId: string | null;
                managerId: string | null;
                latitude: import("@prisma/client/runtime/library").Decimal | null;
                longitude: import("@prisma/client/runtime/library").Decimal | null;
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
            employeeId: string;
            deviceId: string | null;
            timestamp: Date;
            type: import(".prisma/client").$Enums.AttendanceType;
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
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
                code: string | null;
                name: string;
                description: string | null;
                managerId: string | null;
            };
            team: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                code: string;
                name: string;
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
            phone: string | null;
            address: string | null;
            timezone: string | null;
            city: string | null;
            tenantId: string;
            code: string | null;
            name: string;
            departmentId: string | null;
            managerId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        device: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            isActive: boolean;
            siteId: string | null;
            deviceId: string;
            ipAddress: string | null;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            apiKey: string | null;
            apiKeyHash: string | null;
            apiKeyLastRotation: Date | null;
            apiKeyExpiresAt: Date | null;
            allowedIPs: string[];
            enforceIPWhitelist: boolean;
            lastSync: Date | null;
            lastHeartbeat: Date | null;
            heartbeatInterval: number;
            totalSyncs: number;
            failedSyncs: number;
            avgResponseTime: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        latitude: import("@prisma/client/runtime/library").Decimal | null;
        longitude: import("@prisma/client/runtime/library").Decimal | null;
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
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
    delete(user: any, tenantId: string, id: string): Promise<{
        success: boolean;
        message: string;
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
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
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
        employeeId: string;
        deviceId: string | null;
        timestamp: Date;
        type: import(".prisma/client").$Enums.AttendanceType;
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
        recoveryDays: number;
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
    getCorrectionHistory(tenantId: string, id: string): Promise<any[]>;
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
    getAnomaliesAnalytics(tenantId: string, startDate: string, endDate: string, employeeId?: string, departmentId?: string, siteId?: string, anomalyType?: string): Promise<{
        summary: {
            total: number;
            corrected: number;
            pending: number;
            avgResolutionTimeHours: number;
        };
        byType: {
            type: string;
            count: number;
        }[];
        byEmployee: {
            employeeId: string;
            employeeName: string;
            matricule: string;
            count: number;
        }[];
        byDepartment: {
            siteId: string;
            count: number;
        }[];
        trends: {
            date: Date;
            count: number;
        }[];
        dayOfWeekPatterns: {
            dayOfWeek: number;
            dayName: string;
            count: number;
        }[];
    }>;
    getMonthlyAnomaliesReport(tenantId: string, year: string, month: string): Promise<{
        period: {
            year: number;
            month: number;
        };
        summary: {
            total: number;
            corrected: number;
            pending: number;
        };
        byDepartment: any[];
    }>;
    getHighAnomalyRateEmployees(tenantId: string, threshold?: string, days?: string): Promise<{
        employeeId: string;
        employeeName: string;
        matricule: string;
        department: string;
        anomalyCount: number;
        recommendation: string;
    }[]>;
}
