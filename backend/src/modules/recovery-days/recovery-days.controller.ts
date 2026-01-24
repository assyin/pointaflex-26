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
  ConvertFlexibleDto,
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

  @Post('convert-flexible')
  @RequirePermissions('overtime.approve')
  @ApiOperation({
    summary: 'Conversion flexible des heures supplémentaires en journées de récupération',
    description:
      'Permet au manager de sélectionner ligne par ligne quelles heures convertir. ' +
      'Les heures non sélectionnées restent APPROVED (payables). ' +
      'Options: autoApprove pour approbation directe si manager, allowPastDate pour régularisation.',
  })
  convertFlexible(
    @CurrentUser() user: any,
    @Body() dto: ConvertFlexibleDto,
  ) {
    return this.recoveryDaysService.convertFlexible(
      user.tenantId,
      user.userId,
      dto,
      user.permissions || [],
    );
  }

  // ============================================
  // CONVERSION JOURS SUPPLÉMENTAIRES
  // ============================================

  @Get('supplementary-days-balance/:employeeId')
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Get cumulative supplementary days balance for conversion' })
  getCumulativeSupplementaryDaysBalance(
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
  ) {
    return this.recoveryDaysService.getCumulativeSupplementaryDaysBalance(user.tenantId, employeeId);
  }

  @Post('convert-from-supplementary-days')
  @RequirePermissions('overtime.approve')
  @ApiOperation({
    summary: 'Conversion des jours supplémentaires en journées de récupération',
    description:
      'Permet de convertir des jours supplémentaires (weekend/férié) en jours de récupération. ' +
      'Même logique que pour les heures supplémentaires.',
  })
  convertFromSupplementaryDays(
    @CurrentUser() user: any,
    @Body() dto: {
      employeeId: string;
      supplementaryDayIds: string[];
      startDate: string;
      endDate: string;
      days: number;
      autoApprove?: boolean;
      allowPastDate?: boolean;
      notes?: string;
    },
  ) {
    return this.recoveryDaysService.convertSupplementaryDaysFlexible(
      user.tenantId,
      user.userId,
      dto,
      user.permissions || [],
    );
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
