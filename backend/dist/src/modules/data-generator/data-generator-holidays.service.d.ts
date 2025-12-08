import { PrismaService } from '../../database/prisma.service';
export declare class DataGeneratorHolidaysService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateHolidays(tenantId: string, dto: any): Promise<{
        holidaysCreated: number;
        holidaysSkipped: number;
        success: boolean;
    }>;
    getHolidaysStats(tenantId: string): Promise<{
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
    cleanHolidays(tenantId: string): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
}
