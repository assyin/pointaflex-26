import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { RBACConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorRBACService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateUsers(tenantId: string, config: RBACConfigDto): Promise<{
        count: number;
        users: Array<{
            email: string;
            password: string;
            role: string;
            firstName: string;
            lastName: string;
        }>;
    }>;
    generateCustomRoles(tenantId: string, customRoles: Array<{
        name: string;
        description?: string;
        permissions: string[];
    }>): Promise<number>;
    private generateFirstName;
    private generateLastName;
}
