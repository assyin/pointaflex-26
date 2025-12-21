import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecoveryDaysService } from './recovery-days.service';
import {
  CreateRecoveryDayDto,
  ConvertOvertimeToRecoveryDayDto,
  UpdateRecoveryDayDto,
  ApproveRecoveryDayDto,
} from './dto/create-recovery-day.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LegacyRole, RecoveryDayStatus } from '@prisma/client';

@ApiTags('Recovery Days')
@Controller('recovery-days')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class RecoveryDaysController {
  constructor(private recoveryDaysService: RecoveryDaysService) {}

  @Get('cumulative-balance/:employeeId')
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Get cumulative overtime balance for an employee' })
  getCumulativeBalance(@CurrentUser() user: any, @Param('employeeId') employeeId: string) {
    return this.recoveryDaysService.getCumulativeBalance(user.tenantId, employeeId);
  }

  @Post('convert-from-overtime')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Convert cumulative overtime hours to recovery days' })
  convertFromOvertime(
    @CurrentUser() user: any,
    @Body() dto: ConvertOvertimeToRecoveryDayDto,
  ) {
    return this.recoveryDaysService.convertFromOvertime(user.tenantId, user.userId, dto);
  }

  @Post()
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Create a manual recovery day' })
  create(@CurrentUser() user: any, @Body() dto: CreateRecoveryDayDto) {
    return this.recoveryDaysService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Get all recovery days' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: RecoveryDayStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.recoveryDaysService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      {
        employeeId,
        status,
        startDate,
        endDate,
      },
      user.userId,
      user.permissions || [],
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recovery day by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recoveryDaysService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Update recovery day' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecoveryDayDto,
  ) {
    return this.recoveryDaysService.update(user.tenantId, id, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Approve recovery day' })
  approve(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recoveryDaysService.approve(user.tenantId, id, user.userId);
  }

  @Post(':id/cancel')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Cancel recovery day (returns hours to balance)' })
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.recoveryDaysService.cancel(user.tenantId, id);
  }

  @Get('employee/:employeeId')
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Get all recovery days for an employee' })
  getEmployeeRecoveryDays(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.recoveryDaysService.getEmployeeRecoveryDays(
      user.tenantId,
      employeeId,
      startDate,
      endDate,
    );
  }

  @Get('employee/:employeeId/balance')
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Get recovery days balance and history for an employee' })
  getEmployeeBalance(@CurrentUser() user: any, @Param('employeeId') employeeId: string) {
    return this.recoveryDaysService.getEmployeeBalance(user.tenantId, employeeId);
  }
}
