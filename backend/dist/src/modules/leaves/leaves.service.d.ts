import { PrismaService } from '../../database/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { LeaveStatus, Role } from '@prisma/client';
export declare class LeavesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, dto: CreateLeaveDto): Promise<{
        employee: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
        };
        leaveType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            code: string;
            isPaid: boolean;
            requiresDocument: boolean;
            maxDaysPerYear: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        document: string | null;
        status: import(".prisma/client").$Enums.LeaveStatus;
        managerApprovedBy: string | null;
        managerApprovedAt: Date | null;
        managerComment: string | null;
        hrApprovedBy: string | null;
        hrApprovedAt: Date | null;
        hrComment: string | null;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        employeeId?: string;
        leaveTypeId?: string;
        status?: LeaveStatus;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        data: ({
            employee: {
                id: string;
                matricule: string;
                firstName: string;
                lastName: string;
            };
            leaveType: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                code: string;
                isPaid: boolean;
                requiresDocument: boolean;
                maxDaysPerYear: number | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            employeeId: string;
            leaveTypeId: string;
            startDate: Date;
            endDate: Date;
            days: import("@prisma/client/runtime/library").Decimal;
            reason: string | null;
            document: string | null;
            status: import(".prisma/client").$Enums.LeaveStatus;
            managerApprovedBy: string | null;
            managerApprovedAt: Date | null;
            managerComment: string | null;
            hrApprovedBy: string | null;
            hrApprovedAt: Date | null;
            hrComment: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        employee: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            email: string;
            position: string;
        };
        leaveType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            code: string;
            isPaid: boolean;
            requiresDocument: boolean;
            maxDaysPerYear: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        document: string | null;
        status: import(".prisma/client").$Enums.LeaveStatus;
        managerApprovedBy: string | null;
        managerApprovedAt: Date | null;
        managerComment: string | null;
        hrApprovedBy: string | null;
        hrApprovedAt: Date | null;
        hrComment: string | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateLeaveDto): Promise<{
        employee: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
        };
        leaveType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            code: string;
            isPaid: boolean;
            requiresDocument: boolean;
            maxDaysPerYear: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        document: string | null;
        status: import(".prisma/client").$Enums.LeaveStatus;
        managerApprovedBy: string | null;
        managerApprovedAt: Date | null;
        managerComment: string | null;
        hrApprovedBy: string | null;
        hrApprovedAt: Date | null;
        hrComment: string | null;
    }>;
    approve(tenantId: string, id: string, userId: string, userRole: Role, dto: ApproveLeaveDto): Promise<{
        employee: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
        };
        leaveType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            code: string;
            isPaid: boolean;
            requiresDocument: boolean;
            maxDaysPerYear: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        document: string | null;
        status: import(".prisma/client").$Enums.LeaveStatus;
        managerApprovedBy: string | null;
        managerApprovedAt: Date | null;
        managerComment: string | null;
        hrApprovedBy: string | null;
        hrApprovedAt: Date | null;
        hrComment: string | null;
    }>;
    cancel(tenantId: string, id: string, userId: string): Promise<{
        employee: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
        };
        leaveType: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            code: string;
            isPaid: boolean;
            requiresDocument: boolean;
            maxDaysPerYear: number | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        document: string | null;
        status: import(".prisma/client").$Enums.LeaveStatus;
        managerApprovedBy: string | null;
        managerApprovedAt: Date | null;
        managerComment: string | null;
        hrApprovedBy: string | null;
        hrApprovedAt: Date | null;
        hrComment: string | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: Date;
        endDate: Date;
        days: import("@prisma/client/runtime/library").Decimal;
        reason: string | null;
        document: string | null;
        status: import(".prisma/client").$Enums.LeaveStatus;
        managerApprovedBy: string | null;
        managerApprovedAt: Date | null;
        managerComment: string | null;
        hrApprovedBy: string | null;
        hrApprovedAt: Date | null;
        hrComment: string | null;
    }>;
    getLeaveTypes(tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        isPaid: boolean;
        requiresDocument: boolean;
        maxDaysPerYear: number | null;
    }[]>;
    createLeaveType(tenantId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        isPaid: boolean;
        requiresDocument: boolean;
        maxDaysPerYear: number | null;
    }>;
    updateLeaveType(tenantId: string, id: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        isPaid: boolean;
        requiresDocument: boolean;
        maxDaysPerYear: number | null;
    }>;
    deleteLeaveType(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        isPaid: boolean;
        requiresDocument: boolean;
        maxDaysPerYear: number | null;
    }>;
}
