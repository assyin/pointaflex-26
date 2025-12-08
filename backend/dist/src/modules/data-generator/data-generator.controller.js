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
exports.DataGeneratorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const data_generator_service_1 = require("./data-generator.service");
const generate_single_attendance_dto_1 = require("./dto/generate-single-attendance.dto");
const generate_bulk_attendance_dto_1 = require("./dto/generate-bulk-attendance.dto");
const clean_generated_data_dto_1 = require("./dto/clean-generated-data.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DataGeneratorController = class DataGeneratorController {
    constructor(dataGeneratorService) {
        this.dataGeneratorService = dataGeneratorService;
    }
    async generateSingle(req, dto) {
        const tenantId = req.user.tenantId;
        return this.dataGeneratorService.generateSingleDay(tenantId, dto);
    }
    async generateBulk(req, dto) {
        const tenantId = req.user.tenantId;
        return this.dataGeneratorService.generateBulk(tenantId, dto);
    }
    async cleanData(req, dto) {
        const tenantId = req.user.tenantId;
        return this.dataGeneratorService.cleanGeneratedData(tenantId, dto);
    }
    async getStats(req) {
        const tenantId = req.user.tenantId;
        return this.dataGeneratorService.getStats(tenantId);
    }
};
exports.DataGeneratorController = DataGeneratorController;
__decorate([
    (0, common_1.Post)('attendance/single'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer des pointages pour un employé pour une journée',
        description: 'Génère des pointages virtuels selon un scénario spécifique pour tester le système',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Pointages générés avec succès',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données invalides',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_single_attendance_dto_1.GenerateSingleAttendanceDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorController.prototype, "generateSingle", null);
__decorate([
    (0, common_1.Post)('attendance/bulk'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Générer en masse des pointages pour plusieurs employés',
        description: 'Génère des pointages virtuels pour une période donnée avec une distribution de scénarios',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Pointages générés avec succès',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données invalides ou distribution incorrecte',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_bulk_attendance_dto_1.GenerateBulkAttendanceDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorController.prototype, "generateBulk", null);
__decorate([
    (0, common_1.Delete)('attendance/clean'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Supprimer les données générées',
        description: 'Supprime tous ou une partie des pointages générés virtuellement',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Données supprimées avec succès',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, clean_generated_data_dto_1.CleanGeneratedDataDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorController.prototype, "cleanData", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.SUPER_ADMIN, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({
        summary: 'Obtenir les statistiques des données générées',
        description: 'Retourne un résumé des pointages virtuels générés',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Statistiques récupérées',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataGeneratorController.prototype, "getStats", null);
exports.DataGeneratorController = DataGeneratorController = __decorate([
    (0, swagger_1.ApiTags)('Data Generator'),
    (0, common_1.Controller)('data-generator'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [data_generator_service_1.DataGeneratorService])
], DataGeneratorController);
//# sourceMappingURL=data-generator.controller.js.map