import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { DevicesConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorDeviceService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateDevices(tenantId: string, config: DevicesConfigDto): Promise<number>;
}
