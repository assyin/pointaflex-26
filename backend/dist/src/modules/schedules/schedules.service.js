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
exports.SchedulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const XLSX = require("xlsx");
let SchedulesService = class SchedulesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateDateRange(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        while (currentDate <= end) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }
    async create(tenantId, dto) {
        console.log('SchedulesService.create called with:', {
            tenantId,
            dto: JSON.stringify(dto, null, 2),
        });
        const employee = await this.prisma.employee.findFirst({
            where: {
                id: dto.employeeId,
                tenantId,
            },
        });
        if (!employee) {
            console.log('Employee not found:', dto.employeeId);
            throw new common_1.NotFoundException('Employee not found');
        }
        const shift = await this.prisma.shift.findFirst({
            where: {
                id: dto.shiftId,
                tenantId,
            },
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        if (dto.teamId) {
            const team = await this.prisma.team.findFirst({
                where: {
                    id: dto.teamId,
                    tenantId,
                },
            });
            if (!team) {
                throw new common_1.NotFoundException('Team not found');
            }
        }
        const startDate = new Date(dto.dateDebut);
        startDate.setHours(0, 0, 0, 0);
        const endDate = dto.dateFin
            ? new Date(dto.dateFin)
            : new Date(dto.dateDebut);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < startDate) {
            throw new common_1.BadRequestException('La date de fin doit être supérieure ou égale à la date de début');
        }
        const maxRange = 365;
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > maxRange) {
            throw new common_1.BadRequestException(`L'intervalle ne peut pas dépasser ${maxRange} jours`);
        }
        const dates = this.generateDateRange(startDate, endDate);
        const existingSchedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                employeeId: dto.employeeId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                date: true,
            },
        });
        const existingDates = new Set(existingSchedules.map((s) => s.date.toISOString().split('T')[0]));
        const datesToCreate = dates.filter((date) => {
            const dateStr = date.toISOString().split('T')[0];
            return !existingDates.has(dateStr);
        });
        if (datesToCreate.length === 0) {
            throw new common_1.ConflictException('Tous les plannings pour cette période existent déjà');
        }
        const schedulesToCreate = datesToCreate.map((date) => ({
            tenantId,
            employeeId: dto.employeeId,
            shiftId: dto.shiftId,
            teamId: dto.teamId,
            date,
            customStartTime: dto.customStartTime,
            customEndTime: dto.customEndTime,
            notes: dto.notes,
        }));
        const result = await this.prisma.schedule.createMany({
            data: schedulesToCreate,
            skipDuplicates: true,
        });
        return {
            count: result.count,
            created: result.count,
            skipped: dates.length - datesToCreate.length,
            dateRange: {
                start: dto.dateDebut,
                end: dto.dateFin || dto.dateDebut,
            },
            message: `${result.count} planning(s) créé(s)${dates.length - datesToCreate.length > 0 ? `, ${dates.length - datesToCreate.length} ignoré(s) (déjà existants)` : ''}`,
        };
    }
    async findAll(tenantId, page = 1, limit = 20, filters) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (filters?.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters?.teamId) {
            where.teamId = filters.teamId;
        }
        if (filters?.shiftId) {
            where.shiftId = filters.shiftId;
        }
        if (filters?.siteId) {
            where.employee = {
                siteId: filters.siteId,
            };
        }
        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
        }
        const [data, total] = await Promise.all([
            this.prisma.schedule.findMany({
                where,
                skip,
                take: limit,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            matricule: true,
                            position: true,
                            site: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    shift: true,
                    team: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
                orderBy: [{ date: 'asc' }, { employee: { lastName: 'asc' } }],
            }),
            this.prisma.schedule.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(tenantId, id) {
        const schedule = await this.prisma.schedule.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        position: true,
                    },
                },
                shift: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        if (!schedule) {
            throw new common_1.NotFoundException('Schedule not found');
        }
        return schedule;
    }
    async update(tenantId, id, dto) {
        await this.findOne(tenantId, id);
        if (dto.shiftId) {
            const shift = await this.prisma.shift.findFirst({
                where: {
                    id: dto.shiftId,
                    tenantId,
                },
            });
            if (!shift) {
                throw new common_1.NotFoundException('Shift not found');
            }
        }
        if (dto.teamId) {
            const team = await this.prisma.team.findFirst({
                where: {
                    id: dto.teamId,
                    tenantId,
                },
            });
            if (!team) {
                throw new common_1.NotFoundException('Team not found');
            }
        }
        const updateData = { ...dto };
        if (dto.dateDebut) {
            updateData.date = new Date(dto.dateDebut);
            delete updateData.dateDebut;
            delete updateData.dateFin;
        }
        return this.prisma.schedule.update({
            where: { id },
            data: updateData,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
                shift: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
    }
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.schedule.delete({
            where: { id },
        });
    }
    async removeBulk(tenantId, ids) {
        if (!ids || ids.length === 0) {
            throw new common_1.BadRequestException('Aucun ID fourni pour la suppression');
        }
        const schedules = await this.prisma.schedule.findMany({
            where: {
                id: { in: ids },
                tenantId,
            },
            select: { id: true },
        });
        if (schedules.length !== ids.length) {
            throw new common_1.BadRequestException('Certains plannings n\'existent pas ou n\'appartiennent pas à votre entreprise');
        }
        const result = await this.prisma.schedule.deleteMany({
            where: {
                id: { in: ids },
                tenantId,
            },
        });
        return {
            count: result.count,
            deleted: result.count,
        };
    }
    async getWeekSchedule(tenantId, date, filters) {
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(targetDate.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const where = {
            tenantId,
            date: {
                gte: weekStart,
                lte: weekEnd,
            },
        };
        if (filters?.teamId) {
            where.teamId = filters.teamId;
        }
        if (filters?.siteId) {
            where.employee = {
                siteId: filters.siteId,
            };
        }
        const schedules = await this.prisma.schedule.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        position: true,
                        site: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        department: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        team: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                shift: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: [
                { employee: { lastName: 'asc' } },
                { date: 'asc' },
            ],
        });
        const leaves = await this.prisma.leave.findMany({
            where: {
                tenantId,
                status: 'APPROVED',
                startDate: { lte: weekEnd },
                endDate: { gte: weekStart },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                leaveType: true,
            },
        });
        const replacements = await this.prisma.shiftReplacement.findMany({
            where: {
                tenantId,
                date: {
                    gte: weekStart,
                    lte: weekEnd,
                },
            },
            include: {
                originalEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                replacementEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                shift: true,
            },
        });
        return {
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            schedules,
            leaves,
            replacements,
        };
    }
    async getMonthSchedule(tenantId, date, filters) {
        const targetDate = new Date(date);
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        const where = {
            tenantId,
            date: {
                gte: monthStart,
                lte: monthEnd,
            },
        };
        if (filters?.teamId) {
            where.teamId = filters.teamId;
        }
        if (filters?.siteId) {
            where.employee = {
                siteId: filters.siteId,
            };
        }
        const schedules = await this.prisma.schedule.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                        position: true,
                        site: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        department: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        team: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                shift: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            orderBy: [
                { date: 'asc' },
                { employee: { lastName: 'asc' } },
            ],
        });
        const leaves = await this.prisma.leave.findMany({
            where: {
                tenantId,
                status: 'APPROVED',
                startDate: { lte: monthEnd },
                endDate: { gte: monthStart },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                leaveType: true,
            },
        });
        const replacements = await this.prisma.shiftReplacement.findMany({
            where: {
                tenantId,
                date: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
            include: {
                originalEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                replacementEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                shift: true,
            },
        });
        return {
            monthStart: monthStart.toISOString(),
            monthEnd: monthEnd.toISOString(),
            schedules,
            leaves,
            replacements,
        };
    }
    async createBulk(tenantId, schedules) {
        if (!schedules || schedules.length === 0) {
            throw new common_1.BadRequestException('Schedules array cannot be empty');
        }
        const employeeIds = [...new Set(schedules.map((s) => s.employeeId))];
        const shiftIds = [...new Set(schedules.map((s) => s.shiftId))];
        const teamIds = schedules
            .map((s) => s.teamId)
            .filter((id) => id)
            .filter((id, index, self) => self.indexOf(id) === index);
        const [employees, shifts, teams] = await Promise.all([
            this.prisma.employee.findMany({
                where: {
                    id: { in: employeeIds },
                    tenantId,
                },
            }),
            this.prisma.shift.findMany({
                where: {
                    id: { in: shiftIds },
                    tenantId,
                },
            }),
            teamIds.length > 0
                ? this.prisma.team.findMany({
                    where: {
                        id: { in: teamIds },
                        tenantId,
                    },
                })
                : [],
        ]);
        if (employees.length !== employeeIds.length) {
            throw new common_1.NotFoundException('One or more employees not found');
        }
        if (shifts.length !== shiftIds.length) {
            throw new common_1.NotFoundException('One or more shifts not found');
        }
        if (teamIds.length > 0 && teams.length !== teamIds.length) {
            throw new common_1.NotFoundException('One or more teams not found');
        }
        const schedulesToCreate = [];
        for (const schedule of schedules) {
            const startDate = new Date(schedule.dateDebut);
            startDate.setHours(0, 0, 0, 0);
            const endDate = schedule.dateFin
                ? new Date(schedule.dateFin)
                : new Date(schedule.dateDebut);
            endDate.setHours(0, 0, 0, 0);
            if (endDate < startDate) {
                continue;
            }
            const dates = this.generateDateRange(startDate, endDate);
            dates.forEach((date) => {
                schedulesToCreate.push({
                    tenantId,
                    employeeId: schedule.employeeId,
                    shiftId: schedule.shiftId,
                    teamId: schedule.teamId,
                    date,
                    customStartTime: schedule.customStartTime,
                    customEndTime: schedule.customEndTime,
                    notes: schedule.notes,
                });
            });
        }
        if (schedulesToCreate.length === 0) {
            throw new common_1.BadRequestException('No valid schedules to create');
        }
        const created = await this.prisma.schedule.createMany({
            data: schedulesToCreate,
            skipDuplicates: true,
        });
        return {
            count: created.count,
            total: schedulesToCreate.length,
            skipped: schedulesToCreate.length - created.count,
            message: `Successfully created ${created.count} schedule(s)${schedulesToCreate.length - created.count > 0 ? `, ${schedulesToCreate.length - created.count} skipped (already exist)` : ''}`,
        };
    }
    async createReplacement(tenantId, dto) {
        const [originalEmployee, replacementEmployee] = await Promise.all([
            this.prisma.employee.findFirst({
                where: { id: dto.originalEmployeeId, tenantId },
            }),
            this.prisma.employee.findFirst({
                where: { id: dto.replacementEmployeeId, tenantId },
            }),
        ]);
        if (!originalEmployee || !replacementEmployee) {
            throw new common_1.NotFoundException('One or more employees not found');
        }
        const shift = await this.prisma.shift.findFirst({
            where: { id: dto.shiftId, tenantId },
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        return this.prisma.shiftReplacement.create({
            data: {
                tenantId,
                date: new Date(dto.date),
                originalEmployeeId: dto.originalEmployeeId,
                replacementEmployeeId: dto.replacementEmployeeId,
                shiftId: dto.shiftId,
                reason: dto.reason,
                status: 'PENDING',
            },
            include: {
                originalEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
                replacementEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
                shift: true,
            },
        });
    }
    async findAllReplacements(tenantId, filters) {
        const where = { tenantId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            where.date = {};
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate);
            }
        }
        return this.prisma.shiftReplacement.findMany({
            where,
            include: {
                originalEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
                replacementEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        matricule: true,
                    },
                },
                shift: true,
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async approveReplacement(tenantId, id, approvedBy) {
        const replacement = await this.prisma.shiftReplacement.findFirst({
            where: { id, tenantId },
        });
        if (!replacement) {
            throw new common_1.NotFoundException('Replacement not found');
        }
        return this.prisma.shiftReplacement.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvedAt: new Date(),
            },
            include: {
                originalEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                replacementEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                shift: true,
            },
        });
    }
    async rejectReplacement(tenantId, id, approvedBy) {
        const replacement = await this.prisma.shiftReplacement.findFirst({
            where: { id, tenantId },
        });
        if (!replacement) {
            throw new common_1.NotFoundException('Replacement not found');
        }
        return this.prisma.shiftReplacement.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedBy,
                approvedAt: new Date(),
            },
            include: {
                originalEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                replacementEmployee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                shift: true,
            },
        });
    }
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            return null;
        }
        const trimmed = dateStr.trim();
        const frenchFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const frenchMatch = trimmed.match(frenchFormat);
        if (frenchMatch) {
            const [, day, month, year] = frenchMatch;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (date.getFullYear() === parseInt(year) &&
                date.getMonth() === parseInt(month) - 1 &&
                date.getDate() === parseInt(day)) {
                return date;
            }
        }
        const isoFormat = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const isoMatch = trimmed.match(isoFormat);
        if (isoMatch) {
            const [, year, month, day] = isoMatch;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (date.getFullYear() === parseInt(year) &&
                date.getMonth() === parseInt(month) - 1 &&
                date.getDate() === parseInt(day)) {
                return date;
            }
        }
        if (!isNaN(Number(trimmed)) && Number(trimmed) > 0) {
            const excelEpoch = new Date(1899, 11, 30);
            const days = Number(trimmed);
            const date = new Date(excelEpoch);
            date.setDate(date.getDate() + days);
            return date;
        }
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
        return null;
    }
    async importFromExcel(tenantId, fileBuffer) {
        const result = {
            success: 0,
            failed: 0,
            errors: [],
            imported: [],
        };
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const dataRows = rows.slice(1);
            const [employees, shifts, teams] = await Promise.all([
                this.prisma.employee.findMany({
                    where: { tenantId },
                    select: { id: true, matricule: true },
                }),
                this.prisma.shift.findMany({
                    where: { tenantId },
                    select: { id: true, code: true },
                }),
                this.prisma.team.findMany({
                    where: { tenantId },
                    select: { id: true, code: true },
                }),
            ]);
            const employeeMap = new Map(employees.map((e) => [e.matricule.toUpperCase(), e.id]));
            const shiftMap = new Map(shifts.map((s) => [s.code.toUpperCase(), s.id]));
            const teamMap = new Map(teams.map((t) => [t.code.toUpperCase(), t.id]));
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rowNumber = i + 2;
                try {
                    if (!row || row.length === 0 || !row[0]) {
                        continue;
                    }
                    const matricule = String(row[0] || '').trim().toUpperCase();
                    const dateDebutStr = String(row[1] || '').trim();
                    const dateFinStr = row[2] ? String(row[2]).trim() : undefined;
                    const shiftCode = String(row[3] || '').trim().toUpperCase();
                    const customStartTime = row[4] ? String(row[4]).trim() : undefined;
                    const customEndTime = row[5] ? String(row[5]).trim() : undefined;
                    const teamCode = row[6] ? String(row[6]).trim().toUpperCase() : undefined;
                    const notes = row[7] ? String(row[7]).trim() : undefined;
                    if (!matricule) {
                        result.errors.push({
                            row: rowNumber,
                            error: 'Matricule manquant',
                        });
                        result.failed++;
                        continue;
                    }
                    if (!dateDebutStr) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: 'Date de début manquante',
                        });
                        result.failed++;
                        continue;
                    }
                    if (!shiftCode) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: 'Code shift manquant',
                        });
                        result.failed++;
                        continue;
                    }
                    let dateDebut;
                    let dateFin;
                    try {
                        dateDebut = this.parseDate(dateDebutStr);
                        if (!dateDebut || isNaN(dateDebut.getTime())) {
                            throw new Error('Invalid date');
                        }
                        dateDebut.setHours(0, 0, 0, 0);
                    }
                    catch {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: `Date de début invalide: ${dateDebutStr}. Format attendu: DD/MM/YYYY ou YYYY-MM-DD`,
                        });
                        result.failed++;
                        continue;
                    }
                    if (dateFinStr) {
                        try {
                            dateFin = this.parseDate(dateFinStr);
                            if (!dateFin || isNaN(dateFin.getTime())) {
                                throw new Error('Invalid date');
                            }
                            dateFin.setHours(0, 0, 0, 0);
                            if (dateFin < dateDebut) {
                                result.errors.push({
                                    row: rowNumber,
                                    matricule,
                                    error: 'La date de fin doit être supérieure ou égale à la date de début',
                                });
                                result.failed++;
                                continue;
                            }
                        }
                        catch {
                            result.errors.push({
                                row: rowNumber,
                                matricule,
                                error: `Date de fin invalide: ${dateFinStr}. Format attendu: DD/MM/YYYY ou YYYY-MM-DD`,
                            });
                            result.failed++;
                            continue;
                        }
                    }
                    const employeeId = employeeMap.get(matricule);
                    if (!employeeId) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: `Employé avec matricule ${matricule} introuvable`,
                        });
                        result.failed++;
                        continue;
                    }
                    const shiftId = shiftMap.get(shiftCode);
                    if (!shiftId) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: `Shift avec code ${shiftCode} introuvable`,
                        });
                        result.failed++;
                        continue;
                    }
                    let teamId;
                    if (teamCode) {
                        teamId = teamMap.get(teamCode);
                        if (!teamId) {
                            result.errors.push({
                                row: rowNumber,
                                matricule,
                                error: `Équipe avec code ${teamCode} introuvable`,
                            });
                            result.failed++;
                            continue;
                        }
                    }
                    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (customStartTime && !timeRegex.test(customStartTime)) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: `Heure début invalide: ${customStartTime}. Format attendu: HH:mm`,
                        });
                        result.failed++;
                        continue;
                    }
                    if (customEndTime && !timeRegex.test(customEndTime)) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: `Heure fin invalide: ${customEndTime}. Format attendu: HH:mm`,
                        });
                        result.failed++;
                        continue;
                    }
                    const endDate = dateFin || dateDebut;
                    const datesToCreate = this.generateDateRange(dateDebut, endDate);
                    const existingSchedules = await this.prisma.schedule.findMany({
                        where: {
                            tenantId,
                            employeeId,
                            date: {
                                gte: dateDebut,
                                lte: endDate,
                            },
                        },
                        select: {
                            date: true,
                        },
                    });
                    const existingDates = new Set(existingSchedules.map((s) => s.date.toISOString().split('T')[0]));
                    const datesToCreateFiltered = datesToCreate.filter((date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        return !existingDates.has(dateStr);
                    });
                    if (datesToCreateFiltered.length === 0) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: `Tous les plannings pour cette période existent déjà`,
                        });
                        result.failed++;
                        continue;
                    }
                    const schedulesToCreate = datesToCreateFiltered.map((date) => ({
                        tenantId,
                        employeeId,
                        shiftId,
                        date,
                        teamId,
                        customStartTime: customStartTime || null,
                        customEndTime: customEndTime || null,
                        notes: notes || null,
                    }));
                    await this.prisma.schedule.createMany({
                        data: schedulesToCreate,
                        skipDuplicates: true,
                    });
                    result.success += schedulesToCreate.length;
                    result.imported.push({
                        matricule,
                        date: `${dateDebutStr}${dateFinStr ? ` - ${dateFinStr}` : ''}`,
                        shiftCode,
                    });
                }
                catch (error) {
                    result.errors.push({
                        row: rowNumber,
                        error: error.message || 'Erreur inconnue',
                    });
                    result.failed++;
                }
            }
        }
        catch (error) {
            throw new common_1.BadRequestException(`Erreur lors de la lecture du fichier: ${error.message}`);
        }
        return result;
    }
};
exports.SchedulesService = SchedulesService;
exports.SchedulesService = SchedulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulesService);
//# sourceMappingURL=schedules.service.js.map