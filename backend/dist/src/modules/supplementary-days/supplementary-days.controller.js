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
exports.SupplementaryDaysController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const supplementary_days_service_1 = require("./supplementary-days.service");
const create_supplementary_day_dto_1 = require("./dto/create-supplementary-day.dto");
const approve_supplementary_day_dto_1 = require("./dto/approve-supplementary-day.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let SupplementaryDaysController = class SupplementaryDaysController {
    constructor(supplementaryDaysService) {
        this.supplementaryDaysService = supplementaryDaysService;
    }
    create(user, dto) {
        return this.supplementaryDaysService.create(user.tenantId, dto);
    }
    findAll(user, page, limit, employeeId, status, type, startDate, endDate, siteId, departmentId) {
        return this.supplementaryDaysService.findAll(user.tenantId, parseInt(page) || 1, parseInt(limit) || 20, {
            employeeId,
            status,
            type,
            startDate,
            endDate,
            siteId,
            departmentId,
        });
    }
    getDashboardStats(user, startDate, endDate, siteId, departmentId) {
        return this.supplementaryDaysService.getDashboardStats(user.tenantId, {
            startDate,
            endDate,
            siteId,
            departmentId,
        });
    }
    findOne(user, id) {
        return this.supplementaryDaysService.findOne(user.tenantId, id);
    }
    approve(user, id, dto) {
        return this.supplementaryDaysService.approve(user.tenantId, id, user.userId, dto);
    }
    convertToRecovery(user, id) {
        return this.supplementaryDaysService.convertToRecovery(user.tenantId, id);
    }
    revokeApproval(user, id, body) {
        return this.supplementaryDaysService.revokeApproval(user.tenantId, id, user.userId, body?.reason);
    }
    revokeRejection(user, id, body) {
        return this.supplementaryDaysService.revokeRejection(user.tenantId, id, user.userId, body?.reason);
    }
    remove(user, id) {
        return this.supplementaryDaysService.remove(user.tenantId, id);
    }
};
exports.SupplementaryDaysController = SupplementaryDaysController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('overtime.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un jour supplémentaire' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_supplementary_day_dto_1.CreateSupplementaryDayDto]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer tous les jours supplémentaires' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('employeeId')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('type')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __param(8, (0, common_1.Query)('siteId')),
    __param(9, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_department'),
    (0, swagger_1.ApiOperation)({ summary: 'Statistiques du dashboard' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('siteId')),
    __param(4, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer un jour supplémentaire par ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approuver ou rejeter un jour supplémentaire' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, approve_supplementary_day_dto_1.ApproveSupplementaryDayDto]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-recovery'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Convertir en récupération' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "convertToRecovery", null);
__decorate([
    (0, common_1.Post)(':id/revoke-approval'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Annuler l\'approbation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "revokeApproval", null);
__decorate([
    (0, common_1.Post)(':id/revoke-rejection'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Annuler le rejet (reconsidérer)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "revokeRejection", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un jour supplémentaire' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupplementaryDaysController.prototype, "remove", null);
exports.SupplementaryDaysController = SupplementaryDaysController = __decorate([
    (0, swagger_1.ApiTags)('Supplementary Days'),
    (0, common_1.Controller)('supplementary-days'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [supplementary_days_service_1.SupplementaryDaysService])
], SupplementaryDaysController);
//# sourceMappingURL=supplementary-days.controller.js.map