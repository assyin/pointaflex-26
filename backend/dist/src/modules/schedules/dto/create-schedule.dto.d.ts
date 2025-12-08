export declare class CreateScheduleDto {
    employeeId: string;
    shiftId: string;
    teamId?: string;
    dateDebut: string;
    dateFin?: string;
    customStartTime?: string;
    customEndTime?: string;
    notes?: string;
}
export declare class BulkScheduleDto {
    schedules: CreateScheduleDto[];
}
