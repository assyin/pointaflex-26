import { PrismaService } from 'src/database/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
export declare class DevicesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, createDeviceDto: CreateDeviceDto): Promise<{
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            timezone: string | null;
            city: string | null;
            departmentId: string | null;
            managerId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        name: string;
        siteId: string | null;
        ipAddress: string | null;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    findAll(tenantId: string, filters?: any): Promise<({
        _count: {
            attendance: number;
        };
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            timezone: string | null;
            city: string | null;
            departmentId: string | null;
            managerId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        name: string;
        siteId: string | null;
        ipAddress: string | null;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        apiKey: string | null;
        lastSync: Date | null;
    })[]>;
    findOne(id: string, tenantId: string): Promise<{
        _count: {
            attendance: number;
        };
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            timezone: string | null;
            city: string | null;
            departmentId: string | null;
            managerId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        name: string;
        siteId: string | null;
        ipAddress: string | null;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    findByDeviceId(deviceId: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        name: string;
        siteId: string | null;
        ipAddress: string | null;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    update(id: string, tenantId: string, updateDeviceDto: UpdateDeviceDto): Promise<{
        site: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            phone: string | null;
            name: string;
            code: string | null;
            address: string | null;
            timezone: string | null;
            city: string | null;
            departmentId: string | null;
            managerId: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            workingDays: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        name: string;
        siteId: string | null;
        ipAddress: string | null;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    remove(id: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        name: string;
        siteId: string | null;
        ipAddress: string | null;
        deviceId: string;
        deviceType: import(".prisma/client").$Enums.DeviceType;
        apiKey: string | null;
        lastSync: Date | null;
    }>;
    getStats(tenantId: string): Promise<{
        total: number;
        active: number;
        inactive: number;
        offline: number;
    }>;
    syncDevice(id: string, tenantId: string): Promise<{
        success: boolean;
        message: string;
        device: {
            site: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                phone: string | null;
                name: string;
                code: string | null;
                address: string | null;
                timezone: string | null;
                city: string | null;
                departmentId: string | null;
                managerId: string | null;
                latitude: import("@prisma/client/runtime/library").Decimal | null;
                longitude: import("@prisma/client/runtime/library").Decimal | null;
                workingDays: import("@prisma/client/runtime/library").JsonValue | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isActive: boolean;
            name: string;
            siteId: string | null;
            ipAddress: string | null;
            deviceId: string;
            deviceType: import(".prisma/client").$Enums.DeviceType;
            apiKey: string | null;
            lastSync: Date | null;
        };
    }>;
}
