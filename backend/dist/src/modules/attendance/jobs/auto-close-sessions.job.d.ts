import { PrismaService } from '../../../database/prisma.service';
export declare class AutoCloseSessionsJob {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private parseTimeString;
    autoCloseSessions(): Promise<void>;
    private closeOrphanSessionsForTenant;
}
