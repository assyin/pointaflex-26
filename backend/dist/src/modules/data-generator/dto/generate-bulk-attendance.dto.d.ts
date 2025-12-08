export declare class DistributionDto {
    normal: number;
    late: number;
    earlyLeave: number;
    anomaly: number;
    mission: number;
    absence: number;
}
export declare class GenerateBulkAttendanceDto {
    startDate: string;
    endDate: string;
    employeeIds?: string[];
    distribution: DistributionDto;
    siteId?: string;
    excludeHolidays?: boolean;
    excludeWeekends?: boolean;
    generateOvertime?: boolean;
    overtimeThreshold?: number;
}
