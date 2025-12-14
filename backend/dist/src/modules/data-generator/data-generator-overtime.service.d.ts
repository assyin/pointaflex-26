import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { OvertimeConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorOvertimeService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateOvertime(tenantId: string, config: OvertimeConfigDto): Promise<number>;
    private generateRandomDate;
}
