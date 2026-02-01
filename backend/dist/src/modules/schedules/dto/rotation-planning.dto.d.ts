export declare class EmployeeRotationDto {
    employeeId: string;
    startDate: string;
}
export declare class GenerateRotationPlanningDto {
    workDays: number;
    restDays: number;
    shiftId: string;
    endDate: string;
    employees: EmployeeRotationDto[];
    overwriteExisting?: boolean;
    respectLeaves?: boolean;
    respectRecoveryDays?: boolean;
}
export declare class RotationPlanningResultDto {
    success: number;
    skipped: number;
    failed: number;
    details: Array<{
        employeeId: string;
        matricule: string;
        employeeName: string;
        created: number;
        skipped: number;
        errors: string[];
    }>;
}
export declare class PreviewRotationPlanningDto {
    workDays: number;
    restDays: number;
    endDate: string;
    employees: EmployeeRotationDto[];
}
export declare class PreviewRotationResultDto {
    preview: Array<{
        employeeId: string;
        matricule: string;
        employeeName: string;
        startDate: string;
        schedule: Array<{
            date: string;
            dayOfWeek: string;
            isWorkDay: boolean;
        }>;
        totalWorkDays: number;
        totalRestDays: number;
    }>;
    totalSchedulesToCreate: number;
}
