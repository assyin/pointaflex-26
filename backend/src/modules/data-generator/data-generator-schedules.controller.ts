import { Controller, Post, Get, Delete, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataGeneratorSchedulesService } from './data-generator-schedules.service';
import { GenerateSchedulesDto } from './dto/generate-schedules.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Data Generator - Schedules')
@Controller('data-generator/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DataGeneratorSchedulesController {
  constructor(private readonly schedulesService: DataGeneratorSchedulesService) {}

  @Post('generate')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Générer des plannings',
    description: 'Génère automatiquement des plannings pour une période donnée en assignant des shifts aux employés',
  })
  @ApiResponse({
    status: 201,
    description: 'Plannings générés avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  async generateSchedules(@Req() req, @Body() dto: GenerateSchedulesDto) {
    const tenantId = req.user.tenantId;
    return this.schedulesService.generateSchedules(tenantId, dto);
  }

  @Get('stats')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Obtenir les statistiques des plannings',
    description: 'Retourne un résumé des plannings générés',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées',
  })
  async getStats(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.schedulesService.getSchedulesStats(tenantId);
  }

  @Delete('clean')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Supprimer les plannings générés',
    description: 'Supprime tous les plannings ou ceux d\'une période donnée',
  })
  @ApiResponse({
    status: 200,
    description: 'Plannings supprimés',
  })
  async cleanSchedules(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.schedulesService.cleanSchedules(tenantId, startDate, endDate);
  }
}

