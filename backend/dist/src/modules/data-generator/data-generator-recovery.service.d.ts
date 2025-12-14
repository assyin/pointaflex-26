import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { RecoveryConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorRecoveryService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateRecovery(tenantId: string, config: RecoveryConfigDto): Promise<number>;
}
