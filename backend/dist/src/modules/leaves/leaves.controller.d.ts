import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { LeaveStatus } from '@prisma/client';
export declare class LeavesController {
    private leavesService;
    constructor(leavesService: LeavesService);
    create(user: any, dto: CreateLeaveDto): Promise<{
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
    findAll(user: any, page?: string, limit?: string, employeeId?: string, leaveTypeId?: string, status?: LeaveStatus, startDate?: string, endDate?: string): Promise<{
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
    findOne(user: any, id: string): Promise<{
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
    update(user: any, id: string, dto: UpdateLeaveDto): Promise<{
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
    approve(user: any, id: string, dto: ApproveLeaveDto): Promise<{
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
    cancel(user: any, id: string): Promise<{
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
    remove(user: any, id: string): Promise<{
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
}
