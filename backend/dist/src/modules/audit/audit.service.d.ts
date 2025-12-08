import { PrismaService } from '../../database/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, userId: string, dto: CreateAuditLogDto): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string | null;
        ipAddress: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        userAgent: string | null;
    }>;
    findAll(tenantId: string, page?: number, limit?: number, filters?: QueryAuditLogDto): Promise<{
        data: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            ipAddress: string | null;
            action: string;
            entity: string;
            entityId: string | null;
            oldValues: import("@prisma/client/runtime/library").JsonValue | null;
            newValues: import("@prisma/client/runtime/library").JsonValue | null;
            userAgent: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        userId: string | null;
        ipAddress: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        userAgent: string | null;
    }>;
    getActionSummary(tenantId: string, startDate?: string, endDate?: string): Promise<{
        action: string;
        count: number;
    }[]>;
    getEntitySummary(tenantId: string, startDate?: string, endDate?: string): Promise<{
        entity: string;
        count: number;
    }[]>;
    getUserActivity(tenantId: string, userId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            ipAddress: string | null;
            action: string;
            entity: string;
            entityId: string | null;
            oldValues: import("@prisma/client/runtime/library").JsonValue | null;
            newValues: import("@prisma/client/runtime/library").JsonValue | null;
            userAgent: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
