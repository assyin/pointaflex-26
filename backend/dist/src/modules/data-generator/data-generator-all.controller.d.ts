import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { DataGeneratorCleanupService } from './data-generator-cleanup.service';
import { GenerateAllDataDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorAllController {
    private readonly orchestratorService;
    private readonly cleanupService;
    private readonly logger;
    constructor(orchestratorService: DataGeneratorOrchestratorService, cleanupService: DataGeneratorCleanupService);
    generateAll(tenantId: string, dto: GenerateAllDataDto): Promise<import("./interfaces/generation-stats.interface").GenerationStats>;
    cleanupAll(tenantId: string): Promise<{
        deleted: Record<string, number>;
        total: number;
    }>;
}
