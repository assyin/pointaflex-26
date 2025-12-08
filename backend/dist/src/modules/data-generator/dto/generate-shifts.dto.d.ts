export declare class ShiftDistributionDto {
    [shiftId: string]: number;
}
export declare class GenerateShiftsDto {
    createDefaultShifts?: boolean;
    distribution?: ShiftDistributionDto;
    createSchedules?: boolean;
    scheduleStartDate?: string;
    scheduleEndDate?: string;
}
