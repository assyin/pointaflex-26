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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SiteManagersService } from './site-managers.service';
import { CreateSiteManagerDto } from './dto/create-site-manager.dto';
import { UpdateSiteManagerDto } from './dto/update-site-manager.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LegacyRole } from '@prisma/client';

@ApiTags('Site Managers')
@Controller('site-managers')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class SiteManagersController {
  constructor(private readonly siteManagersService: SiteManagersService) {}

  @Post()
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau manager régional (SiteManager)' })
  create(@CurrentUser() user: any, @Body() dto: CreateSiteManagerDto) {
    return this.siteManagersService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les managers régionaux' })
  @ApiQuery({ name: 'siteId', required: false, description: 'Filtrer par site' })
  @ApiQuery({ name: 'departmentId', required: false, description: 'Filtrer par département' })
  findAll(
    @CurrentUser() user: any,
    @Query('siteId') siteId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.siteManagersService.findAll(user.tenantId, {
      siteId,
      departmentId,
    });
  }

  @Get('by-site/:siteId')
  @ApiOperation({ summary: 'Récupérer les managers régionaux d\'un site' })
  findBySite(@CurrentUser() user: any, @Param('siteId') siteId: string) {
    return this.siteManagersService.findBySite(user.tenantId, siteId);
  }

  @Get('by-manager/:managerId')
  @ApiOperation({ summary: 'Récupérer les sites gérés par un manager' })
  findByManager(@CurrentUser() user: any, @Param('managerId') managerId: string) {
    return this.siteManagersService.findByManager(user.tenantId, managerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un manager régional par ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.siteManagersService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un manager régional' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSiteManagerDto,
  ) {
    return this.siteManagersService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(LegacyRole.ADMIN_RH, LegacyRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un manager régional' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.siteManagersService.remove(user.tenantId, id);
  }
}
