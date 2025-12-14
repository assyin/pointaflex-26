import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { ReplacementsConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorReplacementService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateReplacements(tenantId: string, config: ReplacementsConfigDto): Promise<number>;
    private generateReason;
}
