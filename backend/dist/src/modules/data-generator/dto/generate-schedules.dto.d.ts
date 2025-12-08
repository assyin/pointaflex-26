export declare class GenerateSchedulesDto {
    startDate: string;
    endDate: string;
    employeeIds?: string[];
    shiftIds?: string[];
    excludeWeekends?: boolean;
    excludeHolidays?: boolean;
    workDaysPercentage?: number;
    shiftDistribution?: Record<string, number>;
    onlyWorkdays?: boolean;
}
