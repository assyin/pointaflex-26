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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let DevicesService = class DevicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, createDeviceDto) {
        const existingDevice = await this.prisma.attendanceDevice.findFirst({
            where: {
                tenantId,
                deviceId: createDeviceDto.deviceId,
            },
        });
        if (existingDevice) {
            throw new common_1.ConflictException('Un terminal avec cet ID existe déjà');
        }
        return this.prisma.attendanceDevice.create({
            data: {
                ...createDeviceDto,
                tenantId,
            },
            include: {
                site: true,
            },
        });
    }
    async findAll(tenantId, filters) {
        const where = { tenantId };
        if (filters?.deviceType) {
            where.deviceType = filters.deviceType;
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive === 'true';
        }
        if (filters?.siteId) {
            where.siteId = filters.siteId;
        }
        return this.prisma.attendanceDevice.findMany({
            where,
            include: {
                site: true,
                _count: {
                    select: {
                        attendance: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(id, tenantId) {
        const device = await this.prisma.attendanceDevice.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                site: true,
                _count: {
                    select: {
                        attendance: true,
                    },
                },
            },
        });
        if (!device) {
            throw new common_1.NotFoundException('Terminal non trouvé');
        }
        return device;
    }
    async findByDeviceId(deviceId, tenantId) {
        return this.prisma.attendanceDevice.findFirst({
            where: {
                deviceId,
                tenantId,
            },
        });
    }
    async update(id, tenantId, updateDeviceDto) {
        await this.findOne(id, tenantId);
        if (updateDeviceDto.deviceId) {
            const existingDevice = await this.prisma.attendanceDevice.findFirst({
                where: {
                    tenantId,
                    deviceId: updateDeviceDto.deviceId,
                    NOT: { id },
                },
            });
            if (existingDevice) {
                throw new common_1.ConflictException('Un terminal avec cet ID existe déjà');
            }
        }
        return this.prisma.attendanceDevice.update({
            where: { id },
            data: updateDeviceDto,
            include: {
                site: true,
            },
        });
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        return this.prisma.attendanceDevice.delete({
            where: { id },
        });
    }
    async getStats(tenantId) {
        const [total, active, inactive] = await Promise.all([
            this.prisma.attendanceDevice.count({ where: { tenantId } }),
            this.prisma.attendanceDevice.count({ where: { tenantId, isActive: true } }),
            this.prisma.attendanceDevice.count({ where: { tenantId, isActive: false } }),
        ]);
        return {
            total,
            active,
            inactive,
            offline: 0,
        };
    }
    async syncDevice(id, tenantId) {
        const device = await this.findOne(id, tenantId);
        const updatedDevice = await this.prisma.attendanceDevice.update({
            where: { id },
            data: { lastSync: new Date() },
            include: {
                site: true,
            },
        });
        return {
            success: true,
            message: 'Synchronisation réussie',
            device: updatedDevice,
        };
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map