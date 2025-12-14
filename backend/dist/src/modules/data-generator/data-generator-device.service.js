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
var DataGeneratorDeviceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorDeviceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const client_1 = require("@prisma/client");
let DataGeneratorDeviceService = DataGeneratorDeviceService_1 = class DataGeneratorDeviceService {
    constructor(prisma, orchestrator) {
        this.prisma = prisma;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(DataGeneratorDeviceService_1.name);
    }
    async generateDevices(tenantId, config) {
        this.logger.log(`📱 Génération de terminaux pour tenant ${tenantId}`);
        const perSite = config.perSite || 2;
        const deviceTypes = config.deviceTypes || [
            { name: 'Terminal Principal', model: 'ZKTeco K40', location: 'Entrée principale' },
            { name: 'Terminal Secondaire', model: 'ZKTeco K30', location: 'Sortie' },
        ];
        const sites = await this.prisma.site.findMany({ where: { tenantId } });
        if (sites.length === 0) {
            this.logger.warn('⚠️ Aucun site trouvé, création de terminaux sans site');
        }
        let created = 0;
        if (sites.length === 0) {
            for (let i = 0; i < perSite; i++) {
                const deviceType = deviceTypes[i % deviceTypes.length];
                await this.prisma.attendanceDevice.create({
                    data: {
                        tenantId,
                        name: `${deviceType.name} ${i + 1}`,
                        deviceId: `DEV-${Date.now()}-${i}`,
                        deviceType: client_1.DeviceType.FINGERPRINT,
                        isActive: true,
                        lastSync: new Date(),
                    },
                });
                created++;
                this.orchestrator.incrementEntityCount('AttendanceDevice');
            }
        }
        else {
            for (const site of sites) {
                for (let i = 0; i < perSite; i++) {
                    const deviceType = deviceTypes[i % deviceTypes.length];
                    await this.prisma.attendanceDevice.create({
                        data: {
                            tenantId,
                            siteId: site.id,
                            name: `${deviceType.name} - ${site.name}`,
                            deviceId: `DEV-${site.id}-${i}-${Date.now()}`,
                            deviceType: client_1.DeviceType.FINGERPRINT,
                            isActive: true,
                            lastSync: new Date(),
                        },
                    });
                    created++;
                    this.orchestrator.incrementEntityCount('AttendanceDevice');
                }
            }
        }
        this.logger.log(`✅ ${created} terminaux créés`);
        return created;
    }
};
exports.DataGeneratorDeviceService = DataGeneratorDeviceService;
exports.DataGeneratorDeviceService = DataGeneratorDeviceService = DataGeneratorDeviceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_generator_orchestrator_service_1.DataGeneratorOrchestratorService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_generator_orchestrator_service_1.DataGeneratorOrchestratorService])
], DataGeneratorDeviceService);
//# sourceMappingURL=data-generator-device.service.js.map