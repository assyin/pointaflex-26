import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
export declare class AuditController {
    private auditService;
    constructor(auditService: AuditService);
    create(user: any, dto: CreateAuditLogDto, request: any): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findAll(user: any, page?: string, limit?: string, filters?: QueryAuditLogDto): Promise<{
        data: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            action: string;
            entity: string;
            entityId: string | null;
            oldValues: import("@prisma/client/runtime/library").JsonValue | null;
            newValues: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getActionSummary(user: any, startDate?: string, endDate?: string): Promise<{
        action: string;
        count: number;
    }[]>;
    getEntitySummary(user: any, startDate?: string, endDate?: string): Promise<{
        entity: string;
        count: number;
    }[]>;
    getUserActivity(user: any, userId: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            action: string;
            entity: string;
            entityId: string | null;
            oldValues: import("@prisma/client/runtime/library").JsonValue | null;
            newValues: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(user: any, id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.LegacyRole;
        };
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
