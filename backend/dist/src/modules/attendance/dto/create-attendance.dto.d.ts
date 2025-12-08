import { AttendanceType, DeviceType } from '@prisma/client';
export declare class CreateAttendanceDto {
    employeeId: string;
    timestamp: string;
    type: AttendanceType;
    method: DeviceType;
    siteId?: string;
    deviceId?: string;
    latitude?: number;
    longitude?: number;
    rawData?: any;
}
