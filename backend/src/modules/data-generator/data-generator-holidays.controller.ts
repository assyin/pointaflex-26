import { Controller, Post, Get, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataGeneratorHolidaysService } from './data-generator-holidays.service';
import { GenerateHolidaysDto } from './dto/generate-holidays.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Data Generator - Holidays')
@Controller('data-generator/holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DataGeneratorHolidaysController {
  constructor(private readonly holidaysService: DataGeneratorHolidaysService) {}

  @Post('generate')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Générer les jours fériés du Maroc',
    description: 'Génère automatiquement les jours fériés du Maroc (fixes et islamiques) pour une plage d\'années',
  })
  @ApiResponse({
    status: 201,
    description: 'Jours fériés générés avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  async generateHolidays(@Req() req, @Body() dto: GenerateHolidaysDto) {
    const tenantId = req.user.tenantId;
    return this.holidaysService.generateHolidays(tenantId, dto);
  }

  @Get('stats')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Obtenir les statistiques des jours fériés',
    description: 'Retourne un résumé des jours fériés configurés',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées',
  })
  async getStats(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.holidaysService.getHolidaysStats(tenantId);
  }

  @Delete('clean')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Supprimer tous les jours fériés',
    description: 'Supprime tous les jours fériés du tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Jours fériés supprimés',
  })
  async cleanHolidays(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.holidaysService.cleanHolidays(tenantId);
  }
}

