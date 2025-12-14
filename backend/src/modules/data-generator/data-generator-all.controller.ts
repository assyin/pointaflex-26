import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Logger, InternalServerErrorException } from '@nestjs/common';
import { LegacyRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { DataGeneratorCleanupService } from './data-generator-cleanup.service';
import { GenerateAllDataDto } from './dto/generate-all-data.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Data Generator - All')
@Controller('data-generator/all')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DataGeneratorAllController {
  private readonly logger = new Logger(DataGeneratorAllController.name);

  constructor(
    private readonly orchestratorService: DataGeneratorOrchestratorService,
    private readonly cleanupService: DataGeneratorCleanupService,
  ) {}

  @Post('generate')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Générer toutes les données selon la configuration' })
  @ApiResponse({ status: 200, description: 'Génération complète terminée avec succès' })
  @ApiResponse({ status: 400, description: 'Configuration invalide' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 500, description: 'Erreur serveur' })
  async generateAll(
    @CurrentTenant() tenantId: string,
    @Body() dto: GenerateAllDataDto,
  ) {
    try {
      return await this.orchestratorService.generateAll(tenantId, dto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`❌ Erreur lors de la génération pour tenant ${tenantId}: ${errorMessage}`, errorStack);
      
      // Si l'erreur est déjà une HttpException, la relancer
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }
      
      // Sinon, créer une InternalServerErrorException avec le message
      throw new InternalServerErrorException({
        message: 'Erreur lors de la génération des données',
        error: errorMessage,
        tenantId,
      });
    }
  }

  @Post('cleanup')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nettoyer toutes les données générées' })
  @ApiResponse({ status: 200, description: 'Nettoyage terminé avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async cleanupAll(@CurrentTenant() tenantId: string) {
    return this.cleanupService.cleanupAll(tenantId);
  }
}

