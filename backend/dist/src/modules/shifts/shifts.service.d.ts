import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
export declare class ShiftsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, dto: CreateShiftDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        startTime: string;
        endTime: string;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: {
        search?: string;
        isNightShift?: boolean;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            code: string;
            startTime: string;
            endTime: string;
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
    findOne(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        startTime: string;
        endTime: string;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateShiftDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        startTime: string;
        endTime: string;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        name: string;
        code: string;
        startTime: string;
        endTime: string;
        breakDuration: number;
        isNightShift: boolean;
        color: string | null;
    }>;
}
