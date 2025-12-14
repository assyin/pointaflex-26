import { PrismaService } from '../../database/prisma.service';
import { CreateSiteManagerDto } from './dto/create-site-manager.dto';
import { UpdateSiteManagerDto } from './dto/update-site-manager.dto';
export declare class SiteManagersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, dto: CreateSiteManagerDto): Promise<{
        site: {
            id: string;
            name: string;
            code: string;
        };
        manager: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        department: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string;
        managerId: string;
        departmentId: string;
    }>;
    findAll(tenantId: string, filters?: {
        siteId?: string;
        departmentId?: string;
    }): Promise<({
        site: {
            id: string;
            name: string;
            city: string;
            code: string;
        };
        manager: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
        };
        department: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string;
        managerId: string;
        departmentId: string;
    })[]>;
    findOne(tenantId: string, id: string): Promise<{
        site: {
            id: string;
            name: string;
            city: string;
            code: string;
        };
        manager: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
        };
        department: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string;
        managerId: string;
        departmentId: string;
    }>;
    update(tenantId: string, id: string, dto: UpdateSiteManagerDto): Promise<{
        site: {
            id: string;
            name: string;
            code: string;
        };
        manager: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        department: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string;
        managerId: string;
        departmentId: string;
    }>;
    remove(tenantId: string, id: string): Promise<{
        message: string;
    }>;
    findBySite(tenantId: string, siteId: string): Promise<({
        manager: {
            id: string;
            matricule: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        department: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string;
        managerId: string;
        departmentId: string;
    })[]>;
    findByManager(tenantId: string, managerId: string): Promise<({
        site: {
            id: string;
            name: string;
            city: string;
            code: string;
        };
        department: {
            id: string;
            name: string;
            code: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        siteId: string;
        managerId: string;
        departmentId: string;
    })[]>;
}
