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
exports.TerminalMatriculeMappingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const terminal_matricule_mapping_service_1 = require("./terminal-matricule-mapping.service");
const migrate_matricule_dto_1 = require("./dto/migrate-matricule.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const common_2 = require("@nestjs/common");
let TerminalMatriculeMappingController = class TerminalMatriculeMappingController {
    constructor(mappingService) {
        this.mappingService = mappingService;
    }
    async getExpiringMatricules(tenantId) {
        const prisma = this.mappingService.prisma;
        const settings = await prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { temporaryMatriculeExpiryDays: true },
        });
        const expiryDays = settings?.temporaryMatriculeExpiryDays || 8;
        return this.mappingService.getExpiringTemporaryMatricules(tenantId, expiryDays);
    }
    async getAllTemporaryMatricules(tenantId) {
        const prisma = this.mappingService.prisma;
        const settings = await prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { temporaryMatriculeExpiryDays: true },
        });
        const expiryDays = settings?.temporaryMatriculeExpiryDays || 8;
        return this.mappingService.getAllTemporaryMatricules(tenantId, expiryDays);
    }
    async migrateToOfficialMatricule(tenantId, employeeId, dto) {
        const prisma = this.mappingService.prisma;
        const employee = await prisma.employee.findFirst({
            where: {
                id: employeeId,
                tenantId,
            },
        });
        if (!employee) {
            throw new common_2.ConflictException('Employé non trouvé');
        }
        const existing = await prisma.employee.findFirst({
            where: {
                tenantId,
                matricule: dto.officialMatricule,
                id: {
                    not: employeeId,
                },
            },
        });
        if (existing) {
            throw new common_2.ConflictException(`Le matricule officiel "${dto.officialMatricule}" est déjà utilisé par un autre employé`);
        }
        await prisma.employee.update({
            where: { id: employeeId },
            data: { matricule: dto.officialMatricule },
        });
        await this.mappingService.updateOfficialMatricule(employeeId, dto.officialMatricule);
        return {
            success: true,
            message: `Matricule migré avec succès vers ${dto.officialMatricule}`,
            employee: {
                id: employeeId,
                matricule: dto.officialMatricule,
            },
        };
    }
    async getEmployeeMappings(employeeId) {
        return this.mappingService.getEmployeeMappings(employeeId);
    }
    async getMappingHistory(tenantId, employeeId, terminalMatricule, officialMatricule, startDate, endDate, isActive, page, limit) {
        const filters = {};
        if (employeeId)
            filters.employeeId = employeeId;
        if (terminalMatricule)
            filters.terminalMatricule = terminalMatricule;
        if (officialMatricule)
            filters.officialMatricule = officialMatricule;
        if (startDate)
            filters.startDate = new Date(startDate);
        if (endDate)
            filters.endDate = new Date(endDate);
        if (isActive !== undefined)
            filters.isActive = isActive === 'true';
        if (page)
            filters.page = parseInt(page, 10);
        if (limit)
            filters.limit = parseInt(limit, 10);
        return this.mappingService.getMappingHistory(tenantId, filters);
    }
};
exports.TerminalMatriculeMappingController = TerminalMatriculeMappingController;
__decorate([
    (0, common_1.Get)('expiring'),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer les employés avec matricule temporaire expiré ou expirant',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Liste des employés avec matricule temporaire expiré/expirant',
    }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TerminalMatriculeMappingController.prototype, "getExpiringMatricules", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer TOUS les employés avec matricule temporaire (même non expirés)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Liste de tous les employés avec matricule temporaire',
    }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TerminalMatriculeMappingController.prototype, "getAllTemporaryMatricules", null);
__decorate([
    (0, common_1.Patch)('migrate/:employeeId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Migrer un employé vers un matricule officiel',
        description: 'Met à jour le matricule officiel d un employé tout en conservant le matricule terminal',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Migration réussie',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Employé non trouvé',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Matricule officiel déjà utilisé',
    }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, migrate_matricule_dto_1.MigrateMatriculeDto]),
    __metadata("design:returntype", Promise)
], TerminalMatriculeMappingController.prototype, "migrateToOfficialMatricule", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer les mappings d un employé',
    }),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TerminalMatriculeMappingController.prototype, "getEmployeeMappings", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer l\'historique complet des mappings avec filtres',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Historique des mappings',
    }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('terminalMatricule')),
    __param(3, (0, common_1.Query)('officialMatricule')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('isActive')),
    __param(7, (0, common_1.Query)('page')),
    __param(8, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], TerminalMatriculeMappingController.prototype, "getMappingHistory", null);
exports.TerminalMatriculeMappingController = TerminalMatriculeMappingController = __decorate([
    (0, swagger_1.ApiTags)('Terminal Matricule Mapping'),
    (0, common_1.Controller)('terminal-matricule-mapping'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [terminal_matricule_mapping_service_1.TerminalMatriculeMappingService])
], TerminalMatriculeMappingController);
//# sourceMappingURL=terminal-matricule-mapping.controller.js.map