import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getEmployeeDashboard(req: any, employeeId?: string, dateStr?: string): Promise<unknown>;
    getTeamDashboard(req: any, managerId?: string, dateStr?: string): Promise<unknown>;
    getDepartmentDashboard(req: any, departmentId: string, dateStr?: string): Promise<unknown>;
    getSiteDashboard(req: any, siteId: string, dateStr?: string): Promise<unknown>;
    getTenantDashboard(req: any, dateStr?: string): Promise<unknown>;
}
