import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
export declare class DashboardService {
    private prisma;
    private cacheManager;
    constructor(prisma: PrismaService, cacheManager: Cache);
    getEmployeeDashboard(tenantId: string, employeeId: string, date: Date): Promise<unknown>;
    getTeamDashboard(tenantId: string, managerId: string, date: Date): Promise<unknown>;
    getDepartmentDashboard(tenantId: string, departmentId: string, date: Date): Promise<unknown>;
    getSiteDashboard(tenantId: string, siteId: string, date: Date): Promise<unknown>;
    getTenantDashboard(tenantId: string, date: Date): Promise<unknown>;
    invalidateTenantCache(tenantId: string): Promise<void>;
}
