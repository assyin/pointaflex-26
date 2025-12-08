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
let SitesService = class SitesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        if (dto.code) {
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
        const data = {
            ...dto,
            tenantId,
            workingDays: dto.workingDays || null,
        };
        try {
            return await this.prisma.site.create({
                data,
                include: {
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
    async findAll(tenantId) {
        try {
            const sites = await this.prisma.site.findMany({
                where: { tenantId },
                include: {
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
                    where: { tenantId },
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