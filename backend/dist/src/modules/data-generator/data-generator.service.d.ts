import { PrismaService } from '../../database/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { GenerateSingleAttendanceDto } from './dto/generate-single-attendance.dto';
import { GenerateBulkAttendanceDto } from './dto/generate-bulk-attendance.dto';
import { CleanGeneratedDataDto } from './dto/clean-generated-data.dto';
import { GenerationStats } from './interfaces/generation-scenario.interface';
export declare class DataGeneratorService {
    private readonly prisma;
    private readonly attendanceService;
    private readonly logger;
    constructor(prisma: PrismaService, attendanceService: AttendanceService);
    generateSingleDay(tenantId: string, dto: GenerateSingleAttendanceDto): Promise<{
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
    generateBulk(tenantId: string, dto: GenerateBulkAttendanceDto): Promise<{
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
    cleanGeneratedData(tenantId: string, dto: CleanGeneratedDataDto): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
    getStats(tenantId: string): Promise<GenerationStats>;
    private generateAttendancesForScenario;
    private calculateTimestamp;
    private getRandomVariance;
    private pickScenarioByDistribution;
    private getScenarioForType;
    private isHoliday;
    private isEmployeeOnLeave;
    private calculateAndCreateOvertime;
}
