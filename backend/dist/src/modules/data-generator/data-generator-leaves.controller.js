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
exports.DataGeneratorLeavesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const data_generator_leaves_service_1 = require("./data-generator-leaves.service");
const generate_leaves_dto_1 = require("./dto/generate-leaves.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DataGeneratorLeavesController = class DataGeneratorLeavesController {
    constructor(leavesService) {
        this.leavesService = leavesService;
    }
    async generateLeaves(req, dto) {
        const tenantId = req.user.tenantId;
        return this.leavesService.generateLeaves(tenantId, dto);
    }
    async getStats(req) {
        const tenantId = req.user.tenantId;
        return this.leavesService.getLeavesStats(tenantId);
    }
};
exports.DataGeneratorLeavesController = DataGeneratorLeavesController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer des congés pour les employés',
        description: 'Génère automatiquement des congés pour un pourcentage d\'employés selon une distribution',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Congés générés avec succès',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données invalides',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_leaves_dto_1.GenerateLeavesDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorLeavesController.prototype, "generateLeaves", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir les statistiques des congés',
        description: 'Retourne un résumé des congés générés',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statistiques récupérées',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataGeneratorLeavesController.prototype, "getStats", null);
exports.DataGeneratorLeavesController = DataGeneratorLeavesController = __decorate([
    (0, swagger_1.ApiTags)('Data Generator - Leaves'),
    (0, common_1.Controller)('data-generator/leaves'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [data_generator_leaves_service_1.DataGeneratorLeavesService])
], DataGeneratorLeavesController);
//# sourceMappingURL=data-generator-leaves.controller.js.map