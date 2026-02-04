import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { LeavesService } from './leaves.service';
import { LeaveBalanceService } from './services/leave-balance.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LegacyRole, LeaveStatus } from '@prisma/client';

@ApiTags('Leaves')
@Controller('leaves')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class LeavesController {
  constructor(
    private leavesService: LeavesService,
    private leaveBalanceService: LeaveBalanceService,
  ) {}

  @Post()
  @RequirePermissions('leave.create')
  @ApiOperation({ summary: 'Create new leave request' })
  create(@CurrentUser() user: any, @Body() dto: CreateLeaveDto) {
    return this.leavesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('leave.view_all', 'leave.view_own')
  @ApiOperation({ summary: 'Get all leaves' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leavesService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      {
        employeeId,
        leaveTypeId,
        status,
        startDate,
        endDate,
      },
      user.userId,
      user.permissions || [],
    );
  }

  @Get('workflow-config')
  @ApiOperation({ summary: 'Get leave workflow configuration for tenant' })
  getWorkflowConfig(@CurrentUser() user: any) {
    return this.leavesService.getWorkflowConfig(user.tenantId);
  }

  @Get('calculate-working-days')
  @ApiOperation({ summary: 'Calculate working days between two dates (with optional employee schedule check)' })
  calculateWorkingDays(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('employeeId') employeeId?: string, // NOUVEAU: Pour vérifier le planning personnalisé
  ) {
    if (!startDate || !endDate) {
      return { workingDays: 0, error: 'startDate and endDate are required' };
    }
    return this.leavesService.calculateWorkingDays(
      user.tenantId,
      new Date(startDate),
      new Date(endDate),
      employeeId, // NOUVEAU: Passer l'employeeId pour le calcul personnalisé
    );
  }

  // ============================================
  // ENDPOINTS SOLDE DE CONGÉS
  // ============================================

  @Get('balance/all')
  @RequirePermissions('leave.view_all')
  @ApiOperation({ summary: 'Get leave balances for all employees (for report)' })
  async getAllBalances(
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teamId') teamId?: string,
  ) {
    console.log('[LeaveBalance] getAllBalances called with:', {
      tenantId: user.tenantId,
      year: year ? parseInt(year) : 'current',
      filters: { siteId, departmentId, teamId },
    });
    try {
      const result = await this.leaveBalanceService.getAllBalances(
        user.tenantId,
        year ? parseInt(year) : undefined,
        { siteId, departmentId, teamId },
      );
      console.log('[LeaveBalance] Returning', result.length, 'employees');
      return result;
    } catch (error) {
      console.error('[LeaveBalance] Error:', error);
      throw error;
    }
  }

  @Get('balance/:employeeId')
  @RequirePermissions('leave.view_all', 'leave.view_own')
  @ApiOperation({ summary: 'Get leave balance for a specific employee' })
  getEmployeeBalance(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    return this.leaveBalanceService.calculateBalance(
      user.tenantId,
      employeeId,
      year ? parseInt(year) : undefined,
    );
  }

  @Get('balance/:employeeId/quick')
  @RequirePermissions('leave.view_all', 'leave.view_own', 'leave.create')
  @ApiOperation({ summary: 'Get quick leave balance summary (for modal display)' })
  getQuickBalance(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    return this.leaveBalanceService.getQuickBalance(
      user.tenantId,
      employeeId,
      year ? parseInt(year) : undefined,
    );
  }

  @Patch('balance/:employeeId/quota')
  @RequirePermissions('leave.update', 'employee.update')
  @ApiOperation({ summary: 'Update employee leave quota' })
  updateEmployeeQuota(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Body() body: { quota: number | null },
  ) {
    return this.leaveBalanceService.updateEmployeeQuota(
      user.tenantId,
      employeeId,
      body.quota,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leavesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('leave.update')
  @ApiOperation({ summary: 'Update leave request' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveDto,
  ) {
    return this.leavesService.update(user.tenantId, id, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('leave.approve')
  @ApiOperation({ summary: 'Approve or reject leave request' })
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    return this.leavesService.approve(
      user.tenantId,
      id,
      user.userId,
      user.role,
      dto,
    );
  }

  @Post(':id/cancel')
  @RequirePermissions('leave.cancel')
  @ApiOperation({ summary: 'Cancel leave request' })
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leavesService.cancel(user.tenantId, id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('leave.delete')
  @ApiOperation({ summary: 'Delete leave request' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leavesService.remove(user.tenantId, id);
  }

  @Post(':id/document')
  @RequirePermissions('leave.create', 'leave.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document for leave request' })
  async uploadDocument(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.leavesService.uploadDocument(
      user.tenantId,
      id,
      file,
      user.userId,
    );
  }

  @Get(':id/document')
  @RequirePermissions('leave.view_all', 'leave.view_own', 'leave.view_team')
  @ApiOperation({ summary: 'Download document for leave request' })
  async downloadDocument(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileData = await this.leavesService.downloadDocument(
      user.tenantId,
      id,
      user.userId,
      user.permissions || [],
    );

    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileData.fileName}"`,
    );
    res.send(fileData.buffer);
  }

  @Delete(':id/document')
  @RequirePermissions('leave.update')
  @ApiOperation({ summary: 'Delete document for leave request' })
  async deleteDocument(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.leavesService.deleteDocument(
      user.tenantId,
      id,
      user.userId,
    );
  }
}