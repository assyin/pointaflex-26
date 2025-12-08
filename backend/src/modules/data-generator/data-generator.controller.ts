import { Controller, Post, Get, Delete, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataGeneratorService } from './data-generator.service';
import { GenerateSingleAttendanceDto } from './dto/generate-single-attendance.dto';
import { GenerateBulkAttendanceDto } from './dto/generate-bulk-attendance.dto';
import { CleanGeneratedDataDto } from './dto/clean-generated-data.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Data Generator')
@Controller('data-generator')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DataGeneratorController {
  constructor(private readonly dataGeneratorService: DataGeneratorService) {}

  @Post('attendance/single')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Générer des pointages pour un employé pour une journée',
    description: 'Génère des pointages virtuels selon un scénario spécifique pour tester le système',
  })
  @ApiResponse({
    status: 201,
    description: 'Pointages générés avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  async generateSingle(@Req() req, @Body() dto: GenerateSingleAttendanceDto) {
    const tenantId = req.user.tenantId;
    return this.dataGeneratorService.generateSingleDay(tenantId, dto);
  }

  @Post('attendance/bulk')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Générer en masse des pointages pour plusieurs employés',
    description: 'Génère des pointages virtuels pour une période donnée avec une distribution de scénarios',
  })
  @ApiResponse({
    status: 201,
    description: 'Pointages générés avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou distribution incorrecte',
  })
  async generateBulk(@Req() req, @Body() dto: GenerateBulkAttendanceDto) {
    const tenantId = req.user.tenantId;
    return this.dataGeneratorService.generateBulk(tenantId, dto);
  }

  @Delete('attendance/clean')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer les données générées',
    description: 'Supprime tous ou une partie des pointages générés virtuellement',
  })
  @ApiResponse({
    status: 200,
    description: 'Données supprimées avec succès',
  })
  async cleanData(@Req() req, @Body() dto: CleanGeneratedDataDto) {
    const tenantId = req.user.tenantId;
    return this.dataGeneratorService.cleanGeneratedData(tenantId, dto);
  }

  @Get('stats')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Obtenir les statistiques des données générées',
    description: 'Retourne un résumé des pointages virtuels générés',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées',
  })
  async getStats(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.dataGeneratorService.getStats(tenantId);
  }
}
