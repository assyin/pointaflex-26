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
exports.OvertimeController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const overtime_service_1 = require("./overtime.service");
const recovery_days_service_1 = require("../recovery-days/recovery-days.service");
const create_overtime_dto_1 = require("./dto/create-overtime.dto");
const update_overtime_dto_1 = require("./dto/update-overtime.dto");
const approve_overtime_dto_1 = require("./dto/approve-overtime.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let OvertimeController = class OvertimeController {
    constructor(overtimeService, recoveryDaysService) {
        this.overtimeService = overtimeService;
        this.recoveryDaysService = recoveryDaysService;
    }
    create(user, dto) {
        return this.overtimeService.create(user.tenantId, dto);
    }
    findAll(user, page, limit, employeeId, status, startDate, endDate, isNightShift, type, siteId, departmentId) {
        return this.overtimeService.findAll(user.tenantId, parseInt(page) || 1, parseInt(limit) || 20, {
            employeeId,
            status,
            startDate,
            endDate,
            isNightShift: isNightShift ? isNightShift === 'true' : undefined,
            type,
            siteId,
            departmentId,
        }, user.userId, user.permissions || []);
    }
    getDashboardStats(user, startDate, endDate, siteId, departmentId) {
        return this.overtimeService.getDashboardStats(user.tenantId, { startDate, endDate, siteId, departmentId }, user.userId, user.permissions || []);
    }
    findOne(user, id) {
        return this.overtimeService.findOne(user.tenantId, id);
    }
    update(user, id, dto) {
        return this.overtimeService.update(user.tenantId, id, dto);
    }
    approve(user, id, dto) {
        return this.overtimeService.approve(user.tenantId, id, user.userId, dto);
    }
    convertToRecovery(user, id) {
        return this.overtimeService.convertToRecovery(user.tenantId, id);
    }
    revokeApproval(user, id, body) {
        return this.overtimeService.revokeApproval(user.tenantId, id, user.userId, body?.reason);
    }
    revokeRejection(user, id, body) {
        return this.overtimeService.revokeRejection(user.tenantId, id, user.userId, body?.reason);
    }
    updateApprovedHours(user, id, body) {
        return this.overtimeService.updateApprovedHours(user.tenantId, id, user.userId, body.approvedHours, body.reason);
    }
    getRecoveryInfo(user, id) {
        return this.overtimeService.getRecoveryInfo(user.tenantId, id);
    }
    cancelConversion(user, id, body) {
        return this.overtimeService.cancelConversion(user.tenantId, id, user.userId, body?.reason);
    }
    getBalance(user, employeeId) {
        return this.overtimeService.getBalance(user.tenantId, employeeId);
    }
    getCumulativeBalance(user, employeeId) {
        return this.recoveryDaysService.getCumulativeBalance(user.tenantId, employeeId);
    }
    remove(user, id) {
        return this.overtimeService.remove(user.tenantId, id);
    }
};
exports.OvertimeController = OvertimeController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create new overtime record' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_overtime_dto_1.CreateOvertimeDto]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all overtime records' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('employeeId')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __param(7, (0, common_1.Query)('isNightShift')),
    __param(8, (0, common_1.Query)('type')),
    __param(9, (0, common_1.Query)('siteId')),
    __param(10, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_department'),
    (0, swagger_1.ApiOperation)({ summary: 'Get overtime dashboard statistics' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('siteId')),
    __param(4, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get overtime record by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update overtime record' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_overtime_dto_1.UpdateOvertimeDto]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject overtime' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, approve_overtime_dto_1.ApproveOvertimeDto]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-recovery'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Convert overtime to recovery hours' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "convertToRecovery", null);
__decorate([
    (0, common_1.Post)(':id/revoke-approval'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Annuler l\'approbation d\'une heure supplémentaire',
        description: 'Remet une HS approuvée en statut PENDING pour reconsidération'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "revokeApproval", null);
__decorate([
    (0, common_1.Post)(':id/revoke-rejection'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Annuler le rejet d\'une heure supplémentaire',
        description: 'Remet une HS rejetée en statut PENDING pour reconsidération'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "revokeRejection", null);
__decorate([
    (0, common_1.Patch)(':id/approved-hours'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Modifier les heures approuvées',
        description: 'Permet de corriger le nombre d\'heures approuvées'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "updateApprovedHours", null);
__decorate([
    (0, common_1.Get)(':id/recovery-info'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer les informations de récupération liées',
        description: 'Retourne les jours de récupération liés à cet overtime et indique si des dates sont passées'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "getRecoveryInfo", null);
__decorate([
    (0, common_1.Post)(':id/cancel-conversion'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Annuler la conversion en récupération',
        description: 'Annule les jours de récupération liés et remet l\'overtime en APPROVED. Justification obligatoire si date passée.'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "cancelConversion", null);
__decorate([
    (0, common_1.Get)('balance/:employeeId'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get overtime balance for an employee' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('cumulative-balance/:employeeId'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get cumulative overtime balance for conversion to recovery days' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "getCumulativeBalance", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete overtime record' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OvertimeController.prototype, "remove", null);
exports.OvertimeController = OvertimeController = __decorate([
    (0, swagger_1.ApiTags)('Overtime'),
    (0, common_1.Controller)('overtime'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [overtime_service_1.OvertimeService,
        recovery_days_service_1.RecoveryDaysService])
], OvertimeController);
//# sourceMappingURL=overtime.controller.js.map