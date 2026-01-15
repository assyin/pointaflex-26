export declare class BulkCorrectionItemDto {
    attendanceId: string;
    correctedTimestamp?: string;
    correctionNote?: string;
}
export declare class BulkCorrectAttendanceDto {
    attendances: BulkCorrectionItemDto[];
    generalNote: string;
    correctedBy?: string;
    forceApproval?: boolean;
}
