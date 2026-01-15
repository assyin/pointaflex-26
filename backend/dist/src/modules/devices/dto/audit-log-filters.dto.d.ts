import { DeviceAction } from '@prisma/client';
export declare class AuditLogFiltersDto {
    deviceId?: string;
    action?: DeviceAction;
    performedBy?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
