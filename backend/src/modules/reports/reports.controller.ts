import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ExportService } from './services/export.service';
import { DashboardStatsQueryDto } from './dto/dashboard-stats.dto';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { OvertimeReportDto } from './dto/overtime-report.dto';
import { AbsencesReportDto } from './dto/absences-report.dto';
import { PayrollReportDto } from './dto/payroll-report.dto';
import { PlanningReportDto } from './dto/planning-report.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LegacyRole } from '@prisma/client';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private exportService: ExportService,
  ) {}

  @Get('dashboard')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER, LegacyRole.SUPER_ADMIN, LegacyRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get dashboard statistics (supports scope: personal, team, tenant, platform)' })
  getDashboardStats(
    @CurrentUser() user: any,
    @Query() query: DashboardStatsQueryDto,
  ) {
    return this.reportsService.getDashboardStats(
      user.tenantId,
      query,
      user.userId,
      user.role,
    );
  }

  @Get('attendance')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get attendance report' })
  getAttendanceReport(
    @CurrentUser() user: any,
    @Query() dto: AttendanceReportDto,
  ) {
    return this.reportsService.getAttendanceReport(user.tenantId, dto);
  }

  @Get('employee/:id')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get employee report' })
  getEmployeeReport(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getEmployeeReport(user.tenantId, id, startDate, endDate);
  }

  @Get('team/:id')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get team report' })
  getTeamReport(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTeamReport(user.tenantId, id, startDate, endDate);
  }

  @Get('overtime')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get overtime report' })
  getOvertimeReport(
    @CurrentUser() user: any,
    @Query() dto: OvertimeReportDto,
  ) {
    return this.reportsService.getOvertimeReport(user.tenantId, dto);
  }

  @Get('supplementary-days')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get supplementary days report (weekend/holiday work)' })
  getSupplementaryDaysReport(
    @CurrentUser() user: any,
    @Query() dto: OvertimeReportDto,
  ) {
    return this.reportsService.getSupplementaryDaysReport(user.tenantId, dto);
  }

  @Get('absences')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get absences and lateness report' })
  getAbsencesReport(
    @CurrentUser() user: any,
    @Query() dto: AbsencesReportDto,
  ) {
    return this.reportsService.getAbsencesReport(user.tenantId, dto);
  }

  @Get('payroll')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get payroll export report' })
  getPayrollReport(
    @CurrentUser() user: any,
    @Query() dto: PayrollReportDto,
  ) {
    return this.reportsService.getPayrollReport(user.tenantId, dto);
  }

  @Post(':type/export')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Export report in PDF, Excel or CSV format' })
  async exportReport(
    @CurrentUser() user: any,
    @Param('type') type: string,
    @Body() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    await this.exportService.exportReport(
      user.tenantId,
      user.userId,
      type,
      dto,
      res,
    );
  }

  @Get('planning')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get planning/shifts report' })
  getPlanningReport(
    @CurrentUser() user: any,
    @Query() dto: PlanningReportDto,
  ) {
    return this.reportsService.getPlanningReport(user.tenantId, dto);
  }

  @Get('history')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Get report generation history' })
  getReportHistory(@CurrentUser() user: any) {
    return this.reportsService.getReportHistory(user.tenantId, user.userId);
  }

  @Get('history/:id/download')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Download a report from history' })
  async downloadReportFromHistory(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.exportService.downloadReportFromHistory(user.tenantId, user.userId, id, res);
  }
}