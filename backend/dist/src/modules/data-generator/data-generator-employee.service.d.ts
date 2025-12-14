import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { EmployeesConfigDto } from './dto/generate-all-data.dto';
export declare class DataGeneratorEmployeeService {
    private readonly prisma;
    private readonly orchestrator;
    private readonly logger;
    constructor(prisma: PrismaService, orchestrator: DataGeneratorOrchestratorService);
    generateEmployees(tenantId: string, config: EmployeesConfigDto): Promise<number>;
    private selectRandom;
    private generateFirstName;
    private generateLastName;
    private generatePhone;
    private generateAddress;
    private generateHireDate;
}
