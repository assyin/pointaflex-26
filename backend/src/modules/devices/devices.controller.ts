import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { DevicesService, AuditContext } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { UpdateIPWhitelistDto } from './dto/update-ip-whitelist.dto';
import { AuditLogFiltersDto } from './dto/audit-log-filters.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LegacyRole } from '@prisma/client';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  private getAuditContext(user: any, req: Request): AuditContext {
    return {
      userId: user.id,
      userName: user.name || user.email,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  @Post()
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Créer un nouveau terminal' })
  @ApiResponse({ status: 201, description: 'Terminal créé avec succès' })
  create(
    @CurrentUser() user: any,
    @Body() createDeviceDto: CreateDeviceDto,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.create(user.tenantId, createDeviceDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des terminaux' })
  @ApiResponse({ status: 200, description: 'Liste des terminaux récupérée' })
  findAll(@CurrentUser() user: any, @Query() filters: any) {
    return this.devicesService.findAll(user.tenantId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des terminaux' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  getStats(@CurrentUser() user: any) {
    return this.devicesService.getStats(user.tenantId);
  }

  @Get('audit-logs')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Journal d\'audit des terminaux' })
  @ApiResponse({ status: 200, description: 'Logs d\'audit récupérés' })
  getAuditLogs(
    @CurrentUser() user: any,
    @Query() filters: AuditLogFiltersDto,
  ) {
    return this.devicesService.getAuditLogs(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un terminal' })
  @ApiResponse({ status: 200, description: 'Détails du terminal récupérés' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.devicesService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Modifier un terminal' })
  @ApiResponse({ status: 200, description: 'Terminal modifié avec succès' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDeviceDto: UpdateDeviceDto,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.update(id, user.tenantId, updateDeviceDto, context);
  }

  @Delete(':id')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Supprimer un terminal' })
  @ApiResponse({ status: 200, description: 'Terminal supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.remove(id, user.tenantId, context);
  }

  @Post(':id/sync')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Synchroniser un terminal' })
  @ApiResponse({ status: 200, description: 'Synchronisation déclenchée' })
  sync(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.syncDevice(id, user.tenantId, context);
  }

  // ============================================
  // API KEY MANAGEMENT ENDPOINTS
  // ============================================

  @Post(':id/api-key/generate')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Générer une nouvelle clé API pour un terminal' })
  @ApiResponse({
    status: 201,
    description: 'Clé API générée. ATTENTION: La clé ne sera affichée qu\'une seule fois!'
  })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  @ApiResponse({ status: 400, description: 'Le terminal a déjà une clé API active' })
  generateApiKey(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.generateNewApiKey(id, user.tenantId, context);
  }

  @Post(':id/api-key/rotate')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Rotation de la clé API (génère une nouvelle clé et révoque l\'ancienne)' })
  @ApiResponse({
    status: 200,
    description: 'Nouvelle clé API générée. ATTENTION: La clé ne sera affichée qu\'une seule fois!'
  })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  rotateApiKey(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.rotateApiKey(id, user.tenantId, context);
  }

  @Post(':id/api-key/revoke')
  @HttpCode(HttpStatus.OK)
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Révoquer la clé API du terminal' })
  @ApiResponse({ status: 200, description: 'Clé API révoquée avec succès' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  revokeApiKey(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.revokeApiKey(id, user.tenantId, context);
  }

  // ============================================
  // IP WHITELIST MANAGEMENT ENDPOINTS
  // ============================================

  @Patch(':id/ip-whitelist')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Mettre à jour la liste blanche IP du terminal' })
  @ApiResponse({ status: 200, description: 'Liste blanche IP mise à jour' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  updateIPWhitelist(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateIPWhitelistDto,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.updateIPWhitelist(
      id,
      user.tenantId,
      dto.allowedIPs,
      dto.enforceIPWhitelist ?? false,
      context,
    );
  }

  // ============================================
  // HEARTBEAT & MONITORING ENDPOINTS
  // ============================================

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enregistrer un heartbeat du terminal (appelé par le terminal)' })
  @ApiResponse({ status: 200, description: 'Heartbeat enregistré' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  recordHeartbeat(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIP = req.ip || req.socket?.remoteAddress;
    return this.devicesService.recordHeartbeat(id, user.tenantId, clientIP);
  }

  @Get(':id/connection-status')
  @ApiOperation({ summary: 'Obtenir le statut de connexion d\'un terminal' })
  @ApiResponse({
    status: 200,
    description: 'Statut de connexion: ONLINE, WARNING, OFFLINE ou INACTIVE'
  })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  async getConnectionStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const device = await this.devicesService.findOne(id, user.tenantId);
    const status = this.devicesService.getConnectionStatus(device);
    return {
      deviceId: id,
      status,
      lastHeartbeat: device.lastHeartbeat,
      heartbeatInterval: device.heartbeatInterval,
      isActive: device.isActive,
    };
  }

  // ============================================
  // DEVICE ACTIVATION/DEACTIVATION
  // ============================================

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Activer un terminal' })
  @ApiResponse({ status: 200, description: 'Terminal activé' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  activate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.activateDevice(id, user.tenantId, context);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Désactiver un terminal' })
  @ApiResponse({ status: 200, description: 'Terminal désactivé' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const context = this.getAuditContext(user, req);
    return this.devicesService.deactivateDevice(id, user.tenantId, context);
  }

  // ============================================
  // AUDIT LOGS FOR SPECIFIC DEVICE
  // ============================================

  @Get(':id/audit-logs')
  @Roles(LegacyRole.SUPER_ADMIN, LegacyRole.ADMIN_RH)
  @ApiOperation({ summary: 'Journal d\'audit d\'un terminal spécifique' })
  @ApiResponse({ status: 200, description: 'Logs d\'audit du terminal récupérés' })
  @ApiResponse({ status: 404, description: 'Terminal non trouvé' })
  getDeviceAuditLogs(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query() filters: AuditLogFiltersDto,
  ) {
    return this.devicesService.getAuditLogs(user.tenantId, { ...filters, deviceId: id });
  }
}
