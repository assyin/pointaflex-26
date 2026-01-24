import { PrismaService } from '../../../database/prisma.service';
export declare class MarkUsedRecoveryDaysJob {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    markPastRecoveryDaysAsUsed(): Promise<void>;
    markRecoveryDayAsUsed(recoveryDayId: string): Promise<boolean>;
    markPastRecoveryDaysForTenant(tenantId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
