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
exports.HolidaysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const XLSX = require("xlsx");
let HolidaysService = class HolidaysService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(tenantId, dto) {
        const date = new Date(dto.date);
        const existing = await this.prisma.holiday.findFirst({
            where: {
                tenantId,
                name: dto.name,
                date,
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Un jour férié "${dto.name}" existe déjà pour cette date`);
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
    async findAll(tenantId, year) {
        const where = { tenantId };
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
    async findOne(tenantId, id) {
        const holiday = await this.prisma.holiday.findFirst({
            where: {
                id,
                tenantId,
            },
        });
        if (!holiday) {
            throw new common_1.NotFoundException('Jour férié non trouvé');
        }
        return holiday;
    }
    async update(tenantId, id, dto) {
        const holiday = await this.prisma.holiday.findFirst({
            where: { id, tenantId },
        });
        if (!holiday) {
            throw new common_1.NotFoundException('Jour férié non trouvé');
        }
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
                throw new common_1.ConflictException(`Un jour férié "${name}" existe déjà pour cette date`);
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
    async remove(tenantId, id) {
        const holiday = await this.prisma.holiday.findFirst({
            where: { id, tenantId },
        });
        if (!holiday) {
            throw new common_1.NotFoundException('Jour férié non trouvé');
        }
        await this.prisma.holiday.delete({
            where: { id },
        });
        return { message: 'Jour férié supprimé avec succès' };
    }
    async importFromCsv(tenantId, fileBuffer) {
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            let created = 0;
            let skipped = 0;
            const errors = [];
            for (const row of data) {
                try {
                    const name = row['Nom'] || row['Name'];
                    const dateStr = row['Date'];
                    const typeStr = row['Type'] || 'NATIONAL';
                    const isRecurring = row['Récurrent'] === 'Oui' || row['Recurring'] === 'Yes';
                    if (!name || !dateStr) {
                        errors.push(`Ligne ignorée: Nom ou Date manquant`);
                        skipped++;
                        continue;
                    }
                    let date;
                    if (dateStr.includes('/')) {
                        const [day, month, year] = dateStr.split('/');
                        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                    }
                    else {
                        date = new Date(dateStr);
                    }
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
                    await this.prisma.holiday.create({
                        data: {
                            tenantId,
                            name,
                            date,
                            type: typeStr.toUpperCase(),
                            isRecurring,
                        },
                    });
                    created++;
                }
                catch (error) {
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
        }
        catch (error) {
            throw new Error(`Erreur lors de l'import CSV: ${error.message}`);
        }
    }
};
exports.HolidaysService = HolidaysService;
exports.HolidaysService = HolidaysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HolidaysService);
//# sourceMappingURL=holidays.service.js.map