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
exports.DataGeneratorShiftsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const data_generator_shifts_service_1 = require("./data-generator-shifts.service");
const generate_shifts_dto_1 = require("./dto/generate-shifts.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DataGeneratorShiftsController = class DataGeneratorShiftsController {
    constructor(shiftsService) {
        this.shiftsService = shiftsService;
    }
    async generateShifts(req, dto) {
        const tenantId = req.user.tenantId;
        return this.shiftsService.generateShifts(tenantId, dto);
    }
    async getStats(req) {
        const tenantId = req.user.tenantId;
        return this.shiftsService.getShiftsStats(tenantId);
    }
};
exports.DataGeneratorShiftsController = DataGeneratorShiftsController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer des shifts et les assigner aux employés',
        description: 'Crée des shifts par défaut et les assigne aux employés selon une distribution',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Shifts générés et assignés avec succès',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données invalides',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_shifts_dto_1.GenerateShiftsDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorShiftsController.prototype, "generateShifts", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir les statistiques des shifts',
        description: 'Retourne un résumé des shifts et de leur assignation',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statistiques récupérées',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataGeneratorShiftsController.prototype, "getStats", null);
exports.DataGeneratorShiftsController = DataGeneratorShiftsController = __decorate([
    (0, swagger_1.ApiTags)('Data Generator - Shifts'),
    (0, common_1.Controller)('data-generator/shifts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [data_generator_shifts_service_1.DataGeneratorShiftsService])
], DataGeneratorShiftsController);
//# sourceMappingURL=data-generator-shifts.controller.js.map