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
exports.SitesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
let SitesService = class SitesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateUniqueCode(tenantId, siteName) {
        const normalized = siteName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
        let baseCode = normalized
            .replace(/\s/g, '')
            .substring(0, 3);
        if (baseCode.length < 3) {
            baseCode = baseCode.padEnd(3, 'X');
        }
        try {
            const existing = await this.prisma.site.findFirst({
                where: {
                    tenantId,
                    code: baseCode,
                },
            });
            if (!existing) {
                return baseCode;
            }
        }
        catch (error) {
            if (error.message?.includes('does not exist')) {
                return baseCode;
            }
            throw error;
        }
        let counter = 1;
        let uniqueCode;
        do {
            uniqueCode = `${baseCode}${String(counter).padStart(3, '0')}`;
            try {
                const existing = await this.prisma.site.findFirst({
                    where: {
                        tenantId,
                        code: uniqueCode,
                    },
                });
                if (!existing) {
                    return uniqueCode;
                }
            }
            catch (error) {
                if (error.message?.includes('does not exist')) {
                    return uniqueCode;
                }
                throw error;
            }
            counter++;
            if (counter > 9999) {
                return `SITE${Date.now().toString().slice(-6)}`;
            }
        } while (true);
    }
    async validateManagerDepartmentConstraint(managerId, departmentId, currentSiteId) {
        if (!managerId) {
            return;
        }
        const where = {
            managerId,
            departmentId: { not: null },
        };
        if (currentSiteId) {
            where.id = { not: currentSiteId };
        }
        const otherManagedSites = await this.prisma.site.findMany({
            where,
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        for (const site of otherManagedSites) {
            if (site.department && site.departmentId !== departmentId) {
                throw new common_1.ForbiddenException(`Ce manager gère déjà le site "${site.name}" dans le département "${site.department.name}". ` +
                    `Un manager régional ne peut gérer qu'un seul département.`);
            }
        }
    }
    async create(tenantId, dto) {
        let finalCode = dto.code;
        if (!finalCode) {
            finalCode = await this.generateUniqueCode(tenantId, dto.name);
        }
        else {
            try {
                const existing = await this.prisma.site.findFirst({
                    where: {
                        tenantId,
                        code: dto.code,
                    },
                });
                if (existing) {
                    throw new common_1.ConflictException(`Le code "${dto.code}" existe déjà pour ce tenant`);
                }
            }
            catch (error) {
                if (error.message?.includes('does not exist')) {
                }
                else {
                    throw error;
                }
            }
        }
        if (dto.managerId) {
            const manager = await this.prisma.employee.findFirst({
                where: {
                    id: dto.managerId,
                    tenantId,
                },
                select: {
                    id: true,
                    departmentId: true,
                },
            });
            if (!manager) {
                throw new common_1.NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
            }
            if (dto.departmentId && manager.departmentId !== dto.departmentId) {
                throw new common_1.BadRequestException(`Le manager doit appartenir au département du site. ` +
                    `Le manager appartient au département "${manager.departmentId}" ` +
                    `mais le site est assigné au département "${dto.departmentId}".`);
            }
            await this.validateManagerDepartmentConstraint(dto.managerId, dto.departmentId);
        }
        const data = {
            ...dto,
            code: finalCode,
            tenantId,
            workingDays: dto.workingDays || null,
        };
        try {
            return await this.prisma.site.create({
                data,
                include: {
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                        },
                    },
                    _count: {
                        select: {
                            employees: true,
                            devices: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (error.message?.includes('code') && error.message?.includes('does not exist')) {
                delete data.code;
                return await this.prisma.site.create({
                    data,
                    include: {
                        manager: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                matricule: true,
                            },
                        },
                        _count: {
                            select: {
                                employees: true,
                                devices: true,
                            },
                        },
                    },
                });
            }
            throw error;
        }
    }
    async findAll(tenantId, userId, userPermissions) {
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('site.view_all') || false;
        if (userId) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
            }
            else if (managerLevel.type === 'SITE') {
                if (managerLevel.siteIds && managerLevel.siteIds.length > 0) {
                    where.id = { in: managerLevel.siteIds };
                }
                else {
                    return { data: [], total: 0 };
                }
            }
            else if (managerLevel.type === 'TEAM') {
                const team = await this.prisma.team.findUnique({
                    where: { id: managerLevel.teamId },
                    select: {
                        employees: {
                            select: { siteId: true },
                            take: 1,
                        },
                    },
                });
                if (team?.employees?.[0]?.siteId) {
                    where.id = team.employees[0].siteId;
                }
                else {
                    return { data: [], total: 0 };
                }
            }
        }
        try {
            const sites = await this.prisma.site.findMany({
                where,
                include: {
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                        },
                    },
                    _count: {
                        select: {
                            employees: true,
                            devices: true,
                            attendance: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });
            return {
                data: sites,
                total: sites.length,
            };
        }
        catch (error) {
            if (error.message?.includes('does not exist') || error.code === 'P2021') {
                const sites = await this.prisma.site.findMany({
                    where,
                    orderBy: { name: 'asc' },
                });
                const sitesWithCounts = await Promise.all(sites.map(async (site) => {
                    const [employeesCount, devicesCount] = await Promise.all([
                        this.prisma.employee.count({ where: { siteId: site.id } }).catch(() => 0),
                        this.prisma.attendanceDevice.count({ where: { siteId: site.id } }).catch(() => 0),
                    ]);
                    return {
                        ...site,
                        _count: {
                            employees: employeesCount,
                            devices: devicesCount,
                            attendance: 0,
                        },
                    };
                }));
                return {
                    data: sitesWithCounts,
                    total: sitesWithCounts.length,
                };
            }
            throw error;
        }
    }
    async findOne(tenantId, id) {
        const site = await this.prisma.site.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
                employees: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                    take: 10,
                },
                devices: {
                    select: {
                        id: true,
                        name: true,
                        deviceId: true,
                    },
                },
                _count: {
                    select: {
                        employees: true,
                        devices: true,
                        attendance: true,
                    },
                },
            },
        });
        if (!site) {
            throw new common_1.NotFoundException('Site non trouvé');
        }
        return site;
    }
    async update(tenantId, id, dto) {
        const site = await this.prisma.site.findFirst({
            where: { id, tenantId },
        });
        if (!site) {
            throw new common_1.NotFoundException('Site non trouvé');
        }
        if (dto.managerId) {
            const manager = await this.prisma.employee.findFirst({
                where: {
                    id: dto.managerId,
                    tenantId,
                },
                select: {
                    id: true,
                    departmentId: true,
                },
            });
            if (!manager) {
                throw new common_1.NotFoundException(`Manager avec l'ID ${dto.managerId} non trouvé`);
            }
        }
        const finalManagerId = dto.managerId !== undefined ? dto.managerId : site.managerId;
        const finalDepartmentId = dto.departmentId !== undefined ? dto.departmentId : site.departmentId;
        if (finalManagerId && (dto.managerId !== undefined || dto.departmentId !== undefined)) {
            if (finalManagerId && finalDepartmentId) {
                const manager = await this.prisma.employee.findFirst({
                    where: {
                        id: finalManagerId,
                        tenantId,
                    },
                    select: {
                        id: true,
                        departmentId: true,
                    },
                });
                if (manager && manager.departmentId !== finalDepartmentId) {
                    throw new common_1.BadRequestException(`Le manager doit appartenir au département du site. ` +
                        `Le manager appartient au département "${manager.departmentId}" ` +
                        `mais le site est assigné au département "${finalDepartmentId}".`);
                }
            }
            await this.validateManagerDepartmentConstraint(finalManagerId, finalDepartmentId, id);
        }
        if (dto.code && site.code && dto.code !== site.code) {
            try {
                const existing = await this.prisma.site.findFirst({
                    where: {
                        tenantId,
                        code: dto.code,
                    },
                });
                if (existing) {
                    throw new common_1.ConflictException(`Le code "${dto.code}" existe déjà`);
                }
            }
            catch (error) {
                if (error.message?.includes('does not exist')) {
                }
                else {
                    throw error;
                }
            }
        }
        const data = {
            ...dto,
            workingDays: dto.workingDays || undefined,
        };
        try {
            return await this.prisma.site.update({
                where: { id },
                data,
                include: {
                    manager: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                        },
                    },
                    _count: {
                        select: {
                            employees: true,
                            devices: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            if (error.message?.includes('code') && error.message?.includes('does not exist')) {
                delete data.code;
                return await this.prisma.site.update({
                    where: { id },
                    data,
                    include: {
                        manager: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                matricule: true,
                            },
                        },
                        _count: {
                            select: {
                                employees: true,
                                devices: true,
                            },
                        },
                    },
                });
            }
            throw error;
        }
    }
    async remove(tenantId, id) {
        const site = await this.prisma.site.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: {
                        employees: true,
                        devices: true,
                    },
                },
            },
        });
        if (!site) {
            throw new common_1.NotFoundException('Site non trouvé');
        }
        if (site._count.employees > 0) {
            throw new common_1.ConflictException(`Impossible de supprimer: ${site._count.employees} employé(s) assigné(s) à ce site`);
        }
        if (site._count.devices > 0) {
            throw new common_1.ConflictException(`Impossible de supprimer: ${site._count.devices} appareil(s) assigné(s) à ce site`);
        }
        await this.prisma.site.delete({
            where: { id },
        });
        return { message: 'Site supprimé avec succès' };
    }
};
exports.SitesService = SitesService;
exports.SitesService = SitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SitesService);
//# sourceMappingURL=sites.service.js.map