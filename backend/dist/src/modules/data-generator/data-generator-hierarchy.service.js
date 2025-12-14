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
var DataGeneratorHierarchyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorHierarchyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
let DataGeneratorHierarchyService = DataGeneratorHierarchyService_1 = class DataGeneratorHierarchyService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorHierarchyService_1.name);
    }
    async configureHierarchy(tenantId, managerDistribution) {
        this.logger.log(`👔 Configuration de la hiérarchie managers pour tenant ${tenantId}`);
        const departments = await this.prisma.department.findMany({ where: { tenantId } });
        const sites = await this.prisma.site.findMany({ where: { tenantId } });
        const teams = await this.prisma.team.findMany({ where: { tenantId } });
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const potentialManagers = await this.prisma.employee.findMany({
            where: {
                tenantId,
                hireDate: { lte: twoYearsAgo },
                isActive: true,
            },
            include: {
                user: {
                    include: {
                        userTenantRoles: {
                            include: { role: true },
                        },
                    },
                },
            },
            orderBy: { hireDate: 'asc' },
        });
        if (potentialManagers.length === 0) {
            this.logger.warn('⚠️ Aucun employé avec suffisamment d\'ancienneté pour être manager');
            return { departmentManagers: 0, siteManagers: 0, teamManagers: 0 };
        }
        let managerIndex = 0;
        let departmentManagersAssigned = 0;
        let siteManagersAssigned = 0;
        let teamManagersAssigned = 0;
        for (const department of departments) {
            if (managerIndex >= potentialManagers.length)
                break;
            const manager = potentialManagers[managerIndex];
            await this.prisma.department.update({
                where: { id: department.id },
                data: { managerId: manager.id },
            });
            if (manager.userId) {
                await this.assignManagerRole(tenantId, manager.userId);
            }
            departmentManagersAssigned++;
            managerIndex++;
            this.logger.log(`✅ Manager assigné au département ${department.name}`);
        }
        const managedDepartments = await this.prisma.department.findMany({
            where: { tenantId, managerId: { not: null } },
            select: { managerId: true },
        });
        const managedDepartmentManagerIds = new Set(managedDepartments.map(d => d.managerId).filter(Boolean));
        for (const site of sites) {
            const employeesInSite = await this.prisma.employee.findMany({
                where: {
                    siteId: site.id,
                    tenantId,
                    isActive: true,
                },
                select: {
                    departmentId: true,
                },
                distinct: ['departmentId'],
            });
            const departmentsInSite = employeesInSite
                .map(e => e.departmentId)
                .filter((id) => id !== null);
            if (departmentsInSite.length === 0) {
                this.logger.warn(`⚠️ Aucun département trouvé dans le site ${site.name}, aucun manager régional assigné`);
                continue;
            }
            for (const departmentId of departmentsInSite) {
                let availableManagers = potentialManagers.filter((m, idx) => idx >= managerIndex &&
                    !managedDepartmentManagerIds.has(m.id) &&
                    m.departmentId === departmentId);
                if (availableManagers.length === 0) {
                    this.logger.warn(`⚠️ Aucun manager disponible pour le site ${site.name} et le département ${departmentId}`);
                    continue;
                }
                const manager = availableManagers[0];
                await this.prisma.siteManager.create({
                    data: {
                        tenantId,
                        siteId: site.id,
                        managerId: manager.id,
                        departmentId: departmentId,
                    },
                });
                if (manager.userId) {
                    await this.assignManagerRole(tenantId, manager.userId);
                }
                siteManagersAssigned++;
                managerIndex = potentialManagers.indexOf(manager) + 1;
                this.logger.log(`✅ Manager régional assigné au site ${site.name} pour le département ${departmentId}`);
            }
        }
        for (const team of teams) {
            if (managerIndex >= potentialManagers.length)
                break;
            const manager = potentialManagers[managerIndex];
            await this.prisma.team.update({
                where: { id: team.id },
                data: { managerId: manager.id },
            });
            if (manager.userId) {
                await this.assignManagerRole(tenantId, manager.userId);
            }
            teamManagersAssigned++;
            managerIndex++;
            this.logger.log(`✅ Manager assigné à l'équipe ${team.name}`);
        }
        this.logger.log(`✅ Hiérarchie configurée: ${departmentManagersAssigned} départements, ${siteManagersAssigned} sites, ${teamManagersAssigned} équipes`);
        return {
            departmentManagers: departmentManagersAssigned,
            siteManagers: siteManagersAssigned,
            teamManagers: teamManagersAssigned,
        };
    }
    async assignManagerRole(tenantId, userId) {
        const managerRole = await this.prisma.role.findFirst({
            where: {
                OR: [
                    { tenantId: null, name: 'MANAGER' },
                    { tenantId, name: 'MANAGER' },
                ],
            },
        });
        if (!managerRole) {
            this.logger.warn('⚠️ Rôle MANAGER non trouvé');
            return;
        }
        const existing = await this.prisma.userTenantRole.findFirst({
            where: {
                userId,
                tenantId,
                roleId: managerRole.id,
            },
        });
        if (!existing) {
            await this.prisma.userTenantRole.create({
                data: {
                    userId,
                    tenantId,
                    roleId: managerRole.id,
                },
            });
            this.logger.log(`✅ Rôle MANAGER assigné à l'utilisateur ${userId}`);
        }
    }
};
exports.DataGeneratorHierarchyService = DataGeneratorHierarchyService;
exports.DataGeneratorHierarchyService = DataGeneratorHierarchyService = DataGeneratorHierarchyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorHierarchyService);
//# sourceMappingURL=data-generator-hierarchy.service.js.map