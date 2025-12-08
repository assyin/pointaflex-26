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
exports.DataGeneratorSchedulesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const data_generator_schedules_service_1 = require("./data-generator-schedules.service");
const generate_schedules_dto_1 = require("./dto/generate-schedules.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DataGeneratorSchedulesController = class DataGeneratorSchedulesController {
    constructor(schedulesService) {
        this.schedulesService = schedulesService;
    }
    async generateSchedules(req, dto) {
        const tenantId = req.user.tenantId;
        return this.schedulesService.generateSchedules(tenantId, dto);
    }
    async getStats(req) {
        const tenantId = req.user.tenantId;
        return this.schedulesService.getSchedulesStats(tenantId);
    }
    async cleanSchedules(req, startDate, endDate) {
        const tenantId = req.user.tenantId;
        return this.schedulesService.cleanSchedules(tenantId, startDate, endDate);
    }
};
exports.DataGeneratorSchedulesController = DataGeneratorSchedulesController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer des plannings',
        description: 'Génère automatiquement des plannings pour une période donnée en assignant des shifts aux employés',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Plannings générés avec succès',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données invalides',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_schedules_dto_1.GenerateSchedulesDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorSchedulesController.prototype, "generateSchedules", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir les statistiques des plannings',
        description: 'Retourne un résumé des plannings générés',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statistiques récupérées',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataGeneratorSchedulesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Delete)('clean'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Supprimer les plannings générés',
        description: 'Supprime tous les plannings ou ceux d\'une période donnée',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Plannings supprimés',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DataGeneratorSchedulesController.prototype, "cleanSchedules", null);
exports.DataGeneratorSchedulesController = DataGeneratorSchedulesController = __decorate([
    (0, swagger_1.ApiTags)('Data Generator - Schedules'),
    (0, common_1.Controller)('data-generator/schedules'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [data_generator_schedules_service_1.DataGeneratorSchedulesService])
], DataGeneratorSchedulesController);
//# sourceMappingURL=data-generator-schedules.controller.js.map