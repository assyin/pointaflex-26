import { PrismaService } from '../../database/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
export declare class SitesService {
    private prisma;
    constructor(prisma: PrismaService);
    private generateUniqueCode;
    private validateManagerDepartmentConstraint;
    create(tenantId: string, dto: CreateSiteDto): Promise<{
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
    findAll(tenantId: string, userId?: string, userPermissions?: string[]): Promise<{
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
    findOne(tenantId: string, id: string): Promise<{
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
    update(tenantId: string, id: string, dto: UpdateSiteDto): Promise<{
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
    remove(tenantId: string, id: string): Promise<{
        message: string;
    }>;
}
