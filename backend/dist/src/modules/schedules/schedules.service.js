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
const client_1 = require("@prisma/client");
const manager_level_util_1 = require("../../common/utils/manager-level.util");
const XLSX = require("xlsx");
let SchedulesService = class SchedulesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    parseDateString(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    formatDateToISO(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    generateDateRange(startDate, endDate, filters) {
        const validDates = [];
        const excludedDates = [];
        const currentDate = new Date(startDate);
        currentDate.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setUTCHours(0, 0, 0, 0);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            let excluded = false;
            let reason = '';
            let details = '';
            if (filters?.workingDays && filters.workingDays.length > 0) {
                const dayOfWeek = currentDate.getDay();
                const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                if (!filters.workingDays.includes(normalizedDayOfWeek)) {
                    const dayNames = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
                    excluded = true;
                    reason = 'NON_OUVRABLE';
                    details = `Jour non ouvrable (${dayNames[normalizedDayOfWeek]}) selon la configuration du tenant`;
                }
            }
            if (!excluded && filters?.holidays && filters.holidays.length > 0) {
                const isHoliday = filters.holidays.some((h) => {
                    const holidayDate = new Date(h.date);
                    holidayDate.setUTCHours(0, 0, 0, 0);
                    return holidayDate.getTime() === currentDate.getTime();
                });
                if (isHoliday) {
                }
            }
            if (!excluded && filters?.employeeId && filters?.leaves && filters.leaves.length > 0) {
                const isOnLeave = filters.leaves.some((leave) => {
                    const leaveStart = new Date(leave.startDate);
                    leaveStart.setUTCHours(0, 0, 0, 0);
                    const leaveEnd = new Date(leave.endDate);
                    leaveEnd.setUTCHours(23, 59, 59, 999);
                    return currentDate >= leaveStart && currentDate <= leaveEnd;
                });
                if (isOnLeave) {
                    const leave = filters.leaves.find((l) => {
                        const leaveStart = new Date(l.startDate);
                        leaveStart.setUTCHours(0, 0, 0, 0);
                        const leaveEnd = new Date(l.endDate);
                        leaveEnd.setUTCHours(23, 59, 59, 999);
                        return currentDate >= leaveStart && currentDate <= leaveEnd;
                    });
                    excluded = true;
                    reason = 'CONGE';
                    details = `Congé approuvé${leave?.leaveType?.name ? `: ${leave.leaveType.name}` : ''}`;
                }
            }
            if (!excluded && filters?.employeeId && filters?.recoveryDays && filters.recoveryDays.length > 0) {
                const isRecoveryDay = filters.recoveryDays.some((recovery) => {
                    const recoveryStart = new Date(recovery.startDate);
                    recoveryStart.setUTCHours(0, 0, 0, 0);
                    const recoveryEnd = new Date(recovery.endDate);
                    recoveryEnd.setUTCHours(23, 59, 59, 999);
                    return currentDate >= recoveryStart && currentDate <= recoveryEnd;
                });
                if (isRecoveryDay) {
                    excluded = true;
                    reason = 'RECUPERATION';
                    details = 'Jour de récupération approuvé';
                }
            }
            if (excluded) {
                excludedDates.push({
                    date: new Date(currentDate),
                    reason,
                    details,
                });
            }
            else {
                validDates.push(new Date(currentDate));
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        return { validDates, excludedDates };
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
            select: {
                id: true,
                firstName: true,
                lastName: true,
                matricule: true,
                isActive: true,
                teamId: true,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`L'employé avec l'ID ${dto.employeeId} n'existe pas ou n'appartient pas à votre entreprise`);
        }
        if (!employee.isActive) {
            throw new common_1.BadRequestException(`L'employé ${employee.firstName} ${employee.lastName} (${employee.matricule}) n'est pas actif. Impossible de créer un planning pour un employé inactif.`);
        }
        const tenantSettings = await this.prisma.tenantSettings.findUnique({
            where: { tenantId },
            select: { workingDays: true },
        });
        const workingDays = tenantSettings?.workingDays || [1, 2, 3, 4, 5, 6];
        const shift = await this.prisma.shift.findFirst({
            where: {
                id: dto.shiftId,
                tenantId,
            },
        });
        if (!shift) {
            throw new common_1.NotFoundException(`Le shift avec l'ID ${dto.shiftId} n'existe pas ou n'appartient pas à votre entreprise`);
        }
        if (dto.teamId) {
            const team = await this.prisma.team.findFirst({
                where: {
                    id: dto.teamId,
                    tenantId,
                },
            });
            if (!team) {
                throw new common_1.NotFoundException(`L'équipe avec l'ID ${dto.teamId} n'existe pas ou n'appartient pas à votre entreprise`);
            }
            if (employee.teamId && employee.teamId !== dto.teamId) {
                throw new common_1.BadRequestException(`L'employé ${employee.firstName} ${employee.lastName} (${employee.matricule}) n'appartient pas à l'équipe sélectionnée. Veuillez sélectionner l'équipe correcte ou laisser ce champ vide.`);
            }
        }
        const startDate = this.parseDateString(dto.dateDebut);
        const endDate = dto.dateFin
            ? this.parseDateString(dto.dateFin)
            : this.parseDateString(dto.dateDebut);
        if (endDate < startDate) {
            throw new common_1.BadRequestException('La date de fin doit être supérieure ou égale à la date de début');
        }
        const maxRange = 365;
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > maxRange) {
            throw new common_1.BadRequestException(`L'intervalle ne peut pas dépasser ${maxRange} jours. Vous avez sélectionné ${daysDiff} jour(s).`);
        }
        if (dto.customStartTime && dto.customEndTime) {
            const [startH, startM] = dto.customStartTime.split(':').map(Number);
            const [endH, endM] = dto.customEndTime.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            if (endMinutes <= startMinutes) {
                throw new common_1.BadRequestException(`L'heure de fin (${dto.customEndTime}) doit être supérieure à l'heure de début (${dto.customStartTime})`);
            }
        }
        const holidays = await this.prisma.holiday.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                date: true,
                name: true,
            },
        });
        const leaves = await this.prisma.leave.findMany({
            where: {
                tenantId,
                employeeId: dto.employeeId,
                status: { in: ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'] },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
            select: {
                startDate: true,
                endDate: true,
                leaveType: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        const recoveryDays = await this.prisma.recoveryDay.findMany({
            where: {
                tenantId,
                employeeId: dto.employeeId,
                status: { in: [client_1.RecoveryDayStatus.APPROVED, client_1.RecoveryDayStatus.PENDING] },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
            select: {
                startDate: true,
                endDate: true,
            },
        });
        const { validDates: dates, excludedDates } = this.generateDateRange(startDate, endDate, {
            workingDays,
            holidays: holidays.map((h) => ({ date: h.date, name: h.name })),
            employeeId: dto.employeeId,
            tenantId,
            leaves: leaves.map((l) => ({
                startDate: l.startDate,
                endDate: l.endDate,
                leaveType: l.leaveType ? { name: l.leaveType.name } : undefined,
            })),
            recoveryDays: recoveryDays.map((r) => ({
                startDate: r.startDate,
                endDate: r.endDate,
            })),
        });
        const queryStartDate = new Date(startDate);
        queryStartDate.setUTCHours(0, 0, 0, 0);
        const queryEndDate = new Date(endDate);
        queryEndDate.setUTCHours(23, 59, 59, 999);
        console.log(`[createSchedule] Vérification des conflits pour ${employee.firstName} ${employee.lastName}`);
        console.log(`[createSchedule] Plage recherchée: ${queryStartDate.toISOString()} à ${queryEndDate.toISOString()}`);
        console.log(`[createSchedule] Shift: ${dto.shiftId}`);
        const existingSchedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                employeeId: dto.employeeId,
                shiftId: dto.shiftId,
                status: 'PUBLISHED',
                date: {
                    gte: queryStartDate,
                    lte: queryEndDate,
                },
            },
            select: {
                date: true,
                shiftId: true,
                shift: {
                    select: {
                        name: true,
                        code: true,
                    },
                },
            },
        });
        console.log(`[createSchedule] ${existingSchedules.length} planning(s) trouvé(s):`);
        existingSchedules.forEach((s) => {
            console.log(`   - Date: ${s.date.toISOString()}, Shift: ${s.shift.name}`);
        });
        const existingDatesMap = new Map();
        existingSchedules.forEach((s) => {
            const dateStr = this.formatDateToISO(s.date);
            console.log(`   - Normalisation: ${s.date.toISOString()} → ${dateStr}`);
            existingDatesMap.set(dateStr, {
                shiftId: s.shiftId,
                shiftName: s.shift.name,
                shiftCode: s.shift.code,
            });
        });
        console.log(`[createSchedule] Dates à créer (avant filtrage):`);
        dates.forEach((d) => console.log(`   - ${this.formatDateToISO(d)}`));
        const datesToCreate = dates.filter((date) => {
            const dateStr = this.formatDateToISO(date);
            const exists = existingDatesMap.has(dateStr);
            if (exists) {
                console.log(`   ❌ ${dateStr} existe déjà`);
            }
            return !exists;
        });
        console.log(`[createSchedule] Dates à créer (après filtrage): ${datesToCreate.length}`);
        if (datesToCreate.length === 0) {
            const startDateStr = this.formatDateToISO(startDate);
            const endDateStr = this.formatDateToISO(endDate);
            const dateRangeStr = startDateStr === endDateStr
                ? `le ${this.formatDate(startDateStr)}`
                : `la période du ${this.formatDate(startDateStr)} au ${this.formatDate(endDateStr)}`;
            const conflictingDates = dates
                .filter((date) => existingDatesMap.has(this.formatDateToISO(date)))
                .map((date) => {
                const dateStr = this.formatDateToISO(date);
                const existing = existingDatesMap.get(dateStr);
                return {
                    date: this.formatDate(dateStr),
                    shift: existing?.shiftName || existing?.shiftCode || 'shift inconnu',
                };
            });
            let errorMessage = `Un planning existe déjà pour le shift "${shift.name}" `;
            errorMessage += `pour ${dateRangeStr} pour l'employé ${employee.firstName} ${employee.lastName}. `;
            if (conflictingDates.length === 1) {
                errorMessage += `Le planning existant est le ${conflictingDates[0].date}. `;
            }
            else if (conflictingDates.length > 1) {
                errorMessage += `Plannings existants : `;
                errorMessage += conflictingDates.map(c => c.date).join(', ') + '. ';
            }
            errorMessage += `Veuillez modifier le planning existant, choisir un autre shift, ou choisir une autre date.`;
            throw new common_1.ConflictException(errorMessage);
        }
        const schedulesToCreate = datesToCreate.map((date) => {
            const normalizedDate = new Date(date);
            normalizedDate.setUTCHours(0, 0, 0, 0);
            return {
                tenantId,
                employeeId: dto.employeeId,
                shiftId: dto.shiftId,
                teamId: dto.teamId,
                date: normalizedDate,
                customStartTime: dto.customStartTime,
                customEndTime: dto.customEndTime,
                notes: dto.notes,
            };
        });
        const result = await this.prisma.schedule.createMany({
            data: schedulesToCreate,
            skipDuplicates: true,
        });
        if (result.count === 0 && schedulesToCreate.length > 0) {
            const startDateStr = this.formatDateToISO(startDate);
            const endDateStr = this.formatDateToISO(endDate);
            const dateRangeStr = startDateStr === endDateStr
                ? `le ${this.formatDate(startDateStr)}`
                : `la période du ${this.formatDate(startDateStr)} au ${this.formatDate(endDateStr)}`;
            throw new common_1.ConflictException(`Impossible de créer le planning pour le shift "${shift.name}" pour ${dateRangeStr} pour l'employé ${employee.firstName} ${employee.lastName}. Un planning existe déjà pour ce shift pour cette période. Veuillez modifier le planning existant, choisir un autre shift, ou choisir une autre date.`);
        }
        const formattedExcludedDates = excludedDates.map((excluded) => ({
            date: this.formatDateToISO(excluded.date),
            reason: excluded.reason,
            details: excluded.details,
        }));
        const conflictingDates = dates
            .filter((date) => existingDatesMap.has(this.formatDateToISO(date)))
            .map((date) => {
            const dateStr = this.formatDateToISO(date);
            const existing = existingDatesMap.get(dateStr);
            return {
                date: dateStr,
                shift: existing?.shiftName || existing?.shiftCode || 'shift inconnu',
                reason: 'DEJA_EXISTANT',
                details: `Planning déjà existant pour le shift "${existing?.shiftName || existing?.shiftCode || 'shift inconnu'}"`,
            };
        });
        const totalExcluded = formattedExcludedDates.length + conflictingDates.length;
        let message = `${result.count} planning(s) créé(s)`;
        if (totalExcluded > 0) {
            const excludedReasons = new Map();
            formattedExcludedDates.forEach((ex) => {
                excludedReasons.set(ex.reason, (excludedReasons.get(ex.reason) || 0) + 1);
            });
            conflictingDates.forEach(() => {
                excludedReasons.set('DEJA_EXISTANT', (excludedReasons.get('DEJA_EXISTANT') || 0) + 1);
            });
            const reasonLabels = {
                NON_OUVRABLE: 'jours non ouvrables',
                JOUR_FERIE: 'jours fériés',
                CONGE: 'jours en congé',
                RECUPERATION: 'jours de récupération',
                DEJA_EXISTANT: 'jours avec planning existant',
            };
            const reasonsText = Array.from(excludedReasons.entries())
                .map(([reason, count]) => `${count} ${reasonLabels[reason] || reason}`)
                .join(', ');
            message += `, ${totalExcluded} jour(s) exclu(s) (${reasonsText})`;
        }
        return {
            count: result.count,
            created: result.count,
            skipped: dates.length - datesToCreate.length,
            excluded: formattedExcludedDates.length,
            conflictingDates: conflictingDates.length > 0 ? conflictingDates : undefined,
            excludedDates: formattedExcludedDates.length > 0 ? formattedExcludedDates : undefined,
            dateRange: {
                start: dto.dateDebut,
                end: dto.dateFin || dto.dateDebut,
            },
            message,
            summary: {
                totalDatesInRange: dates.length + excludedDates.length,
                validDates: dates.length,
                created: result.count,
                excludedByReason: {
                    nonOuvrable: formattedExcludedDates.filter((e) => e.reason === 'NON_OUVRABLE').length,
                    jourFerie: formattedExcludedDates.filter((e) => e.reason === 'JOUR_FERIE').length,
                    conge: formattedExcludedDates.filter((e) => e.reason === 'CONGE').length,
                    recuperation: formattedExcludedDates.filter((e) => e.reason === 'RECUPERATION').length,
                    dejaExistant: conflictingDates.length,
                },
            },
        };
    }
    formatDate(dateStr) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    async findAll(tenantId, page = 1, limit = 20, filters, userId, userPermissions) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        const hasViewAll = userPermissions?.includes('schedule.view_all');
        const hasViewOwn = userPermissions?.includes('schedule.view_own');
        const hasViewTeam = userPermissions?.includes('schedule.view_team');
        const hasViewDepartment = userPermissions?.includes('schedule.view_department');
        const hasViewSite = userPermissions?.includes('schedule.view_site');
        if (userId) {
            const managerLevel = await (0, manager_level_util_1.getManagerLevel)(this.prisma, userId, tenantId);
            if (managerLevel.type === 'DEPARTMENT') {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return {
                        data: [],
                        meta: {
                            total: 0,
                            page,
                            limit,
                            totalPages: 0,
                        },
                    };
                }
                where.employeeId = { in: managedEmployeeIds };
            }
            else if (managerLevel.type === 'SITE') {
                const managedEmployeeIds = await (0, manager_level_util_1.getManagedEmployeeIds)(this.prisma, managerLevel, tenantId);
                if (managedEmployeeIds.length === 0) {
                    return {
                        data: [],
                        meta: {
                            total: 0,
                            page,
                            limit,
                            totalPages: 0,
                        },
                    };
                }
                where.employeeId = { in: managedEmployeeIds };
            }
            else if (managerLevel.type === 'TEAM') {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { teamId: true },
                });
                if (employee?.teamId) {
                    where.teamId = employee.teamId;
                }
                else {
                    return {
                        data: [],
                        meta: {
                            total: 0,
                            page,
                            limit,
                            totalPages: 0,
                        },
                    };
                }
            }
            else if (hasViewOwn && !hasViewAll) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, tenantId },
                    select: { id: true },
                });
                if (employee) {
                    where.employeeId = employee.id;
                }
                else {
                    return {
                        data: [],
                        meta: {
                            total: 0,
                            page,
                            limit,
                            totalPages: 0,
                        },
                    };
                }
            }
        }
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
            const { validDates: dates } = this.generateDateRange(startDate, endDate);
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
                    const { validDates: datesToCreate } = this.generateDateRange(dateDebut, endDate);
                    const existingSchedules = await this.prisma.schedule.findMany({
                        where: {
                            tenantId,
                            employeeId,
                            shiftId,
                            status: 'PUBLISHED',
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
                            error: `Tous les plannings pour le shift ${shiftCode} pour cette période existent déjà`,
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
    async importFromWeeklyCalendar(tenantId, fileBuffer) {
        const result = {
            success: 0,
            failed: 0,
            errors: [],
            imported: [],
        };
        try {
            const XLSX = require('xlsx');
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const planningSheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes('planning') || name === workbook.SheetNames[0]);
            if (!planningSheetName) {
                throw new common_1.BadRequestException('Feuille "Planning" introuvable dans le fichier');
            }
            const worksheet = workbook.Sheets[planningSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            let weekStartDate = null;
            let dataStartRow = 0;
            for (let i = 0; i < Math.min(5, rows.length); i++) {
                const row = rows[i];
                if (row && row[0]) {
                    const firstCell = String(row[0]).toLowerCase();
                    if (firstCell.includes('semaine du') || firstCell.includes('semaine')) {
                        for (let j = 1; j < row.length; j++) {
                            if (row[j]) {
                                const dateVal = this.parseDate(String(row[j]));
                                if (dateVal && !isNaN(dateVal.getTime())) {
                                    weekStartDate = dateVal;
                                    break;
                                }
                            }
                        }
                        dataStartRow = i + 1;
                        break;
                    }
                }
            }
            if (!weekStartDate) {
                for (let i = 0; i < Math.min(5, rows.length); i++) {
                    const row = rows[i];
                    if (row && row[0] && String(row[0]).toLowerCase().includes('matricule')) {
                        dataStartRow = i + 1;
                        const today = new Date();
                        const dayOfWeek = today.getDay();
                        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                        weekStartDate = new Date(today);
                        weekStartDate.setDate(today.getDate() + diff);
                        weekStartDate.setHours(0, 0, 0, 0);
                        result.errors.push({
                            row: 0,
                            error: `Date de semaine non trouvée, utilisation de la semaine courante: ${weekStartDate.toLocaleDateString('fr-FR')}`,
                        });
                        break;
                    }
                }
            }
            if (!weekStartDate) {
                throw new common_1.BadRequestException('Impossible de déterminer la date de début de semaine. Ajoutez une ligne "Semaine du" avec la date.');
            }
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStartDate);
                date.setDate(weekStartDate.getDate() + i);
                date.setHours(0, 0, 0, 0);
                weekDates.push(date);
            }
            const [employees, shifts] = await Promise.all([
                this.prisma.employee.findMany({
                    where: { tenantId },
                    select: { id: true, matricule: true, firstName: true, lastName: true },
                }),
                this.prisma.shift.findMany({
                    where: { tenantId },
                    select: { id: true, code: true, name: true },
                }),
            ]);
            const employeeMap = new Map(employees.map((e) => [e.matricule.toUpperCase(), e.id]));
            const shiftMap = new Map(shifts.map((s) => [s.code.toUpperCase(), s.id]));
            const shiftNameMap = new Map(shifts.map((s) => [s.name.toUpperCase(), s.id]));
            const skipCodes = new Set(['-', 'R', 'C', 'REPOS', 'CONGE', 'CONGÉ', 'REC', 'RECUP', 'RÉCUP', '']);
            let headerRow = null;
            for (let i = dataStartRow - 1; i >= 0; i--) {
                const row = rows[i];
                if (row && row[0] && String(row[0]).toLowerCase().includes('matricule')) {
                    headerRow = row;
                    break;
                }
            }
            let dayStartCol = 3;
            if (headerRow) {
                for (let j = 0; j < headerRow.length; j++) {
                    const header = String(headerRow[j] || '').toLowerCase();
                    if (header.includes('lun') || header.includes('mon')) {
                        dayStartCol = j;
                        break;
                    }
                }
            }
            const dataRows = rows.slice(dataStartRow);
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i];
                const rowNumber = dataStartRow + i + 1;
                if (!row || row.length === 0 || !row[0]) {
                    continue;
                }
                const matricule = String(row[0] || '').trim().toUpperCase();
                if (!matricule || matricule === 'TOTAL' || matricule.includes('TOTAL')) {
                    continue;
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
                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                    const colIndex = dayStartCol + dayIndex;
                    const cellValue = row[colIndex] ? String(row[colIndex]).trim().toUpperCase() : '';
                    if (!cellValue || skipCodes.has(cellValue)) {
                        continue;
                    }
                    let shiftCode = cellValue;
                    let customStartTime = null;
                    let customEndTime = null;
                    const timeMatch = cellValue.match(/^([A-Z0-9-]+)\((\d{1,2}:\d{2})-(\d{1,2}:\d{2})\)$/);
                    if (timeMatch) {
                        shiftCode = timeMatch[1];
                        customStartTime = timeMatch[2];
                        customEndTime = timeMatch[3];
                    }
                    let shiftId = shiftMap.get(shiftCode);
                    if (!shiftId) {
                        shiftId = shiftNameMap.get(shiftCode);
                    }
                    if (!shiftId) {
                        result.errors.push({
                            row: rowNumber,
                            matricule,
                            error: `Shift "${cellValue}" non reconnu pour le jour ${dayIndex + 1}. Codes disponibles: ${Array.from(shiftMap.keys()).join(', ')}`,
                        });
                        result.failed++;
                        continue;
                    }
                    const scheduleDate = weekDates[dayIndex];
                    const existingSchedule = await this.prisma.schedule.findFirst({
                        where: {
                            tenantId,
                            employeeId,
                            shiftId,
                            date: scheduleDate,
                            status: 'PUBLISHED',
                        },
                    });
                    if (existingSchedule) {
                        continue;
                    }
                    try {
                        await this.prisma.schedule.create({
                            data: {
                                tenantId,
                                employeeId,
                                shiftId,
                                date: scheduleDate,
                                customStartTime,
                                customEndTime,
                                status: 'PUBLISHED',
                            },
                        });
                        result.success++;
                    }
                    catch (error) {
                        if (!error.message?.includes('Unique constraint')) {
                            result.errors.push({
                                row: rowNumber,
                                matricule,
                                error: `Erreur création planning: ${error.message}`,
                            });
                            result.failed++;
                        }
                    }
                }
                result.imported.push({
                    matricule,
                    date: `Semaine du ${weekStartDate.toLocaleDateString('fr-FR')}`,
                    shiftCode: 'Multiple',
                });
            }
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Erreur lors de la lecture du fichier: ${error.message}`);
        }
        return result;
    }
    async generateWeeklyCalendarTemplate(tenantId) {
        const XLSX = require('xlsx');
        const shifts = await this.prisma.shift.findMany({
            where: { tenantId },
            select: { code: true, name: true, startTime: true, endTime: true, isNightShift: true },
            orderBy: { code: 'asc' },
        });
        const employees = await this.prisma.employee.findMany({
            where: { tenantId, isActive: true },
            include: {
                department: { select: { name: true } },
            },
            orderBy: [
                { department: { name: 'asc' } },
                { lastName: 'asc' },
            ],
        });
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        const dayHeaders = [];
        const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dayHeaders.push(`${dayNames[i]} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`);
        }
        const planningData = [
            ['PLANNING HEBDOMADAIRE - CALENDRIER'],
            [],
            ['Semaine du', monday.toLocaleDateString('fr-FR'), '', '', '', '', '', '', '', ''],
            [],
            ['Matricule', 'Nom', 'Prénom', 'Département', ...dayHeaders],
        ];
        for (const emp of employees) {
            planningData.push([
                emp.matricule,
                emp.lastName,
                emp.firstName,
                emp.department?.name || '-',
                '', '', '', '', '', '', ''
            ]);
        }
        planningData.push([]);
        planningData.push(['', '', '', 'TOTAL', '', '', '', '', '', '', '']);
        const workbook = XLSX.utils.book_new();
        const planningSheet = XLSX.utils.aoa_to_sheet(planningData);
        planningSheet['!cols'] = [
            { wch: 12 },
            { wch: 18 },
            { wch: 18 },
            { wch: 15 },
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(workbook, planningSheet, 'Planning');
        const referenceData = [
            ['CODES SHIFTS DISPONIBLES'],
            [],
            ['Code', 'Nom du Shift', 'Heure Début', 'Heure Fin', 'Shift Nuit'],
        ];
        for (const shift of shifts) {
            referenceData.push([
                shift.code,
                shift.name,
                shift.startTime,
                shift.endTime,
                shift.isNightShift ? 'Oui' : 'Non',
            ]);
        }
        referenceData.push([]);
        referenceData.push(['CODES SPECIAUX']);
        referenceData.push(['Code', 'Signification']);
        referenceData.push(['-', 'Repos (pas de planning)']);
        referenceData.push(['R', 'Récupération']);
        referenceData.push(['C', 'Congé']);
        referenceData.push([]);
        referenceData.push(['NOTES']);
        referenceData.push(['- Remplissez le code shift dans chaque cellule jour']);
        referenceData.push(['- Laissez vide ou mettez "-" pour les jours de repos']);
        referenceData.push(['- Pour un horaire personnalisé: CODE(HH:mm-HH:mm)']);
        referenceData.push(['  Exemple: MATIN(09:00-18:00)']);
        const referenceSheet = XLSX.utils.aoa_to_sheet(referenceData);
        referenceSheet['!cols'] = [
            { wch: 15 },
            { wch: 25 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
        ];
        XLSX.utils.book_append_sheet(workbook, referenceSheet, 'Codes Shifts');
        const instructionsData = [
            ['INSTRUCTIONS D\'UTILISATION'],
            [],
            ['1. PREPARATION'],
            ['   - Modifiez la date "Semaine du" dans la feuille Planning'],
            ['   - La date doit être un LUNDI (début de semaine)'],
            [],
            ['2. REMPLISSAGE'],
            ['   - Pour chaque employé, indiquez le code shift pour chaque jour'],
            ['   - Utilisez les codes de la feuille "Codes Shifts"'],
            ['   - Laissez vide ou mettez "-" pour les jours de repos'],
            [],
            ['3. CODES SHIFT'],
            ['   - Consultez la feuille "Codes Shifts" pour les codes disponibles'],
            ['   - Les codes sont sensibles à la casse (utilisez MAJUSCULES)'],
            [],
            ['4. HORAIRES PERSONNALISES'],
            ['   - Format: CODE(HH:mm-HH:mm)'],
            ['   - Exemple: MATIN(08:30-17:30)'],
            [],
            ['5. IMPORT'],
            ['   - Sauvegardez le fichier au format .xlsx'],
            ['   - Importez via l\'interface PointaFlex'],
            ['   - Les plannings existants ne seront pas écrasés'],
            [],
            ['EXEMPLE:'],
            [],
            ['Matricule', 'Nom', 'Prénom', 'Département', 'Lun 13/01', 'Mar 14/01', 'Mer 15/01', 'Jeu 16/01', 'Ven 17/01', 'Sam 18/01', 'Dim 19/01'],
            ['00994', 'EL KHAYATI', 'Mohamed', 'GAB', 'MATIN', 'MATIN', 'MATIN', 'MATIN', 'MATIN', '-', '-'],
            ['01066', 'EL MEKKAOUI', 'Hamid', 'GAB', 'SOIR', 'SOIR', 'SOIR', 'SOIR', 'SOIR', '-', '-'],
            ['00906', 'ARABI', 'Yassine', 'TF', 'NUIT', 'NUIT', 'NUIT', 'NUIT', 'NUIT', '-', '-'],
        ];
        const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
        instructionsSheet['!cols'] = [
            { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        ];
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
};
exports.SchedulesService = SchedulesService;
exports.SchedulesService = SchedulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulesService);
//# sourceMappingURL=schedules.service.js.map