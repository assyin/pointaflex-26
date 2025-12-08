import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
export declare class DevicesController {
    private readonly devicesService;
    constructor(devicesService: DevicesService);
    create(user: any, createDeviceDto: CreateDeviceDto): Promise<{
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            address: string | null;
            name: string;
            code: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        isActive: boolean;
        name: string;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        ipAddress: string | null;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    findAll(user: any, filters: any): Promise<({
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            address: string | null;
            name: string;
            code: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        _count: {
            attendance: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        isActive: boolean;
        name: string;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        ipAddress: string | null;
        apiKey: string | null;
        lastSync: Date | null;
    })[]>;
    getStats(user: any): Promise<{
        total: number;
        active: number;
        inactive: number;
        offline: number;
    }>;
    findOne(id: string, user: any): Promise<{
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            address: string | null;
            name: string;
            code: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
        _count: {
            attendance: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        isActive: boolean;
        name: string;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        ipAddress: string | null;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    update(id: string, user: any, updateDeviceDto: UpdateDeviceDto): Promise<{
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            address: string | null;
            name: string;
            code: string | null;
            city: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            timezone: string | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        isActive: boolean;
        name: string;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        ipAddress: string | null;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    remove(id: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string | null;
        isActive: boolean;
        name: string;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        ipAddress: string | null;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    sync(id: string, user: any): Promise<{
        success: boolean;
        message: string;
        device: {
            site: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                phone: string | null;
                address: string | null;
                name: string;
                code: string | null;
                city: string | null;
                latitude: import("@prisma/client/runtime/library").Decimal | null;
                longitude: import("@prisma/client/runtime/library").Decimal | null;
                timezone: string | null;
                workingDays: import("@prisma/client/runtime/library").JsonValue | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            siteId: string | null;
            isActive: boolean;
            name: string;
            deviceId: string;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            ipAddress: string | null;
            apiKey: string | null;
            lastSync: Date | null;
        };
    }>;
}
