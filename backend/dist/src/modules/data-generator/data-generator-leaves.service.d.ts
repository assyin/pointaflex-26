import { PrismaService } from '../../database/prisma.service';
export declare class DataGeneratorLeavesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateLeaves(tenantId: string, dto: any): Promise<{
        leaveTypesCreated: number;
        leavesCreated: number;
        leavesSkipped: number;
        employeesProcessed: number;
        success: boolean;
    }>;
    getLeavesStats(tenantId: string): Promise<{
        totalLeaveTypes: number;
        totalLeaves: number;
        totalDays: number;
        byStatus: {
            [status: string]: number;
        };
        leaveTypes: {
            id: string;
            name: string;
            code: string;
            isPaid: boolean;
            leavesCount: number;
        }[];
    }>;
    private shuffleArray;
}
