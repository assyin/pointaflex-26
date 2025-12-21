import { PrismaService } from '../../database/prisma.service';
import { TerminalMatriculeMappingService } from './terminal-matricule-mapping.service';
export declare class TerminalMatriculeMappingScheduler {
    private prisma;
    private mappingService;
    private readonly logger;
    constructor(prisma: PrismaService, mappingService: TerminalMatriculeMappingService);
    checkExpiringTemporaryMatricules(): Promise<void>;
}
