import { PrismaService } from '../../database/prisma.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { OvertimeStatus } from '@prisma/client';
export declare class OvertimeService {
    private prisma;
    constructor(prisma: PrismaService);
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
        type: import(".prisma/client").$Enums.OvertimeType;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        date: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        rejectionReason: string | null;
        notes: string | null;
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
                    name: string;
                    code: string;
                };
            };
            isNightShift: boolean;
            type: import(".prisma/client").$Enums.OvertimeType;
            approvedBy: string;
            approvedAt: Date;
            date: Date;
            convertedToRecovery: boolean;
            recoveryId: string;
            status: import(".prisma/client").$Enums.OvertimeStatus;
            rejectionReason: string;
            notes: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            totalHours: number;
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
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string;
        approvedAt: Date;
        date: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        rejectionReason: string;
        notes: string;
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
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string;
        approvedAt: Date;
        date: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        rejectionReason: string;
        notes: string;
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
        type: import(".prisma/client").$Enums.OvertimeType;
        approvedBy: string;
        approvedAt: Date;
        date: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        rejectionReason: string;
        notes: string;
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
        type: import(".prisma/client").$Enums.OvertimeType;
        employeeId: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        date: Date;
        hours: import("@prisma/client/runtime/library").Decimal;
        approvedHours: import("@prisma/client/runtime/library").Decimal | null;
        rate: import("@prisma/client/runtime/library").Decimal;
        convertedToRecovery: boolean;
        recoveryId: string | null;
        status: import(".prisma/client").$Enums.OvertimeStatus;
        rejectionReason: string | null;
        notes: string | null;
    }>;
}
