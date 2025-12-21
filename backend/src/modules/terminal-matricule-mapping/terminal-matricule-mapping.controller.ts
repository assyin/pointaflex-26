import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TerminalMatriculeMappingService } from './terminal-matricule-mapping.service';
import { MigrateMatriculeDto } from './dto/migrate-matricule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ConflictException } from '@nestjs/common';

@ApiTags('Terminal Matricule Mapping')
@Controller('terminal-matricule-mapping')
@UseGuards(JwtAuthGuard)
export class TerminalMatriculeMappingController {
  constructor(
    private readonly mappingService: TerminalMatriculeMappingService,
  ) {}

  @Get('expiring')
  @ApiOperation({
    summary: 'Récupérer les employés avec matricule temporaire expiré ou expirant',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des employés avec matricule temporaire expiré/expirant',
  })
  async getExpiringMatricules(@CurrentTenant() tenantId: string) {
    // Récupérer le délai d'expiration depuis les settings
    const prisma = (this.mappingService as any).prisma;
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { temporaryMatriculeExpiryDays: true },
    });

    const expiryDays =
      settings?.temporaryMatriculeExpiryDays || 8; // Par défaut 8 jours

    return this.mappingService.getExpiringTemporaryMatricules(
      tenantId,
      expiryDays,
    );
  }

  @Get('all')
  @ApiOperation({
    summary: 'Récupérer TOUS les employés avec matricule temporaire (même non expirés)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de tous les employés avec matricule temporaire',
  })
  async getAllTemporaryMatricules(@CurrentTenant() tenantId: string) {
    // Récupérer le délai d'expiration depuis les settings
    const prisma = (this.mappingService as any).prisma;
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { temporaryMatriculeExpiryDays: true },
    });

    const expiryDays =
      settings?.temporaryMatriculeExpiryDays || 8; // Par défaut 8 jours

    return this.mappingService.getAllTemporaryMatricules(tenantId, expiryDays);
  }

  @Patch('migrate/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Migrer un employé vers un matricule officiel',
    description:
      'Met à jour le matricule officiel d un employé tout en conservant le matricule terminal',
  })
  @ApiResponse({
    status: 200,
    description: 'Migration réussie',
  })
  @ApiResponse({
    status: 404,
    description: 'Employé non trouvé',
  })
  @ApiResponse({
    status: 409,
    description: 'Matricule officiel déjà utilisé',
  })
  async migrateToOfficialMatricule(
    @CurrentTenant() tenantId: string,
    @Param('employeeId') employeeId: string,
    @Body() dto: MigrateMatriculeDto,
  ) {
    // Vérifier que l'employé existe
    const prisma = (this.mappingService as any).prisma;
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId,
      },
    });

    if (!employee) {
      throw new ConflictException('Employé non trouvé');
    }

    // Vérifier que le matricule officiel n'existe pas déjà
    const existing = await prisma.employee.findFirst({
      where: {
        tenantId,
        matricule: dto.officialMatricule,
        id: {
          not: employeeId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Le matricule officiel "${dto.officialMatricule}" est déjà utilisé par un autre employé`,
      );
    }

    // Mettre à jour le matricule de l'employé
    await prisma.employee.update({
      where: { id: employeeId },
      data: { matricule: dto.officialMatricule },
    });

    // Mettre à jour le mapping (garder terminalMatricule inchangé)
    await this.mappingService.updateOfficialMatricule(
      employeeId,
      dto.officialMatricule,
    );

    return {
      success: true,
      message: `Matricule migré avec succès vers ${dto.officialMatricule}`,
      employee: {
        id: employeeId,
        matricule: dto.officialMatricule,
      },
    };
  }

  @Get('employee/:employeeId')
  @ApiOperation({
    summary: 'Récupérer les mappings d un employé',
  })
  async getEmployeeMappings(@Param('employeeId') employeeId: string) {
    return this.mappingService.getEmployeeMappings(employeeId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Récupérer l\'historique complet des mappings avec filtres',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des mappings',
  })
  async getMappingHistory(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('terminalMatricule') terminalMatricule?: string,
    @Query('officialMatricule') officialMatricule?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (employeeId) filters.employeeId = employeeId;
    if (terminalMatricule) filters.terminalMatricule = terminalMatricule;
    if (officialMatricule) filters.officialMatricule = officialMatricule;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    return this.mappingService.getMappingHistory(tenantId, filters);
  }
}

