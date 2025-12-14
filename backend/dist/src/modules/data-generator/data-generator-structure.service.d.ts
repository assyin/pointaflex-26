import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { StructureConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorStructureService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    private readonly defaultSites;
    private readonly defaultDepartments;
    private readonly defaultPositions;
    private readonly defaultTeams;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateSites(tenantId: string, config: StructureConfigDto): Promise<number>;
    generateDepartments(tenantId: string, config: StructureConfigDto): Promise<number>;
    generatePositions(tenantId: string, config: StructureConfigDto): Promise<number>;
    generateTeams(tenantId: string, config: StructureConfigDto): Promise<number>;
    generateStructure(tenantId: string, config: StructureConfigDto): Promise<{
        sites: number;
        departments: number;
        positions: number;
        teams: number;
    }>;
}
