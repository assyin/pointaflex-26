import { DataGeneratorSchedulesService } from './data-generator-schedules.service';
import { GenerateSchedulesDto } from './dto/generate-schedules.dto';
export declare class DataGeneratorSchedulesController {
    private readonly schedulesService;
    constructor(schedulesService: DataGeneratorSchedulesService);
    generateSchedules(req: any, dto: GenerateSchedulesDto): Promise<{
        schedulesCreated: number;
        schedulesSkipped: number;
        employeesProcessed: number;
        weekendsExcluded: number;
        holidaysExcluded: number;
        success: boolean;
    }>;
    getStats(req: any): Promise<{
        totalSchedules: number;
        byShift: {
            shiftId: string;
            shiftName: string;
            shiftCode: string;
            count: number;
        }[];
        employeesWithSchedules: number;
        averageSchedulesPerEmployee: number;
    }>;
    cleanSchedules(req: any, startDate?: string, endDate?: string): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
}
