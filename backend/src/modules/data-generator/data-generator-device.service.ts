import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { DevicesConfigDto } from './dto/generate-all-data.dto';
import { DeviceType } from '@prisma/client';

@Injectable()
export class DataGeneratorDeviceService {
  private readonly logger = new Logger(DataGeneratorDeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DataGeneratorOrchestratorService))
    private readonly orchestrator: DataGeneratorOrchestratorService,
  ) {}

  /**
   * Génère des terminaux biométriques
   */
  async generateDevices(tenantId: string, config: DevicesConfigDto): Promise<number> {
    this.logger.log(`📱 Génération de terminaux pour tenant ${tenantId}`);

    const perSite = config.perSite || 2;
    const deviceTypes = config.deviceTypes || [
      { name: 'Terminal Principal', model: 'ZKTeco K40', location: 'Entrée principale' },
      { name: 'Terminal Secondaire', model: 'ZKTeco K30', location: 'Sortie' },
    ];

    // Récupérer les sites
    const sites = await this.prisma.site.findMany({ where: { tenantId } });

    if (sites.length === 0) {
      this.logger.warn('⚠️ Aucun site trouvé, création de terminaux sans site');
    }

    let created = 0;

    // Si pas de sites, créer des terminaux sans site
    if (sites.length === 0) {
      for (let i = 0; i < perSite; i++) {
        const deviceType = deviceTypes[i % deviceTypes.length];
        await this.prisma.attendanceDevice.create({
          data: {
            tenantId,
            name: `${deviceType.name} ${i + 1}`,
            deviceId: `DEV-${Date.now()}-${i}`,
            deviceType: DeviceType.FINGERPRINT,
            isActive: true,
            lastSync: new Date(),
          },
        });
        created++;
        this.orchestrator.incrementEntityCount('AttendanceDevice');
      }
    } else {
      // Créer des terminaux par site
      for (const site of sites) {
        for (let i = 0; i < perSite; i++) {
          const deviceType = deviceTypes[i % deviceTypes.length];
          await this.prisma.attendanceDevice.create({
            data: {
              tenantId,
              siteId: site.id,
              name: `${deviceType.name} - ${site.name}`,
              deviceId: `DEV-${site.id}-${i}-${Date.now()}`,
              deviceType: DeviceType.FINGERPRINT,
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
}

