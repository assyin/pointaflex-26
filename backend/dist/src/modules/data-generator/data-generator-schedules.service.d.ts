import { PrismaService } from '../../database/prisma.service';
export declare class DataGeneratorSchedulesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateSchedules(tenantId: string, dto: any): Promise<{
        schedulesCreated: number;
        schedulesSkipped: number;
        employeesProcessed: number;
        weekendsExcluded: number;
        holidaysExcluded: number;
        success: boolean;
    }>;
    getSchedulesStats(tenantId: string): Promise<{
        totalSchedules: number;
        byShift: {
            shiftId: string;
            shiftName: string;
            shiftCode: string;
            count: number;
        }[];
        employeesWithSchedules: number;
        averageSchedulesPerEmployee: number;
    }>;
    cleanSchedules(tenantId: string, startDate?: string, endDate?: string): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
}
