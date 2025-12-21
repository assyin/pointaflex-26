import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
export declare class SitesController {
    private readonly sitesService;
    constructor(sitesService: SitesService);
    create(user: any, dto: CreateSiteDto): Promise<{
        _count: {
            devices: number;
            employees: number;
        };
        manager: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
    } & {
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
    }>;
    findAll(user: any): Promise<{
        data: {
            _count: {
                employees: number;
                devices: number;
                attendance: number;
            };
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
        }[];
        total: number;
    }>;
    findOne(user: any, id: string): Promise<{
        _count: {
            attendance: number;
            devices: number;
            employees: number;
        };
        devices: {
            id: string;
            name: string;
            deviceId: string;
        }[];
        employees: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        }[];
        manager: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
    } & {
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
    }>;
    update(user: any, id: string, dto: UpdateSiteDto): Promise<{
        _count: {
            devices: number;
            employees: number;
        };
        manager: {
            id: string;
            firstName: string;
            lastName: string;
            matricule: string;
        };
    } & {
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
    }>;
    remove(user: any, id: string): Promise<{
        message: string;
    }>;
}
