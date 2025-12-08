export declare class GenerateHolidaysDto {
    generateMoroccoHolidays?: boolean;
    startYear?: number;
    endYear?: number;
    customHolidays?: Array<{
        name: string;
        date: string;
        isRecurring?: boolean;
    }>;
}
