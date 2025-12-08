import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataGeneratorShiftsService } from './data-generator-shifts.service';
import { GenerateShiftsDto } from './dto/generate-shifts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Data Generator - Shifts')
@Controller('data-generator/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DataGeneratorShiftsController {
  constructor(private readonly shiftsService: DataGeneratorShiftsService) {}

  @Post('generate')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Générer des shifts et les assigner aux employés',
    description: 'Crée des shifts par défaut et les assigne aux employés selon une distribution',
  })
  @ApiResponse({
    status: 201,
    description: 'Shifts générés et assignés avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  async generateShifts(@Req() req, @Body() dto: GenerateShiftsDto) {
    const tenantId = req.user.tenantId;
    return this.shiftsService.generateShifts(tenantId, dto);
  }

  @Get('stats')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Obtenir les statistiques des shifts',
    description: 'Retourne un résumé des shifts et de leur assignation',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées',
  })
  async getStats(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.shiftsService.getShiftsStats(tenantId);
  }
}

