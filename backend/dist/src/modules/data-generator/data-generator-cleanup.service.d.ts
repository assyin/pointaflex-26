import { PrismaService } from '../../database/prisma.service';
export declare class DataGeneratorCleanupService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    cleanupAll(tenantId: string): Promise<{
        deleted: Record<string, number>;
        total: number;
    }>;
    cleanupByType(tenantId: string, entityType: string): Promise<number>;
}
