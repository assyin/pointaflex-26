export declare class UpdateTenantSettingsDto {
    legalName?: string;
    displayName?: string;
    country?: string;
    city?: string;
    hrEmail?: string;
    phone?: string;
    timezone?: string;
    language?: string;
    firstDayOfWeek?: string;
    workingDays?: string[];
    lateToleranceEntry?: number;
    earlyToleranceExit?: number;
    overtimeRounding?: number;
    nightShiftStart?: string;
    nightShiftEnd?: string;
    twoLevelWorkflow?: boolean;
    anticipatedLeave?: boolean;
    monthlyPayrollEmail?: boolean;
    sfptExport?: boolean;
}
