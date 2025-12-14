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
exports.SiteManagersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const site_managers_service_1 = require("./site-managers.service");
const create_site_manager_dto_1 = require("./dto/create-site-manager.dto");
const update_site_manager_dto_1 = require("./dto/update-site-manager.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let SiteManagersController = class SiteManagersController {
    constructor(siteManagersService) {
        this.siteManagersService = siteManagersService;
    }
    create(user, dto) {
        return this.siteManagersService.create(user.tenantId, dto);
    }
    findAll(user, siteId, departmentId) {
        return this.siteManagersService.findAll(user.tenantId, {
            siteId,
            departmentId,
        });
    }
    findBySite(user, siteId) {
        return this.siteManagersService.findBySite(user.tenantId, siteId);
    }
    findByManager(user, managerId) {
        return this.siteManagersService.findByManager(user.tenantId, managerId);
    }
    findOne(user, id) {
        return this.siteManagersService.findOne(user.tenantId, id);
    }
    update(user, id, dto) {
        return this.siteManagersService.update(user.tenantId, id, dto);
    }
    remove(user, id) {
        return this.siteManagersService.remove(user.tenantId, id);
    }
};
exports.SiteManagersController = SiteManagersController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un nouveau manager régional (SiteManager)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_site_manager_dto_1.CreateSiteManagerDto]),
    __metadata("design:returntype", void 0)
], SiteManagersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer tous les managers régionaux' }),
    (0, swagger_1.ApiQuery)({ name: 'siteId', required: false, description: 'Filtrer par site' }),
    (0, swagger_1.ApiQuery)({ name: 'departmentId', required: false, description: 'Filtrer par département' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('siteId')),
    __param(2, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SiteManagersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-site/:siteId'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les managers régionaux d\'un site' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SiteManagersController.prototype, "findBySite", null);
__decorate([
    (0, common_1.Get)('by-manager/:managerId'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les sites gérés par un manager' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('managerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SiteManagersController.prototype, "findByManager", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer un manager régional par ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SiteManagersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour un manager régional' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_site_manager_dto_1.UpdateSiteManagerDto]),
    __metadata("design:returntype", void 0)
], SiteManagersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un manager régional' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SiteManagersController.prototype, "remove", null);
exports.SiteManagersController = SiteManagersController = __decorate([
    (0, swagger_1.ApiTags)('Site Managers'),
    (0, common_1.Controller)('site-managers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [site_managers_service_1.SiteManagersService])
], SiteManagersController);
//# sourceMappingURL=site-managers.controller.js.map