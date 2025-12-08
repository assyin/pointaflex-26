import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HolidayType } from '@prisma/client';
import { generateMoroccoHolidays } from './utils/morocco-holidays';

@Injectable()
export class DataGeneratorHolidaysService {
  private readonly logger = new Logger(DataGeneratorHolidaysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Générer les jours fériés
   */
  async generateHolidays(tenantId: string, dto: any) {
    this.logger.log(`Génération de jours fériés pour le tenant ${tenantId}`);

    const stats = {
      holidaysCreated: 0,
      holidaysSkipped: 0,
    };

    const startYear = dto.startYear || new Date().getFullYear();
    const endYear = dto.endYear || new Date().getFullYear() + 2;

    if (startYear > endYear) {
      throw new BadRequestException('L\'année de début doit être inférieure ou égale à l\'année de fin');
    }

    const holidays: Array<{ name: string; date: Date; isRecurring: boolean; type: HolidayType }> = [];

    // 1. Générer les jours fériés du Maroc si demandé
    if (dto.generateMoroccoHolidays !== false) {
      this.logger.log(`Génération des jours fériés du Maroc pour ${startYear}-${endYear}`);
      const moroccoHolidays = generateMoroccoHolidays(startYear, endYear);
      holidays.push(...moroccoHolidays);
    }

    // 2. Ajouter les jours fériés personnalisés
    if (dto.customHolidays && Array.isArray(dto.customHolidays)) {
      for (const custom of dto.customHolidays) {
        if (!custom.name || !custom.date) {
          continue;
        }
        holidays.push({
          name: custom.name,
          date: new Date(custom.date),
          isRecurring: custom.isRecurring || false,
          type: custom.type || HolidayType.COMPANY,
        });
      }
    }

    // 3. Créer les jours fériés dans la base de données
    for (const holiday of holidays) {
      // Vérifier si le jour férié existe déjà
      const existing = await this.prisma.holiday.findFirst({
        where: {
          tenantId,
          date: holiday.date,
          name: holiday.name,
        },
      });

      if (existing) {
        stats.holidaysSkipped++;
        continue;
      }

      await this.prisma.holiday.create({
        data: {
          tenantId,
          name: holiday.name,
          date: holiday.date,
          isRecurring: holiday.isRecurring,
          type: holiday.type,
        },
      });

      stats.holidaysCreated++;
    }

    this.logger.log(`${stats.holidaysCreated} jours fériés créés, ${stats.holidaysSkipped} ignorés (déjà existants)`);

    return {
      success: true,
      ...stats,
    };
  }

  /**
   * Obtenir les statistiques des jours fériés
   */
  async getHolidaysStats(tenantId: string) {
    const holidays = await this.prisma.holiday.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });

    // Grouper par année
    const byYear: { [year: string]: number } = {};
    const recurring = holidays.filter(h => h.isRecurring).length;
    const nonRecurring = holidays.length - recurring;

    holidays.forEach(holiday => {
      const year = new Date(holiday.date).getFullYear().toString();
      byYear[year] = (byYear[year] || 0) + 1;
    });

    return {
      totalHolidays: holidays.length,
      recurring,
      nonRecurring,
      byYear,
      holidays: holidays.map(h => ({
        id: h.id,
        name: h.name,
        date: h.date.toISOString().split('T')[0],
        isRecurring: h.isRecurring,
        type: h.type,
      })),
    };
  }

  /**
   * Supprimer tous les jours fériés générés
   */
  async cleanHolidays(tenantId: string) {
    const result = await this.prisma.holiday.deleteMany({
      where: { tenantId },
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  }
}

