import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Sites')
@Controller('sites')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau site' })
  create(@CurrentUser() user: any, @Body() dto: CreateSiteDto) {
    return this.sitesService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les sites' })
  findAll(@CurrentUser() user: any) {
    if (!user || !user.tenantId) {
      throw new UnauthorizedException('User not authenticated or tenantId missing');
    }
    return this.sitesService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un site par ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sitesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un site' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
  ) {
    return this.sitesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_RH, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un site' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sitesService.remove(user.tenantId, id);
  }
}
