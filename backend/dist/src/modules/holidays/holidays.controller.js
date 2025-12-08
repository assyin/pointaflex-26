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
exports.HolidaysController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const holidays_service_1 = require("./holidays.service");
const create_holiday_dto_1 = require("./dto/create-holiday.dto");
const update_holiday_dto_1 = require("./dto/update-holiday.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let HolidaysController = class HolidaysController {
    constructor(holidaysService) {
        this.holidaysService = holidaysService;
    }
    create(user, dto) {
        return this.holidaysService.create(user.tenantId, dto);
    }
    findAll(user, year) {
        if (!user || !user.tenantId) {
            throw new common_1.UnauthorizedException('User not authenticated or tenantId missing');
        }
        return this.holidaysService.findAll(user.tenantId, year);
    }
    findOne(user, id) {
        return this.holidaysService.findOne(user.tenantId, id);
    }
    update(user, id, dto) {
        return this.holidaysService.update(user.tenantId, id, dto);
    }
    remove(user, id) {
        return this.holidaysService.remove(user.tenantId, id);
    }
    async importCsv(user, file) {
        if (!file) {
            return {
                statusCode: common_1.HttpStatus.BAD_REQUEST,
                message: 'Aucun fichier téléchargé',
            };
        }
        if (!file.originalname.match(/\.(csv|xlsx|xls)$/)) {
            return {
                statusCode: common_1.HttpStatus.BAD_REQUEST,
                message: 'Format de fichier invalide. Seuls les fichiers CSV, XLSX et XLS sont acceptés.',
            };
        }
        const result = await this.holidaysService.importFromCsv(user.tenantId, file.buffer);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: `Import terminé: ${result.success} jour(s) férié(s) importé(s), ${result.skipped} ignoré(s)`,
            data: result,
        };
    }
};
exports.HolidaysController = HolidaysController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un nouveau jour férié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_holiday_dto_1.CreateHolidayDto]),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer tous les jours fériés' }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: false, description: 'Filtrer par année (ex: 2025)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer un jour férié par ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour un jour férié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_holiday_dto_1.UpdateHolidayDto]),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un jour férié' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('import-csv'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Importer des jours fériés depuis un fichier CSV' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HolidaysController.prototype, "importCsv", null);
exports.HolidaysController = HolidaysController = __decorate([
    (0, swagger_1.ApiTags)('Holidays'),
    (0, common_1.Controller)('holidays'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [holidays_service_1.HolidaysService])
], HolidaysController);
//# sourceMappingURL=holidays.controller.js.map