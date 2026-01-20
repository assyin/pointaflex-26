import { OvertimeService } from './overtime.service';
import { RecoveryDaysService } from '../recovery-days/recovery-days.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { OvertimeStatus } from '@prisma/client';
export declare class OvertimeController {
    private overtimeService;
    private recoveryDaysService;
    constructor(overtimeService: OvertimeService, recoveryDaysService: RecoveryDaysService);
    create(user: any, dto: CreateOvertimeDto): Promise<{
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
    findAll(user: any, page?: string, limit?: string, employeeId?: string, status?: OvertimeStatus, startDate?: string, endDate?: string, isNightShift?: string, type?: string, siteId?: string, departmentId?: string): Promise<{
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
    getDashboardStats(user: any, startDate?: string, endDate?: string, siteId?: string, departmentId?: string): Promise<{
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
    findOne(user: any, id: string): Promise<{
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
    update(user: any, id: string, dto: UpdateOvertimeDto): Promise<{
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
    approve(user: any, id: string, dto: ApproveOvertimeDto): Promise<{
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
    convertToRecovery(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        source: string | null;
        hours: import("@prisma/client/runtime/library").Decimal;
        usedHours: import("@prisma/client/runtime/library").Decimal;
        remainingHours: import("@prisma/client/runtime/library").Decimal;
        expiryDate: Date | null;
    }>;
    getBalance(user: any, employeeId: string): Promise<{
        employeeId: string;
        totalRequested: number;
        totalApproved: number;
        totalPending: number;
        totalRejected: number;
        totalPaid: number;
        totalRecovered: number;
        availableForConversion: number;
    }>;
    getCumulativeBalance(user: any, employeeId: string): Promise<{
        employeeId: string;
        cumulativeHours: number;
        dailyWorkingHours: number;
        conversionRate: number;
        possibleDays: number;
        overtimeDetails: any[];
    }>;
    remove(user: any, id: string): Promise<{
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
}
