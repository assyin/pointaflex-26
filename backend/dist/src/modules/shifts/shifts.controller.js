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
exports.ShiftsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const shifts_service_1 = require("./shifts.service");
const create_shift_dto_1 = require("./dto/create-shift.dto");
const update_shift_dto_1 = require("./dto/update-shift.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let ShiftsController = class ShiftsController {
    constructor(shiftsService) {
        this.shiftsService = shiftsService;
    }
    create(user, dto) {
        return this.shiftsService.create(user.tenantId, dto);
    }
    findAll(user, page, limit, search, isNightShift) {
        return this.shiftsService.findAll(user.tenantId, parseInt(page) || 1, parseInt(limit) || 20, {
            search,
            isNightShift: isNightShift ? isNightShift === 'true' : undefined,
        });
    }
    findOne(user, id) {
        return this.shiftsService.findOne(user.tenantId, id);
    }
    getUsage(user, id) {
        return this.shiftsService.getShiftUsage(user.tenantId, id);
    }
    update(user, id, dto) {
        return this.shiftsService.update(user.tenantId, id, dto);
    }
    remove(user, id) {
        return this.shiftsService.remove(user.tenantId, id);
    }
};
exports.ShiftsController = ShiftsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create new shift' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_shift_dto_1.CreateShiftDto]),
    __metadata("design:returntype", void 0)
], ShiftsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all shifts' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('isNightShift')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ShiftsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get shift by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShiftsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/usage'),
    (0, swagger_1.ApiOperation)({ summary: 'Get shift usage statistics' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShiftsController.prototype, "getUsage", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update shift' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_shift_dto_1.UpdateShiftDto]),
    __metadata("design:returntype", void 0)
], ShiftsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH),
    (0, swagger_1.ApiOperation)({ summary: 'Delete shift' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShiftsController.prototype, "remove", null);
exports.ShiftsController = ShiftsController = __decorate([
    (0, swagger_1.ApiTags)('Shifts'),
    (0, common_1.Controller)('shifts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [shifts_service_1.ShiftsService])
], ShiftsController);
//# sourceMappingURL=shifts.controller.js.map