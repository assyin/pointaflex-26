import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { NotificationsConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorNotificationService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateNotifications(tenantId: string, config: NotificationsConfigDto): Promise<number>;
    private generateTitle;
    private generateMessage;
    private generateRandomDate;
}
