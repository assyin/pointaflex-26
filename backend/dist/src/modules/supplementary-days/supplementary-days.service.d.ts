import { PrismaService } from '../../database/prisma.service';
import { CreateSupplementaryDayDto, SupplementaryDayType } from './dto/create-supplementary-day.dto';
import { ApproveSupplementaryDayDto } from './dto/approve-supplementary-day.dto';
import { OvertimeStatus, SupplementaryDayType as PrismaSupplementaryDayType } from '@prisma/client';
export declare class SupplementaryDaysService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(tenantId: string, dto: CreateSupplementaryDayDto): Promise<{
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
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.SupplementaryDayType;
        approvedBy: string | null;
        approvedAt: Date | null;
        source: string;
        hours: import("@prisma/client/runtime/library").Decimal;
        attendanceId: string | null;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        convertedToRecovery: boolean;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
        checkIn: Date | null;
        checkOut: Date | null;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        employeeId?: string;
        status?: OvertimeStatus;
        type?: SupplementaryDayType;
        startDate?: string;
        endDate?: string;
        siteId?: string;
        departmentId?: string;
    }): Promise<{
        data: ({
            employee: {
                id: string;
                firstName: string;
                lastName: string;
                matricule: string;
                department: {
                    id: string;
                    name: string;
                };
                site: {
                    id: string;
                    name: string;
                };
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            date: Date;
            notes: string | null;
            status: import(".prisma/client").$Enums.OvertimeStatus;
            type: import(".prisma/client").$Enums.SupplementaryDayType;
            approvedBy: string | null;
            approvedAt: Date | null;
            source: string;
            hours: import("@prisma/client/runtime/library").Decimal;
            attendanceId: string | null;
            approvedHours: import("@prisma/client/runtime/library").Decimal | null;
            convertedToRecovery: boolean;
            convertedToRecoveryDays: boolean;
            convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
            rejectionReason: string | null;
            checkIn: Date | null;
            checkOut: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(tenantId: string, id: string): Promise<{
        employee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
            department: {
                id: string;
                name: string;
            };
            site: {
                id: string;
                name: string;
            };
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.SupplementaryDayType;
        approvedBy: string | null;
        approvedAt: Date | null;
        source: string;
        hours: import("@prisma/client/runtime/library").Decimal;
        attendanceId: string | null;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        convertedToRecovery: boolean;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
        checkIn: Date | null;
        checkOut: Date | null;
    }>;
    approve(tenantId: string, id: string, userId: string, dto: ApproveSupplementaryDayDto): Promise<{
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
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.SupplementaryDayType;
        approvedBy: string | null;
        approvedAt: Date | null;
        source: string;
        hours: import("@prisma/client/runtime/library").Decimal;
        attendanceId: string | null;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        convertedToRecovery: boolean;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
        checkIn: Date | null;
        checkOut: Date | null;
    }>;
    convertToRecovery(tenantId: string, id: string): Promise<{
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
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.SupplementaryDayType;
        approvedBy: string | null;
        approvedAt: Date | null;
        source: string;
        hours: import("@prisma/client/runtime/library").Decimal;
        attendanceId: string | null;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        convertedToRecovery: boolean;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
        checkIn: Date | null;
        checkOut: Date | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        message: string;
    }>;
    getDashboardStats(tenantId: string, filters?: {
        startDate?: string;
        endDate?: string;
        siteId?: string;
        departmentId?: string;
    }): Promise<{
        counts: {
            pending: number;
            approved: number;
            rejected: number;
            recovered: number;
            total: number;
        };
        totalApprovedHours: number;
        byType: {
            type: import(".prisma/client").$Enums.SupplementaryDayType;
            count: number;
            hours: number;
        }[];
    }>;
    revokeApproval(tenantId: string, id: string, userId: string, reason?: string): Promise<{
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
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.SupplementaryDayType;
        approvedBy: string | null;
        approvedAt: Date | null;
        source: string;
        hours: import("@prisma/client/runtime/library").Decimal;
        attendanceId: string | null;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        convertedToRecovery: boolean;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
        checkIn: Date | null;
        checkOut: Date | null;
    }>;
    revokeRejection(tenantId: string, id: string, userId: string, reason?: string): Promise<{
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
        employeeId: string;
        date: Date;
        notes: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        type: import(".prisma/client").$Enums.SupplementaryDayType;
        approvedBy: string | null;
        approvedAt: Date | null;
        source: string;
        hours: import("@prisma/client/runtime/library").Decimal;
        attendanceId: string | null;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        convertedToRecovery: boolean;
        convertedToRecoveryDays: boolean;
        convertedHoursToRecoveryDays: import("@prisma/client/runtime/library").Decimal;
        rejectionReason: string | null;
        checkIn: Date | null;
        checkOut: Date | null;
    }>;
    isSupplementaryDay(tenantId: string, date: Date): Promise<{
        isSupplementary: boolean;
        type: PrismaSupplementaryDayType | null;
    }>;
    createAutoSupplementaryDay(params: {
        tenantId: string;
        employeeId: string;
        attendanceId: string;
        date: Date;
        checkIn: Date;
        checkOut: Date;
        hoursWorked: number;
    }): Promise<{
        created: boolean;
        supplementaryDay?: any;
        reason?: string;
    }>;
    detectMissingSupplementaryDays(tenantId: string, startDate: Date, endDate: Date): Promise<{
        created: number;
        existing: number;
        skipped: number;
        errors: number;
    }>;
}
