import { SiteManagersService } from './site-managers.service';
import { CreateSiteManagerDto } from './dto/create-site-manager.dto';
import { UpdateSiteManagerDto } from './dto/update-site-manager.dto';
export declare class SiteManagersController {
    private readonly siteManagersService;
    constructor(siteManagersService: SiteManagersService);
    create(user: any, dto: CreateSiteManagerDto): Promise<{
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
    findAll(user: any, siteId?: string, departmentId?: string): Promise<({
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
    findBySite(user: any, siteId: string): Promise<({
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
    findByManager(user: any, managerId: string): Promise<({
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
    findOne(user: any, id: string): Promise<{
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
    update(user: any, id: string, dto: UpdateSiteManagerDto): Promise<{
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
    remove(user: any, id: string): Promise<{
        message: string;
    }>;
}
