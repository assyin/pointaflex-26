import { DataGeneratorService } from './data-generator.service';
import { GenerateSingleAttendanceDto } from './dto/generate-single-attendance.dto';
import { GenerateBulkAttendanceDto } from './dto/generate-bulk-attendance.dto';
import { CleanGeneratedDataDto } from './dto/clean-generated-data.dto';
export declare class DataGeneratorController {
    private readonly dataGeneratorService;
    constructor(dataGeneratorService: DataGeneratorService);
    generateSingle(req: any, dto: GenerateSingleAttendanceDto): Promise<{
        success: boolean;
        employee: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
        };
        date: string;
        scenario: string;
        generatedCount: number;
        attendances: any[];
    }>;
    generateBulk(req: any, dto: GenerateBulkAttendanceDto): Promise<{
        totalGenerated: number;
        byType: {};
        byScenario: {};
        anomaliesDetected: number;
        holidaysIgnored: number;
        weekendsIgnored: number;
        leavesRespected: number;
        overtimeGenerated: number;
        startDate: string;
        endDate: string;
        employeesCount: number;
    }>;
    cleanData(req: any, dto: CleanGeneratedDataDto): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
    getStats(req: any): Promise<import("./interfaces/generation-scenario.interface").GenerationStats>;
}
