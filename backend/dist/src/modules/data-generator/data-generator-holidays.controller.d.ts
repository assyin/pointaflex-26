import { DataGeneratorHolidaysService } from './data-generator-holidays.service';
import { GenerateHolidaysDto } from './dto/generate-holidays.dto';
export declare class DataGeneratorHolidaysController {
    private readonly holidaysService;
    constructor(holidaysService: DataGeneratorHolidaysService);
    generateHolidays(req: any, dto: GenerateHolidaysDto): Promise<{
        holidaysCreated: number;
        holidaysSkipped: number;
        success: boolean;
    }>;
    getStats(req: any): Promise<{
        totalHolidays: number;
        recurring: number;
        nonRecurring: number;
        byYear: {
            [year: string]: number;
        };
        holidays: {
            id: string;
            name: string;
            date: string;
            isRecurring: boolean;
            type: import(".prisma/client").$Enums.HolidayType;
        }[];
    }>;
    cleanHolidays(req: any): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
}
