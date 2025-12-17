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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { ApproveOvertimeDto } from './dto/approve-overtime.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LegacyRole, OvertimeStatus } from '@prisma/client';

@ApiTags('Overtime')
@Controller('overtime')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class OvertimeController {
  constructor(private overtimeService: OvertimeService) {}

  @Post()
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Create new overtime record' })
  create(@CurrentUser() user: any, @Body() dto: CreateOvertimeDto) {
    return this.overtimeService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Get all overtime records' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: OvertimeStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isNightShift') isNightShift?: string,
    @Query('type') type?: string,
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.overtimeService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      {
        employeeId,
        status,
        startDate,
        endDate,
        isNightShift: isNightShift ? isNightShift === 'true' : undefined,
        type,
        siteId,
        departmentId,
      },
      user.userId,
      user.permissions || [],
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get overtime record by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.overtimeService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.MANAGER)
  @ApiOperation({ summary: 'Update overtime record' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateOvertimeDto,
  ) {
    return this.overtimeService.update(user.tenantId, id, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Approve or reject overtime' })
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveOvertimeDto,
  ) {
    return this.overtimeService.approve(user.tenantId, id, user.userId, dto);
  }

  @Post(':id/convert-to-recovery')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Convert overtime to recovery hours' })
  convertToRecovery(@CurrentUser() user: any, @Param('id') id: string) {
    return this.overtimeService.convertToRecovery(user.tenantId, id);
  }

  @Get('balance/:employeeId')
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Get overtime balance for an employee' })
  getBalance(@CurrentUser() user: any, @Param('employeeId') employeeId: string) {
    return this.overtimeService.getBalance(user.tenantId, employeeId);
  }

  @Delete(':id')
  @RequirePermissions('overtime.delete')
  @ApiOperation({ summary: 'Delete overtime record' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.overtimeService.remove(user.tenantId, id);
  }
}