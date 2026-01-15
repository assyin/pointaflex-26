import { PrismaService } from '../../database/prisma.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { OvertimeStatus } from '@prisma/client';
export declare class OvertimeService {
    private prisma;
    constructor(prisma: PrismaService);
    private roundOvertimeHours;
    getOvertimeRate(settings: any, overtimeType: string): number;
    checkOvertimeLimits(tenantId: string, employeeId: string, newHours: number, date: Date): Promise<{
        exceedsLimit: boolean;
        message?: string;
        adjustedHours?: number;
        monthlyUsed?: number;
        monthlyLimit?: number;
        weeklyUsed?: number;
        weeklyLimit?: number;
    }>;
    create(tenantId: string, dto: CreateOvertimeDto): Promise<{
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isNightShift: boolean;
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string | null;
        approvedAt: Date | null;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string | null;
        convertedHoursToRecovery: import("@prisma/client/runtime/library").Decimal;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        employeeId?: string;
        status?: OvertimeStatus;
        startDate?: string;
        endDate?: string;
        isNightShift?: boolean;
        type?: string;
        siteId?: string;
        departmentId?: string;
    }, userId?: string, userPermissions?: string[]): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            totalHours?: undefined;
        };
    } | {
        data: {
            hours: any;
            approvedHours: any;
            rate: any;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                site: {
                    id: string;
                    code: string;
                    name: string;
                };
            };
            isNightShift: boolean;
            date: Date;
            notes: string;
            status: import(".prisma/client").$Enums.OvertimeStatus;
            type: import(".prisma/client").$Enums.OvertimeType;
            approvedBy: string;
            approvedAt: Date;
            convertedToRecovery: boolean;
            recoveryId: string;
            rejectionReason: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            totalHours: any;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
            position: string;
        };
        isNightShift: boolean;
        date: Date;
        notes: string;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string;
        approvedAt: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string;
        rejectionReason: string;
    }>;
    update(tenantId: string, id: string, dto: UpdateOvertimeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        isNightShift: boolean;
        date: Date;
        notes: string;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string;
        approvedAt: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string;
        rejectionReason: string;
    }>;
    approve(tenantId: string, id: string, userId: string, dto: ApproveOvertimeDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
        isNightShift: boolean;
        date: Date;
        notes: string;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string;
        approvedAt: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string;
        rejectionReason: string;
    }>;
    convertToRecovery(tenantId: string, id: string, conversionRate?: number, expiryDays?: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        hours: import("@prisma/client/runtime/library").Decimal;
        source: string | null;
        usedHours: import("@prisma/client/runtime/library").Decimal;
        remainingHours: import("@prisma/client/runtime/library").Decimal;
        expiryDate: Date | null;
    }>;
    getBalance(tenantId: string, employeeId: string): Promise<{
        employeeId: string;
        totalRequested: number;
        totalApproved: number;
        totalPending: number;
        totalRejected: number;
        totalPaid: number;
        totalRecovered: number;
        availableForConversion: number;
    }>;
    remove(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isNightShift: boolean;
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string | null;
        approvedAt: Date | null;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string | null;
        convertedHoursToRecovery: import("@prisma/client/runtime/library").Decimal;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
    }>;
    getDashboardStats(tenantId: string, filters: {
        startDate?: string;
        endDate?: string;
        siteId?: string;
        departmentId?: string;
    }, userId: string, userPermissions: string[]): Promise<{
        summary: {
            totalHours: number;
            totalApprovedHours: number;
            totalRecords: number;
            pendingCount: number;
            approvedCount: number;
            rejectedCount: number;
            paidCount: number;
            recoveredCount: number;
        };
        byType: {
            count: number;
            hours: number;
            type: string;
        }[];
        byStatus: {
            count: number;
            hours: number;
            status: string;
        }[];
        topEmployees: {
            hours: number;
            name: string;
            count: number;
            id: string;
        }[];
        byDepartment: {
            hours: number;
            name: string;
            count: number;
            id: string;
        }[];
        trend: {
            hours: number;
            date: string;
            count: number;
        }[];
    }>;
    isEmployeeOnLeaveOrRecovery(tenantId: string, employeeId: string, date: Date): Promise<{
        isOnLeave: boolean;
        reason?: string;
    }>;
}
