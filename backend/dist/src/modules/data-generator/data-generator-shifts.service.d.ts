import { PrismaService } from '../../database/prisma.service';
export declare class DataGeneratorShiftsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateShifts(tenantId: string, dto: any): Promise<{
        shifts: {
            id: string;
            name: string;
            code: string;
            startTime: string;
            endTime: string;
        }[];
        shiftsCreated: number;
        shiftsAssigned: number;
        schedulesCreated: number;
        employeesProcessed: number;
        success: boolean;
    }>;
    getShiftsStats(tenantId: string): Promise<{
        totalShifts: number;
        totalEmployees: number;
        employeesWithShift: number;
        employeesWithoutShift: number;
        shifts: {
            id: string;
            name: string;
            code: string;
            startTime: string;
            endTime: string;
            employeesCount: number;
            schedulesCount: number;
        }[];
    }>;
}
