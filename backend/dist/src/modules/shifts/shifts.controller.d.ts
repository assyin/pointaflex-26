import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
export declare class ShiftsController {
    private shiftsService;
    constructor(shiftsService: ShiftsService);
    create(user: any, dto: CreateShiftDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        code: string;
        name: string;
        startTime: string;
        endTime: string;
        breakStartTime: string | null;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
    findAll(user: any, page?: string, limit?: string, search?: string, isNightShift?: string): Promise<{
        data: {
            _usage: {
                employeeCount: number;
                scheduleCount: number;
                canDelete: boolean;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            code: string;
            name: string;
            startTime: string;
            endTime: string;
            breakStartTime: string | null;
            breakDuration: number;
            isNightShift: boolean;
            color: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        code: string;
        name: string;
        startTime: string;
        endTime: string;
        breakStartTime: string | null;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
    getUsage(user: any, id: string): Promise<{
        employeeCount: number;
        scheduleCount: number;
        canDelete: boolean;
    }>;
    update(user: any, id: string, dto: UpdateShiftDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        code: string;
        name: string;
        startTime: string;
        endTime: string;
        breakStartTime: string | null;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
    remove(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        code: string;
        name: string;
        startTime: string;
        endTime: string;
        breakStartTime: string | null;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
}
