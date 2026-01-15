export declare class CreateShiftDto {
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    breakStartTime?: string;
    breakDuration?: number;
    isNightShift?: boolean;
    color?: string;
}
