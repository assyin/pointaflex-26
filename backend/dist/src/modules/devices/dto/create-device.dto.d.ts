import { DeviceType } from '@prisma/client';
export declare class CreateDeviceDto {
    name: string;
    deviceId: string;
    deviceType: DeviceType;
    ipAddress?: string;
    apiKey?: string;
    siteId?: string;
    isActive?: boolean;
}
