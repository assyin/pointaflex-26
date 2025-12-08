import { DataGeneratorShiftsService } from './data-generator-shifts.service';
import { GenerateShiftsDto } from './dto/generate-shifts.dto';
export declare class DataGeneratorShiftsController {
    private readonly shiftsService;
    constructor(shiftsService: DataGeneratorShiftsService);
    generateShifts(req: any, dto: GenerateShiftsDto): Promise<{
        shifts: {
            id: string;
            name: string;
            code: string;
            startTime: string;
            endTime: string;
        }[];
        shiftsCreated: number;
        shiftsAssigned: number;
        schedulesCreated: number;
        employeesProcessed: number;
        success: boolean;
    }>;
    getStats(req: any): Promise<{
        totalShifts: number;
        totalEmployees: number;
        employeesWithShift: number;
        employeesWithoutShift: number;
        shifts: {
            id: string;
            name: string;
            code: string;
            startTime: string;
            endTime: string;
            employeesCount: number;
            schedulesCount: number;
        }[];
    }>;
}
