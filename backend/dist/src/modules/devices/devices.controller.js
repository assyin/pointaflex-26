"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesController = void 0;
const common_1 = require("@nestjs/common");
const devices_service_1 = require("./devices.service");
const create_device_dto_1 = require("./dto/create-device.dto");
const update_device_dto_1 = require("./dto/update-device.dto");
const update_ip_whitelist_dto_1 = require("./dto/update-ip-whitelist.dto");
const audit_log_filters_dto_1 = require("./dto/audit-log-filters.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
let DevicesController = class DevicesController {
    constructor(devicesService) {
        this.devicesService = devicesService;
    }
    getAuditContext(user, req) {
        return {
            userId: user.id,
            userName: user.name || user.email,
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        };
    }
    create(user, createDeviceDto, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.create(user.tenantId, createDeviceDto, context);
    }
    findAll(user, filters) {
        return this.devicesService.findAll(user.tenantId, filters);
    }
    getStats(user) {
        return this.devicesService.getStats(user.tenantId);
    }
    getAuditLogs(user, filters) {
        return this.devicesService.getAuditLogs(user.tenantId, filters);
    }
    findOne(id, user) {
        return this.devicesService.findOne(id, user.tenantId);
    }
    update(id, user, updateDeviceDto, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.update(id, user.tenantId, updateDeviceDto, context);
    }
    remove(id, user, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.remove(id, user.tenantId, context);
    }
    sync(id, user, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.syncDevice(id, user.tenantId, context);
    }
    generateApiKey(id, user, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.generateNewApiKey(id, user.tenantId, context);
    }
    rotateApiKey(id, user, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.rotateApiKey(id, user.tenantId, context);
    }
    revokeApiKey(id, user, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.revokeApiKey(id, user.tenantId, context);
    }
    updateIPWhitelist(id, user, dto, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.updateIPWhitelist(id, user.tenantId, dto.allowedIPs, dto.enforceIPWhitelist ?? false, context);
    }
    recordHeartbeat(id, user, req) {
        const clientIP = req.ip || req.socket?.remoteAddress;
        return this.devicesService.recordHeartbeat(id, user.tenantId, clientIP);
    }
    async getConnectionStatus(id, user) {
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
    activate(id, user, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.activateDevice(id, user.tenantId, context);
    }
    deactivate(id, user, req) {
        const context = this.getAuditContext(user, req);
        return this.devicesService.deactivateDevice(id, user.tenantId, context);
    }
    getDeviceAuditLogs(id, user, filters) {
        return this.devicesService.getAuditLogs(user.tenantId, { ...filters, deviceId: id });
    }
};
exports.DevicesController = DevicesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un nouveau terminal' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Terminal créé avec succès' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_device_dto_1.CreateDeviceDto, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Liste des terminaux' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des terminaux récupérée' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Statistiques des terminaux' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistiques récupérées' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Journal d\'audit des terminaux' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logs d\'audit récupérés' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, audit_log_filters_dto_1.AuditLogFiltersDto]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Détails d\'un terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails du terminal récupérés' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Modifier un terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Terminal modifié avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_device_dto_1.UpdateDeviceDto, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Terminal supprimé avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/sync'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Synchroniser un terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Synchronisation déclenchée' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "sync", null);
__decorate([
    (0, common_1.Post)(':id/api-key/generate'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Générer une nouvelle clé API pour un terminal' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Clé API générée. ATTENTION: La clé ne sera affichée qu\'une seule fois!'
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Le terminal a déjà une clé API active' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "generateApiKey", null);
__decorate([
    (0, common_1.Post)(':id/api-key/rotate'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Rotation de la clé API (génère une nouvelle clé et révoque l\'ancienne)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Nouvelle clé API générée. ATTENTION: La clé ne sera affichée qu\'une seule fois!'
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "rotateApiKey", null);
__decorate([
    (0, common_1.Post)(':id/api-key/revoke'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Révoquer la clé API du terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Clé API révoquée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "revokeApiKey", null);
__decorate([
    (0, common_1.Patch)(':id/ip-whitelist'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour la liste blanche IP du terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste blanche IP mise à jour' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_ip_whitelist_dto_1.UpdateIPWhitelistDto, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "updateIPWhitelist", null);
__decorate([
    (0, common_1.Post)(':id/heartbeat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Enregistrer un heartbeat du terminal (appelé par le terminal)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Heartbeat enregistré' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "recordHeartbeat", null);
__decorate([
    (0, common_1.Get)(':id/connection-status'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtenir le statut de connexion d\'un terminal' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statut de connexion: ONLINE, WARNING, OFFLINE ou INACTIVE'
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getConnectionStatus", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Activer un terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Terminal activé' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/deactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Désactiver un terminal' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Terminal désactivé' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Get)(':id/audit-logs'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Journal d\'audit d\'un terminal spécifique' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logs d\'audit du terminal récupérés' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Terminal non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, audit_log_filters_dto_1.AuditLogFiltersDto]),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "getDeviceAuditLogs", null);
exports.DevicesController = DevicesController = __decorate([
    (0, swagger_1.ApiTags)('Devices'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('devices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [devices_service_1.DevicesService])
], DevicesController);
//# sourceMappingURL=devices.controller.js.map