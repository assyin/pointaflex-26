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
exports.LeavesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const leaves_service_1 = require("./leaves.service");
const create_leave_dto_1 = require("./dto/create-leave.dto");
const update_leave_dto_1 = require("./dto/update-leave.dto");
const approve_leave_dto_1 = require("./dto/approve-leave.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let LeavesController = class LeavesController {
    constructor(leavesService) {
        this.leavesService = leavesService;
    }
    create(user, dto) {
        return this.leavesService.create(user.tenantId, dto);
    }
    findAll(user, page, limit, employeeId, leaveTypeId, status, startDate, endDate) {
        return this.leavesService.findAll(user.tenantId, parseInt(page) || 1, parseInt(limit) || 20, {
            employeeId,
            leaveTypeId,
            status,
            startDate,
            endDate,
        }, user.userId, user.permissions || []);
    }
    getWorkflowConfig(user) {
        return this.leavesService.getWorkflowConfig(user.tenantId);
    }
    calculateWorkingDays(user, startDate, endDate) {
        if (!startDate || !endDate) {
            return { workingDays: 0, error: 'startDate and endDate are required' };
        }
        return this.leavesService.calculateWorkingDays(user.tenantId, new Date(startDate), new Date(endDate));
    }
    findOne(user, id) {
        return this.leavesService.findOne(user.tenantId, id);
    }
    update(user, id, dto) {
        return this.leavesService.update(user.tenantId, id, dto);
    }
    approve(user, id, dto) {
        return this.leavesService.approve(user.tenantId, id, user.userId, user.role, dto);
    }
    cancel(user, id) {
        return this.leavesService.cancel(user.tenantId, id, user.userId);
    }
    remove(user, id) {
        return this.leavesService.remove(user.tenantId, id);
    }
    async uploadDocument(user, id, file) {
        return this.leavesService.uploadDocument(user.tenantId, id, file, user.userId);
    }
    async downloadDocument(user, id, res) {
        const fileData = await this.leavesService.downloadDocument(user.tenantId, id, user.userId, user.permissions || []);
        res.setHeader('Content-Type', fileData.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
        res.send(fileData.buffer);
    }
    async deleteDocument(user, id) {
        return this.leavesService.deleteDocument(user.tenantId, id, user.userId);
    }
};
exports.LeavesController = LeavesController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.RequirePermissions)('leave.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create new leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_leave_dto_1.CreateLeaveDto]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)('leave.view_all', 'leave.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all leaves' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('employeeId')),
    __param(4, (0, common_1.Query)('leaveTypeId')),
    __param(5, (0, common_1.Query)('status')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('workflow-config'),
    (0, swagger_1.ApiOperation)({ summary: 'Get leave workflow configuration for tenant' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "getWorkflowConfig", null);
__decorate([
    (0, common_1.Get)('calculate-working-days'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate working days between two dates' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "calculateWorkingDays", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get leave by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('leave.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_leave_dto_1.UpdateLeaveDto]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('leave.approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, approve_leave_dto_1.ApproveLeaveDto]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_decorator_1.RequirePermissions)('leave.cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.RequirePermissions)('leave.delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/document'),
    (0, permissions_decorator_1.RequirePermissions)('leave.create', 'leave.update'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload document for leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)(':id/document'),
    (0, permissions_decorator_1.RequirePermissions)('leave.view_all', 'leave.view_own', 'leave.view_team'),
    (0, swagger_1.ApiOperation)({ summary: 'Download document for leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "downloadDocument", null);
__decorate([
    (0, common_1.Delete)(':id/document'),
    (0, permissions_decorator_1.RequirePermissions)('leave.update'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete document for leave request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "deleteDocument", null);
exports.LeavesController = LeavesController = __decorate([
    (0, swagger_1.ApiTags)('Leaves'),
    (0, common_1.Controller)('leaves'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [leaves_service_1.LeavesService])
], LeavesController);
//# sourceMappingURL=leaves.controller.js.map