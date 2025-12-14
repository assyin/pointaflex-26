import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
export declare class DataGeneratorHierarchyService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    configureHierarchy(tenantId: string, managerDistribution?: {
        departmentManagers: number;
        siteManagers: number;
        teamManagers: number;
    }): Promise<{
        departmentManagers: number;
        siteManagers: number;
        teamManagers: number;
    }>;
    private assignManagerRole;
}
