import { PrismaService } from '../../../database/prisma.service';
import { SupplementaryDaysService } from '../supplementary-days.service';
export declare class DetectSupplementaryDaysJob {
    private prisma;
    private supplementaryDaysService;
    private readonly logger;
    constructor(prisma: PrismaService, supplementaryDaysService: SupplementaryDaysService);
    detectSupplementaryDays(): Promise<void>;
    processDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<{
        created: number;
        existing: number;
        skipped: number;
        errors: number;
    }>;
}
