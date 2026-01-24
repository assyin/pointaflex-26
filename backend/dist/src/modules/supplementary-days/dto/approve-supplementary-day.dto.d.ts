export declare enum ApprovalStatus {
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class ApproveSupplementaryDayDto {
    status: ApprovalStatus;
    approvedHours?: number;
    rejectionReason?: string;
}
