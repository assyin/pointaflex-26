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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteManagersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SiteManagersService = class SiteManagersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        const site = await this.prisma.site.findFirst({
            where: {
                id: dto.siteId,
                tenantId,
            },
            select: {
                id: true,
                name: true,
            },
        });
        if (!site) {
            throw new common_1.NotFoundException(`Site avec l'ID ${dto.siteId} non trouvé`);
        }
        const department = await this.prisma.department.findFirst({
            where: {
                id: dto.departmentId,
                tenantId,
            },
            select: {
                id: true,
                name: true,
            },
        });
        if (!department) {
            throw new common_1.NotFoundException(`Département avec l'ID ${dto.departmentId} non trouvé`);
        }
        const manager = await this.prisma.employee.findFirst({
            where: {
                id: dto.managerId,
                tenantId,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                departmentId: true,
            },
        });
        if (!manager) {
            throw new common_1.NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
        }
        if (manager.departmentId !== dto.departmentId) {
            throw new common_1.BadRequestException(`Le manager "${manager.firstName} ${manager.lastName}" n'appartient pas au département "${department.name}". ` +
                `Il appartient à un autre département.`);
        }
        const existing = await this.prisma.siteManager.findFirst({
            where: {
                siteId: dto.siteId,
                departmentId: dto.departmentId,
                tenantId,
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Un manager régional existe déjà pour le site "${site.name}" et le département "${department.name}". ` +
                `Un seul manager par département par site est autorisé.`);
        }
        const otherSiteManagers = await this.prisma.siteManager.findMany({
            where: {
                managerId: dto.managerId,
                tenantId,
                departmentId: { not: dto.departmentId },
            },
            include: {
                site: {
                    select: { name: true },
                },
                department: {
                    select: { name: true },
                },
            },
        });
        if (otherSiteManagers.length > 0) {
            const otherSite = otherSiteManagers[0];
            throw new common_1.ForbiddenException(`Ce manager gère déjà le site "${otherSite.site.name}" dans le département "${otherSite.department.name}". ` +
                `Un manager régional ne peut gérer qu'un seul département.`);
        }
        return this.prisma.siteManager.create({
            data: {
                tenantId,
                siteId: dto.siteId,
                managerId: dto.managerId,
                departmentId: dto.departmentId,
            },
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                    },
                },
            },
        });
    }
    async findAll(tenantId, filters) {
        const where = { tenantId };
        if (filters?.siteId) {
            where.siteId = filters.siteId;
        }
        if (filters?.departmentId) {
            where.departmentId = filters.departmentId;
        }
        return this.prisma.siteManager.findMany({
            where,
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        city: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                        phone: true,
                    },
                },
            },
            orderBy: [
                { site: { name: 'asc' } },
                { department: { name: 'asc' } },
            ],
        });
    }
    async findOne(tenantId, id) {
        const siteManager = await this.prisma.siteManager.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        city: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });
        if (!siteManager) {
            throw new common_1.NotFoundException(`SiteManager avec l'ID ${id} non trouvé`);
        }
        return siteManager;
    }
    async update(tenantId, id, dto) {
        const siteManager = await this.prisma.siteManager.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                site: {
                    select: { name: true },
                },
                department: {
                    select: { name: true, id: true },
                },
            },
        });
        if (!siteManager) {
            throw new common_1.NotFoundException(`SiteManager avec l'ID ${id} non trouvé`);
        }
        if (dto.managerId && dto.managerId !== siteManager.managerId) {
            const newManager = await this.prisma.employee.findFirst({
                where: {
                    id: dto.managerId,
                    tenantId,
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    departmentId: true,
                },
            });
            if (!newManager) {
                throw new common_1.NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
            }
            if (newManager.departmentId !== siteManager.departmentId) {
                throw new common_1.BadRequestException(`Le manager "${newManager.firstName} ${newManager.lastName}" n'appartient pas au département "${siteManager.department.name}".`);
            }
            const otherSiteManagers = await this.prisma.siteManager.findMany({
                where: {
                    managerId: dto.managerId,
                    tenantId,
                    id: { not: id },
                    departmentId: { not: siteManager.departmentId },
                },
                include: {
                    site: {
                        select: { name: true },
                    },
                    department: {
                        select: { name: true },
                    },
                },
            });
            if (otherSiteManagers.length > 0) {
                const otherSite = otherSiteManagers[0];
                throw new common_1.ForbiddenException(`Ce manager gère déjà le site "${otherSite.site.name}" dans le département "${otherSite.department.name}". ` +
                    `Un manager régional ne peut gérer qu'un seul département.`);
            }
        }
        return this.prisma.siteManager.update({
            where: { id },
            data: dto,
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                    },
                },
            },
        });
    }
    async remove(tenantId, id) {
        const siteManager = await this.prisma.siteManager.findFirst({
            where: {
                id,
                tenantId,
            },
        });
        if (!siteManager) {
            throw new common_1.NotFoundException(`SiteManager avec l'ID ${id} non trouvé`);
        }
        await this.prisma.siteManager.delete({
            where: { id },
        });
        return { message: 'SiteManager supprimé avec succès' };
    }
    async findBySite(tenantId, siteId) {
        return this.prisma.siteManager.findMany({
            where: {
                tenantId,
                siteId,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                department: {
                    name: 'asc',
                },
            },
        });
    }
    async findByManager(tenantId, managerId) {
        return this.prisma.siteManager.findMany({
            where: {
                tenantId,
                managerId,
            },
            include: {
                site: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        city: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: {
                site: {
                    name: 'asc',
                },
            },
        });
    }
};
exports.SiteManagersService = SiteManagersService;
exports.SiteManagersService = SiteManagersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SiteManagersService);
//# sourceMappingURL=site-managers.service.js.map