export declare enum ValidationAction {
    VALIDATE = "VALIDATE",
    REJECT = "REJECT",
    CORRECT = "CORRECT"
}
export declare class ValidateAttendanceDto {
    attendanceId: string;
    action: ValidationAction;
    correctedType?: 'IN' | 'OUT';
    validationNote?: string;
}
export declare class BulkValidateAttendanceDto {
    validations: ValidateAttendanceDto[];
}
