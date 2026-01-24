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
exports.RecoveryDaysController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const recovery_days_service_1 = require("./recovery-days.service");
const create_recovery_day_dto_1 = require("./dto/create-recovery-day.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let RecoveryDaysController = class RecoveryDaysController {
    constructor(recoveryDaysService) {
        this.recoveryDaysService = recoveryDaysService;
    }
    getCumulativeBalance(user, employeeId) {
        return this.recoveryDaysService.getCumulativeBalance(user.tenantId, employeeId);
    }
    convertFromOvertime(user, dto) {
        return this.recoveryDaysService.convertFromOvertime(user.tenantId, user.userId, dto);
    }
    convertFlexible(user, dto) {
        return this.recoveryDaysService.convertFlexible(user.tenantId, user.userId, dto, user.permissions || []);
    }
    getCumulativeSupplementaryDaysBalance(user, employeeId) {
        return this.recoveryDaysService.getCumulativeSupplementaryDaysBalance(user.tenantId, employeeId);
    }
    convertFromSupplementaryDays(user, dto) {
        return this.recoveryDaysService.convertSupplementaryDaysFlexible(user.tenantId, user.userId, dto, user.permissions || []);
    }
    create(user, dto) {
        return this.recoveryDaysService.create(user.tenantId, dto);
    }
    findAll(user, page, limit, employeeId, status, startDate, endDate) {
        return this.recoveryDaysService.findAll(user.tenantId, parseInt(page) || 1, parseInt(limit) || 20, {
            employeeId,
            status,
            startDate,
            endDate,
        }, user.userId, user.permissions || []);
    }
    findOne(user, id) {
        return this.recoveryDaysService.findOne(user.tenantId, id);
    }
    update(user, id, dto) {
        return this.recoveryDaysService.update(user.tenantId, id, dto);
    }
    approve(user, id) {
        return this.recoveryDaysService.approve(user.tenantId, id, user.userId);
    }
    cancel(user, id) {
        return this.recoveryDaysService.cancel(user.tenantId, id);
    }
    getEmployeeRecoveryDays(user, employeeId, startDate, endDate) {
        return this.recoveryDaysService.getEmployeeRecoveryDays(user.tenantId, employeeId, startDate, endDate);
    }
    getEmployeeBalance(user, employeeId) {
        return this.recoveryDaysService.getEmployeeBalance(user.tenantId, employeeId);
    }
};
exports.RecoveryDaysController = RecoveryDaysController;
__decorate([
    (0, common_1.Get)('cumulative-balance/:employeeId'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get cumulative overtime balance for an employee' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "getCumulativeBalance", null);
__decorate([
    (0, common_1.Post)('convert-from-overtime'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Convert cumulative overtime hours to recovery days' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_recovery_day_dto_1.ConvertOvertimeToRecoveryDayDto]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "convertFromOvertime", null);
__decorate([
    (0, common_1.Post)('convert-flexible'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Conversion flexible des heures supplémentaires en journées de récupération',
        description: 'Permet au manager de sélectionner ligne par ligne quelles heures convertir. ' +
            'Les heures non sélectionnées restent APPROVED (payables). ' +
            'Options: autoApprove pour approbation directe si manager, allowPastDate pour régularisation.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_recovery_day_dto_1.ConvertFlexibleDto]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "convertFlexible", null);
__decorate([
    (0, common_1.Get)('supplementary-days-balance/:employeeId'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get cumulative supplementary days balance for conversion' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "getCumulativeSupplementaryDaysBalance", null);
__decorate([
    (0, common_1.Post)('convert-from-supplementary-days'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Conversion des jours supplémentaires en journées de récupération',
        description: 'Permet de convertir des jours supplémentaires (weekend/férié) en jours de récupération. ' +
            'Même logique que pour les heures supplémentaires.',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "convertFromSupplementaryDays", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a manual recovery day' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_recovery_day_dto_1.CreateRecoveryDayDto]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all recovery days' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('employeeId')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get recovery day by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Update recovery day' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_recovery_day_dto_1.UpdateRecoveryDayDto]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve recovery day' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel recovery day (returns hours to balance)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all recovery days for an employee' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "getEmployeeRecoveryDays", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId/balance'),
    (0, permissions_decorator_1.RequirePermissions)('overtime.view_all', 'overtime.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get recovery days balance and history for an employee' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecoveryDaysController.prototype, "getEmployeeBalance", null);
exports.RecoveryDaysController = RecoveryDaysController = __decorate([
    (0, swagger_1.ApiTags)('Recovery Days'),
    (0, common_1.Controller)('recovery-days'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [recovery_days_service_1.RecoveryDaysService])
], RecoveryDaysController);
//# sourceMappingURL=recovery-days.controller.js.map