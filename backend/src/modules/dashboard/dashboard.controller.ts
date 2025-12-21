import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/employee
   * Dashboard personnel d'un employé
   */
  @Get('employee')
  async getEmployeeDashboard(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('date') dateStr?: string,
  ) {
    const tenantId = req.tenantId;
    const targetEmployeeId = employeeId || req.user.employeeId;
    const date = dateStr ? new Date(dateStr) : new Date();

    return this.dashboardService.getEmployeeDashboard(
      tenantId,
      targetEmployeeId,
      date,
    );
  }

  /**
   * GET /dashboard/team
   * Dashboard pour un manager (vue équipe)
   */
  @Get('team')
  async getTeamDashboard(
    @Req() req: any,
    @Query('managerId') managerId?: string,
    @Query('date') dateStr?: string,
  ) {
    const tenantId = req.tenantId;
    const targetManagerId = managerId || req.user.employeeId;
    const date = dateStr ? new Date(dateStr) : new Date();

    return this.dashboardService.getTeamDashboard(
      tenantId,
      targetManagerId,
      date,
    );
  }

  /**
   * GET /dashboard/department
   * Dashboard pour un département
   */
  @Get('department')
  async getDepartmentDashboard(
    @Req() req: any,
    @Query('departmentId') departmentId: string,
    @Query('date') dateStr?: string,
  ) {
    const tenantId = req.tenantId;
    const date = dateStr ? new Date(dateStr) : new Date();

    return this.dashboardService.getDepartmentDashboard(
      tenantId,
      departmentId,
      date,
    );
  }

  /**
   * GET /dashboard/site
   * Dashboard pour un site
   */
  @Get('site')
  async getSiteDashboard(
    @Req() req: any,
    @Query('siteId') siteId: string,
    @Query('date') dateStr?: string,
  ) {
    const tenantId = req.tenantId;
    const date = dateStr ? new Date(dateStr) : new Date();

    return this.dashboardService.getSiteDashboard(tenantId, siteId, date);
  }

  /**
   * GET /dashboard/tenant
   * Dashboard global du tenant (vue organisation)
   */
  @Get('tenant')
  async getTenantDashboard(
    @Req() req: any,
    @Query('date') dateStr?: string,
  ) {
    const tenantId = req.tenantId;
    const date = dateStr ? new Date(dateStr) : new Date();

    return this.dashboardService.getTenantDashboard(tenantId, date);
  }
}
