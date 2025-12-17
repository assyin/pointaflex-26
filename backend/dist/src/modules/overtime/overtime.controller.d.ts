import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { OvertimeStatus } from '@prisma/client';
export declare class OvertimeController {
    private overtimeService;
    constructor(overtimeService: OvertimeService);
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
    convertToRecovery(user: any, id: string): Promise<{
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
    remove(user: any, id: string): Promise<{
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
