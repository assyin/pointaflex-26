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
exports.DataGeneratorHolidaysController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const data_generator_holidays_service_1 = require("./data-generator-holidays.service");
const generate_holidays_dto_1 = require("./dto/generate-holidays.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DataGeneratorHolidaysController = class DataGeneratorHolidaysController {
    constructor(holidaysService) {
        this.holidaysService = holidaysService;
    }
    async generateHolidays(req, dto) {
        const tenantId = req.user.tenantId;
        return this.holidaysService.generateHolidays(tenantId, dto);
    }
    async getStats(req) {
        const tenantId = req.user.tenantId;
        return this.holidaysService.getHolidaysStats(tenantId);
    }
    async cleanHolidays(req) {
        const tenantId = req.user.tenantId;
        return this.holidaysService.cleanHolidays(tenantId);
    }
};
exports.DataGeneratorHolidaysController = DataGeneratorHolidaysController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer les jours fériés du Maroc',
        description: 'Génère automatiquement les jours fériés du Maroc (fixes et islamiques) pour une plage d\'années',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Jours fériés générés avec succès',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données invalides',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_holidays_dto_1.GenerateHolidaysDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorHolidaysController.prototype, "generateHolidays", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir les statistiques des jours fériés',
        description: 'Retourne un résumé des jours fériés configurés',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statistiques récupérées',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataGeneratorHolidaysController.prototype, "getStats", null);
__decorate([
    (0, common_1.Delete)('clean'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Supprimer tous les jours fériés',
        description: 'Supprime tous les jours fériés du tenant',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Jours fériés supprimés',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataGeneratorHolidaysController.prototype, "cleanHolidays", null);
exports.DataGeneratorHolidaysController = DataGeneratorHolidaysController = __decorate([
    (0, swagger_1.ApiTags)('Data Generator - Holidays'),
    (0, common_1.Controller)('data-generator/holidays'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [data_generator_holidays_service_1.DataGeneratorHolidaysService])
], DataGeneratorHolidaysController);
//# sourceMappingURL=data-generator-holidays.controller.js.map