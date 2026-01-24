import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupplementaryDaysService } from './supplementary-days.service';
import { CreateSupplementaryDayDto, SupplementaryDayType } from './dto/create-supplementary-day.dto';
import { ApproveSupplementaryDayDto } from './dto/approve-supplementary-day.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OvertimeStatus } from '@prisma/client';

@ApiTags('Supplementary Days')
@Controller('supplementary-days')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class SupplementaryDaysController {
  constructor(private supplementaryDaysService: SupplementaryDaysService) {}

  @Post()
  @RequirePermissions('overtime.create')
  @ApiOperation({ summary: 'Créer un jour supplémentaire' })
  create(@CurrentUser() user: any, @Body() dto: CreateSupplementaryDayDto) {
    return this.supplementaryDaysService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Récupérer tous les jours supplémentaires' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: OvertimeStatus,
    @Query('type') type?: SupplementaryDayType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.supplementaryDaysService.findAll(
      user.tenantId,
      parseInt(page) || 1,
      parseInt(limit) || 20,
      {
        employeeId,
        status,
        type,
        startDate,
        endDate,
        siteId,
        departmentId,
      },
    );
  }

  @Get('dashboard/stats')
  @RequirePermissions('overtime.view_all', 'overtime.view_department')
  @ApiOperation({ summary: 'Statistiques du dashboard' })
  getDashboardStats(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.supplementaryDaysService.getDashboardStats(user.tenantId, {
      startDate,
      endDate,
      siteId,
      departmentId,
    });
  }

  @Get(':id')
  @RequirePermissions('overtime.view_all', 'overtime.view_own')
  @ApiOperation({ summary: 'Récupérer un jour supplémentaire par ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.supplementaryDaysService.findOne(user.tenantId, id);
  }

  @Post(':id/approve')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Approuver ou rejeter un jour supplémentaire' })
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveSupplementaryDayDto,
  ) {
    return this.supplementaryDaysService.approve(user.tenantId, id, user.userId, dto);
  }

  @Post(':id/convert-to-recovery')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Convertir en récupération' })
  convertToRecovery(@CurrentUser() user: any, @Param('id') id: string) {
    return this.supplementaryDaysService.convertToRecovery(user.tenantId, id);
  }

  @Post(':id/revoke-approval')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Annuler l\'approbation' })
  revokeApproval(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.supplementaryDaysService.revokeApproval(user.tenantId, id, user.userId, body?.reason);
  }

  @Post(':id/revoke-rejection')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Annuler le rejet (reconsidérer)' })
  revokeRejection(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.supplementaryDaysService.revokeRejection(user.tenantId, id, user.userId, body?.reason);
  }

  @Delete(':id')
  @RequirePermissions('overtime.delete')
  @ApiOperation({ summary: 'Supprimer un jour supplémentaire' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.supplementaryDaysService.remove(user.tenantId, id);
  }
}
