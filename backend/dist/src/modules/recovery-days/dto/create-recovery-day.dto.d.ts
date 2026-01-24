export declare class CreateRecoveryDayDto {
    employeeId: string;
    startDate: string;
    endDate: string;
    days: number;
    sourceHours?: number;
    conversionRate?: number;
    notes?: string;
}
export declare class ConvertOvertimeToRecoveryDayDto {
    employeeId: string;
    days: number;
    startDate: string;
    endDate: string;
    notes?: string;
}
export declare class ApproveRecoveryDayDto {
    comment?: string;
}
export declare class UpdateRecoveryDayDto {
    startDate?: string;
    endDate?: string;
    days?: number;
    notes?: string;
}
export declare class ConvertFlexibleDto {
    employeeId: string;
    overtimeIds: string[];
    startDate: string;
    endDate: string;
    days: number;
    autoApprove?: boolean;
    allowPastDate?: boolean;
    notes?: string;
}
