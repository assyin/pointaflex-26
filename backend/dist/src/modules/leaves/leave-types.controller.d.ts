import { LeavesService } from './leaves.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
export declare class LeaveTypesController {
    private leavesService;
    constructor(leavesService: LeavesService);
    findAll(user: any): Promise<{
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
    create(user: any, dto: CreateLeaveTypeDto): Promise<{
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
    update(user: any, id: string, dto: UpdateLeaveTypeDto): Promise<{
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
    remove(user: any, id: string): Promise<{
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
