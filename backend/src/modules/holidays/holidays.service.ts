import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateHolidayDto) {
    // Vérifier qu'il n'existe pas déjà un jour férié avec le même nom et date
    const date = new Date(dto.date);
    const existing = await this.prisma.holiday.findFirst({
      where: {
        tenantId,
        name: dto.name,
        date,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Un jour férié "${dto.name}" existe déjà pour cette date`,
      );
    }

    return this.prisma.holiday.create({
      data: {
        ...dto,
        date,
        tenantId,
        isRecurring: dto.isRecurring || false,
      },
    });
  }

  async findAll(tenantId: string, year?: string) {
    const where: any = { tenantId };

    // Filtrer par année si spécifié
    if (year) {
      const yearNum = parseInt(year);
      where.date = {
        gte: new Date(`${yearNum}-01-01`),
        lte: new Date(`${yearNum}-12-31`),
      };
    }

    const holidays = await this.prisma.holiday.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        name: true,
        date: true,
        isRecurring: true,
      },
      orderBy: { date: 'asc' },
    });

    return {
      data: holidays,
      total: holidays.length,
    };
  }

  async findOne(tenantId: string, id: string) {
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!holiday) {
      throw new NotFoundException('Jour férié non trouvé');
    }

    return holiday;
  }

  async update(tenantId: string, id: string, dto: UpdateHolidayDto) {
    // Vérifier que le jour férié appartient au tenant
    const holiday = await this.prisma.holiday.findFirst({
      where: { id, tenantId },
    });

    if (!holiday) {
      throw new NotFoundException('Jour férié non trouvé');
    }

    // Si le nom ou la date change, vérifier qu'il n'y a pas de doublon
    if (dto.name || dto.date) {
      const name = dto.name || holiday.name;
      const date = dto.date ? new Date(dto.date) : holiday.date;

      const existing = await this.prisma.holiday.findFirst({
        where: {
          tenantId,
          name,
          date,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Un jour férié "${name}" existe déjà pour cette date`,
        );
      }
    }

    return this.prisma.holiday.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    // Vérifier que le jour férié appartient au tenant
    const holiday = await this.prisma.holiday.findFirst({
      where: { id, tenantId },
    });

    if (!holiday) {
      throw new NotFoundException('Jour férié non trouvé');
    }

    await this.prisma.holiday.delete({
      where: { id },
    });

    return { message: 'Jour férié supprimé avec succès' };
  }

  async importFromCsv(tenantId: string, fileBuffer: Buffer) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          // Colonnes attendues: Nom, Date, Type, Récurrent
          const name = row['Nom'] || row['Name'];
          const dateStr = row['Date'];
          const typeStr = row['Type'] || 'NATIONAL';
          const isRecurring = row['Récurrent'] === 'Oui' || row['Recurring'] === 'Yes';

          if (!name || !dateStr) {
            errors.push(`Ligne ignorée: Nom ou Date manquant`);
            skipped++;
            continue;
          }

          // Parser la date (format DD/MM/YYYY ou YYYY-MM-DD)
          let date: Date;
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          } else {
            date = new Date(dateStr);
          }

          // Vérifier si existe déjà
          const existing = await this.prisma.holiday.findFirst({
            where: {
              tenantId,
              name,
              date,
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Créer le jour férié
          await this.prisma.holiday.create({
            data: {
              tenantId,
              name,
              date,
              type: typeStr.toUpperCase() as any,
              isRecurring,
            },
          });

          created++;
        } catch (error) {
          errors.push(`Erreur sur la ligne: ${error.message}`);
          skipped++;
        }
      }

      return {
        success: created,
        skipped,
        errors,
        total: data.length,
      };
    } catch (error) {
      throw new Error(`Erreur lors de l'import CSV: ${error.message}`);
    }
  }
}
