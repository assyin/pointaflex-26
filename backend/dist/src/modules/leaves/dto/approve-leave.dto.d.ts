import { LeaveStatus } from '@prisma/client';
export declare class ApproveLeaveDto {
    status: LeaveStatus;
    comment?: string;
}
