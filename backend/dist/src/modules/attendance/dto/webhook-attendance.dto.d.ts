import { AttendanceType, DeviceType } from '@prisma/client';
export declare class WebhookAttendanceDto {
    employeeId: string;
    type: AttendanceType;
    method: DeviceType;
    timestamp: string;
    rawData?: any;
}
