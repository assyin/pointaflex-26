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
var DataGeneratorStructureService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorStructureService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
let DataGeneratorStructureService = DataGeneratorStructureService_1 = class DataGeneratorStructureService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorStructureService_1.name);
        this.defaultSites = [
            { name: 'Siège Social', code: 'HQ', city: 'Casablanca' },
            { name: 'Agence Rabat', code: 'RBT', city: 'Rabat' },
            { name: 'Agence Marrakech', code: 'MRK', city: 'Marrakech' },
            { name: 'Agence Tanger', code: 'TNG', city: 'Tanger' },
            { name: 'Agence Fès', code: 'FES', city: 'Fès' },
        ];
        this.defaultDepartments = [
            { name: 'Ressources Humaines', code: 'RH', description: 'Gestion du personnel' },
            { name: 'Technologies de l\'Information', code: 'IT', description: 'Informatique et systèmes' },
            { name: 'Production', code: 'PROD', description: 'Production et opérations' },
            { name: 'Commercial', code: 'COM', description: 'Ventes et marketing' },
            { name: 'Finance', code: 'FIN', description: 'Comptabilité et finances' },
            { name: 'Qualité', code: 'QUAL', description: 'Contrôle qualité' },
            { name: 'Logistique', code: 'LOG', description: 'Transport et stockage' },
            { name: 'Maintenance', code: 'MAINT', description: 'Maintenance technique' },
        ];
        this.defaultPositions = [
            { name: 'Directeur Général', category: 'Direction', code: 'DG' },
            { name: 'Directeur RH', category: 'Direction', code: 'DRH' },
            { name: 'Directeur IT', category: 'Direction', code: 'DIT' },
            { name: 'Manager RH', category: 'Management', code: 'MRH' },
            { name: 'Manager Production', category: 'Management', code: 'MPROD' },
            { name: 'Chef de Projet', category: 'Management', code: 'CP' },
            { name: 'Développeur Senior', category: 'Technique', code: 'DEV-S' },
            { name: 'Développeur', category: 'Technique', code: 'DEV' },
            { name: 'Analyste', category: 'Technique', code: 'ANA' },
            { name: 'Comptable', category: 'Administratif', code: 'COMP' },
            { name: 'Assistant RH', category: 'Administratif', code: 'ARH' },
            { name: 'Ouvrier', category: 'Production', code: 'OUV' },
            { name: 'Technicien', category: 'Technique', code: 'TECH' },
            { name: 'Commercial', category: 'Commercial', code: 'COM' },
            { name: 'Responsable Qualité', category: 'Qualité', code: 'RQ' },
        ];
        this.defaultTeams = [
            { name: 'Équipe Alpha', code: 'TEAM-A', description: 'Équipe de production principale' },
            { name: 'Équipe Beta', code: 'TEAM-B', description: 'Équipe de production secondaire' },
            { name: 'Équipe Gamma', code: 'TEAM-C', description: 'Équipe de maintenance' },
            { name: 'Équipe Delta', code: 'TEAM-D', description: 'Équipe de qualité' },
        ];
    }
    async generateSites(tenantId, config) {
        this.logger.log(`📍 Génération des sites pour tenant ${tenantId}`);
        let sitesToCreate = config.sites || [];
        const sitesCount = config.sitesCount || 0;
        if (sitesToCreate.length === 0 && sitesCount > 0) {
            sitesToCreate = this.defaultSites.slice(0, sitesCount).map((site) => ({
                name: site.name,
                code: site.code,
                address: undefined,
                city: site.city,
                latitude: undefined,
                longitude: undefined,
            }));
        }
        let created = 0;
        for (const siteData of sitesToCreate) {
            const existing = await this.prisma.site.findFirst({
                where: {
                    tenantId,
                    name: siteData.name,
                },
            });
            if (!existing) {
                await this.prisma.site.create({
                    data: {
                        tenantId,
                        name: siteData.name,
                        code: siteData.code || undefined,
                        address: siteData.address || undefined,
                        city: siteData.city || undefined,
                        latitude: siteData.latitude ? String(siteData.latitude) : undefined,
                        longitude: siteData.longitude ? String(siteData.longitude) : undefined,
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('Site');
            }
        }
        this.logger.log(`✅ ${created} sites créés`);
        return created;
    }
    async generateDepartments(tenantId, config) {
        this.logger.log(`📁 Génération des départements pour tenant ${tenantId}`);
        let departmentsToCreate = config.departments || [];
        const departmentsCount = config.departmentsCount || 0;
        if (departmentsToCreate.length === 0 && departmentsCount > 0) {
            departmentsToCreate = this.defaultDepartments.slice(0, departmentsCount).map((dept) => ({
                name: dept.name,
                code: dept.code,
                description: dept.description,
            }));
        }
        let created = 0;
        for (const deptData of departmentsToCreate) {
            const existing = await this.prisma.department.findFirst({
                where: {
                    tenantId,
                    name: deptData.name,
                },
            });
            if (!existing) {
                await this.prisma.department.create({
                    data: {
                        tenantId,
                        name: deptData.name,
                        code: deptData.code || undefined,
                        description: deptData.description || undefined,
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('Department');
            }
        }
        this.logger.log(`✅ ${created} départements créés`);
        return created;
    }
    async generatePositions(tenantId, config) {
        this.logger.log(`💼 Génération des positions pour tenant ${tenantId}`);
        let positionsToCreate = config.positions || [];
        const positionsCount = config.positionsCount || 0;
        if (positionsToCreate.length === 0 && positionsCount > 0) {
            positionsToCreate = this.defaultPositions.slice(0, positionsCount).map((pos) => ({
                name: pos.name,
                code: pos.code,
                category: pos.category,
                description: undefined,
            }));
        }
        let created = 0;
        for (const posData of positionsToCreate) {
            const existing = await this.prisma.position.findFirst({
                where: {
                    tenantId,
                    name: posData.name,
                },
            });
            if (!existing) {
                await this.prisma.position.create({
                    data: {
                        tenantId,
                        name: posData.name,
                        code: posData.code || undefined,
                        category: posData.category || undefined,
                        description: posData.description || undefined,
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('Position');
            }
        }
        this.logger.log(`✅ ${created} positions créées`);
        return created;
    }
    async generateTeams(tenantId, config) {
        this.logger.log(`👥 Génération des équipes pour tenant ${tenantId}`);
        let teamsToCreate = config.teams || [];
        const teamsCount = config.teamsCount || 0;
        if (teamsToCreate.length === 0 && teamsCount > 0) {
            teamsToCreate = this.defaultTeams.slice(0, teamsCount).map((team) => ({
                name: team.name,
                code: team.code,
                description: team.description,
            }));
        }
        let created = 0;
        for (const teamData of teamsToCreate) {
            const existing = await this.prisma.team.findFirst({
                where: {
                    tenantId,
                    name: teamData.name,
                },
            });
            if (!existing) {
                await this.prisma.team.create({
                    data: {
                        tenantId,
                        name: teamData.name,
                        code: teamData.code || undefined,
                        description: teamData.description || undefined,
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('Team');
            }
        }
        this.logger.log(`✅ ${created} équipes créées`);
        return created;
    }
    async generateStructure(tenantId, config) {
        this.logger.log(`🏢 Génération de la structure organisationnelle pour tenant ${tenantId}`);
        const sites = await this.generateSites(tenantId, config);
        const departments = await this.generateDepartments(tenantId, config);
        const positions = await this.generatePositions(tenantId, config);
        const teams = await this.generateTeams(tenantId, config);
        this.logger.log(`✅ Structure créée: ${sites} sites, ${departments} départements, ${positions} positions, ${teams} équipes`);
        return { sites, departments, positions, teams };
    }
};
exports.DataGeneratorStructureService = DataGeneratorStructureService;
exports.DataGeneratorStructureService = DataGeneratorStructureService = DataGeneratorStructureService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorStructureService);
//# sourceMappingURL=data-generator-structure.service.js.map