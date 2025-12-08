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
var DataGeneratorHolidaysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorHolidaysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
const morocco_holidays_1 = require("./utils/morocco-holidays");
let DataGeneratorHolidaysService = DataGeneratorHolidaysService_1 = class DataGeneratorHolidaysService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(DataGeneratorHolidaysService_1.name);
    }
    async generateHolidays(tenantId, dto) {
        this.logger.log(`Génération de jours fériés pour le tenant ${tenantId}`);
        const stats = {
            holidaysCreated: 0,
            holidaysSkipped: 0,
        };
        const startYear = dto.startYear || new Date().getFullYear();
        const endYear = dto.endYear || new Date().getFullYear() + 2;
        if (startYear > endYear) {
            throw new common_1.BadRequestException('L\'année de début doit être inférieure ou égale à l\'année de fin');
        }
        const holidays = [];
        if (dto.generateMoroccoHolidays !== false) {
            this.logger.log(`Génération des jours fériés du Maroc pour ${startYear}-${endYear}`);
            const moroccoHolidays = (0, morocco_holidays_1.generateMoroccoHolidays)(startYear, endYear);
            holidays.push(...moroccoHolidays);
        }
        if (dto.customHolidays && Array.isArray(dto.customHolidays)) {
            for (const custom of dto.customHolidays) {
                if (!custom.name || !custom.date) {
                    continue;
                }
                holidays.push({
                    name: custom.name,
                    date: new Date(custom.date),
                    isRecurring: custom.isRecurring || false,
                    type: custom.type || client_1.HolidayType.COMPANY,
                });
            }
        }
        for (const holiday of holidays) {
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
    async getHolidaysStats(tenantId) {
        const holidays = await this.prisma.holiday.findMany({
            where: { tenantId },
            orderBy: { date: 'asc' },
        });
        const byYear = {};
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
    async cleanHolidays(tenantId) {
        const result = await this.prisma.holiday.deleteMany({
            where: { tenantId },
        });
        return {
            success: true,
            deletedCount: result.count,
        };
    }
};
exports.DataGeneratorHolidaysService = DataGeneratorHolidaysService;
exports.DataGeneratorHolidaysService = DataGeneratorHolidaysService = DataGeneratorHolidaysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DataGeneratorHolidaysService);
//# sourceMappingURL=data-generator-holidays.service.js.map