import { TerminalMatriculeMappingService } from './terminal-matricule-mapping.service';
import { MigrateMatriculeDto } from './dto/migrate-matricule.dto';
export declare class TerminalMatriculeMappingController {
    private readonly mappingService;
    constructor(mappingService: TerminalMatriculeMappingService);
    getExpiringMatricules(tenantId: string): Promise<{
        employee: {
            id: string;
            createdAt: Date;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
            hireDate: Date;
        };
        daysSinceAssignment: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        assignedAt: Date;
        employeeId: string;
        deviceId: string | null;
        terminalMatricule: string;
        officialMatricule: string;
    }[]>;
    getAllTemporaryMatricules(tenantId: string): Promise<{
        employee: {
            id: string;
            createdAt: Date;
            email: string;
            firstName: string;
            lastName: string;
            matricule: string;
            hireDate: Date;
        };
        daysSinceAssignment: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        assignedAt: Date;
        employeeId: string;
        deviceId: string | null;
        terminalMatricule: string;
        officialMatricule: string;
    }[]>;
    migrateToOfficialMatricule(tenantId: string, employeeId: string, dto: MigrateMatriculeDto): Promise<{
        success: boolean;
        message: string;
        employee: {
            id: string;
            matricule: string;
        };
    }>;
    getEmployeeMappings(employeeId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        assignedAt: Date;
        employeeId: string;
        deviceId: string | null;
        terminalMatricule: string;
        officialMatricule: string;
    }[]>;
    getMappingHistory(tenantId: string, employeeId?: string, terminalMatricule?: string, officialMatricule?: string, startDate?: string, endDate?: string, isActive?: string, page?: string, limit?: string): Promise<{
        data: {
            daysSinceAssignment: number;
            employee: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                matricule: string;
                hireDate: Date;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isActive: boolean;
            assignedAt: Date;
            employeeId: string;
            deviceId: string | null;
            terminalMatricule: string;
            officialMatricule: string;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
