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
var DataGeneratorAllController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorAllController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const data_generator_cleanup_service_1 = require("./data-generator-cleanup.service");
const generate_all_data_dto_1 = require("./dto/generate-all-data.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
let DataGeneratorAllController = DataGeneratorAllController_1 = class DataGeneratorAllController {
    constructor(orchestratorService, cleanupService) {
        this.orchestratorService = orchestratorService;
        this.cleanupService = cleanupService;
        this.logger = new common_1.Logger(DataGeneratorAllController_1.name);
    }
    async generateAll(tenantId, dto) {
        try {
            return await this.orchestratorService.generateAll(tenantId, dto);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`❌ Erreur lors de la génération pour tenant ${tenantId}: ${errorMessage}`, errorStack);
            if (error && typeof error === 'object' && 'status' in error) {
                throw error;
            }
            throw new common_1.InternalServerErrorException({
                message: 'Erreur lors de la génération des données',
                error: errorMessage,
                tenantId,
            });
        }
    }
    async cleanupAll(tenantId) {
        return this.cleanupService.cleanupAll(tenantId);
    }
};
exports.DataGeneratorAllController = DataGeneratorAllController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Générer toutes les données selon la configuration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Génération complète terminée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Configuration invalide' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Accès refusé' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Erreur serveur' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, generate_all_data_dto_1.GenerateAllDataDto]),
    __metadata("design:returntype", Promise)
], DataGeneratorAllController.prototype, "generateAll", null);
__decorate([
    (0, common_1.Post)('cleanup'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.ADMIN_RH),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Nettoyer toutes les données générées' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Nettoyage terminé avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Accès refusé' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DataGeneratorAllController.prototype, "cleanupAll", null);
exports.DataGeneratorAllController = DataGeneratorAllController = DataGeneratorAllController_1 = __decorate([
    (0, swagger_1.ApiTags)('Data Generator - All'),
    (0, common_1.Controller)('data-generator/all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [data_generator_orchestrator_service_1.DataGeneratorOrchestratorService,
        data_generator_cleanup_service_1.DataGeneratorCleanupService])
], DataGeneratorAllController);
//# sourceMappingURL=data-generator-all.controller.js.map