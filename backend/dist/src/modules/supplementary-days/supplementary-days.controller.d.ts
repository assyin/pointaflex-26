import { SupplementaryDaysService } from './supplementary-days.service';
import { CreateSupplementaryDayDto, SupplementaryDayType } from './dto/create-supplementary-day.dto';
import { ApproveSupplementaryDayDto } from './dto/approve-supplementary-day.dto';
import { OvertimeStatus } from '@prisma/client';
export declare class SupplementaryDaysController {
    private supplementaryDaysService;
    constructor(supplementaryDaysService: SupplementaryDaysService);
    create(user: any, dto: CreateSupplementaryDayDto): Promise<{
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
    findAll(user: any, page?: string, limit?: string, employeeId?: string, status?: OvertimeStatus, type?: SupplementaryDayType, startDate?: string, endDate?: string, siteId?: string, departmentId?: string): Promise<{
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
    getDashboardStats(user: any, startDate?: string, endDate?: string, siteId?: string, departmentId?: string): Promise<{
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
    findOne(user: any, id: string): Promise<{
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
    approve(user: any, id: string, dto: ApproveSupplementaryDayDto): Promise<{
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
    convertToRecovery(user: any, id: string): Promise<{
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
    revokeApproval(user: any, id: string, body: {
        reason?: string;
    }): Promise<{
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
    revokeRejection(user: any, id: string, body: {
        reason?: string;
    }): Promise<{
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
    remove(user: any, id: string): Promise<{
        message: string;
    }>;
}
