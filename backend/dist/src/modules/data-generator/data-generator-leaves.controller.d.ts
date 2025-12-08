import { DataGeneratorLeavesService } from './data-generator-leaves.service';
import { GenerateLeavesDto } from './dto/generate-leaves.dto';
export declare class DataGeneratorLeavesController {
    private readonly leavesService;
    constructor(leavesService: DataGeneratorLeavesService);
    generateLeaves(req: any, dto: GenerateLeavesDto): Promise<{
        leaveTypesCreated: number;
        leavesCreated: number;
        leavesSkipped: number;
        employeesProcessed: number;
        success: boolean;
    }>;
    getStats(req: any): Promise<{
        totalLeaveTypes: number;
        totalLeaves: number;
        totalDays: number;
        byStatus: {
            [status: string]: number;
        };
        leaveTypes: {
            id: string;
            name: string;
            code: string;
            isPaid: boolean;
            leavesCount: number;
        }[];
    }>;
}
