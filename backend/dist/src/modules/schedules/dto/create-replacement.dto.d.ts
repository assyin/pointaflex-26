import { ReplacementStatus } from '@prisma/client';
export declare class CreateReplacementDto {
    date: string;
    originalEmployeeId: string;
    replacementEmployeeId: string;
    shiftId: string;
    reason?: string;
    leaveId?: string;
}
export declare class UpdateReplacementDto {
    status?: ReplacementStatus;
    approvedBy?: string;
}
