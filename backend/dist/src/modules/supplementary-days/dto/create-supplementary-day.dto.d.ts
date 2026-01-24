export declare enum SupplementaryDayType {
    WEEKEND_SATURDAY = "WEEKEND_SATURDAY",
    WEEKEND_SUNDAY = "WEEKEND_SUNDAY",
    HOLIDAY = "HOLIDAY"
}
export declare class CreateSupplementaryDayDto {
    employeeId: string;
    date: string;
    hours: number;
    type: SupplementaryDayType;
    checkIn?: string;
    checkOut?: string;
    source?: string;
    notes?: string;
}
