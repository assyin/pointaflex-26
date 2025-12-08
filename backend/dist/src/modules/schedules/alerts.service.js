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
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AlertsService = class AlertsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateAlerts(tenantId, startDate, endDate) {
        const alerts = [];
        const weeklyHoursAlerts = await this.checkWeeklyHours(tenantId, startDate, endDate);
        alerts.push(...weeklyHoursAlerts);
        const restPeriodAlerts = await this.checkRestPeriods(tenantId, startDate, endDate);
        alerts.push(...restPeriodAlerts);
        const nightShiftAlerts = await this.checkNightShifts(tenantId, startDate, endDate);
        alerts.push(...nightShiftAlerts);
        const minimumStaffAlerts = await this.checkMinimumStaff(tenantId, startDate, endDate);
        alerts.push(...minimumStaffAlerts);
        return alerts;
    }
    async checkWeeklyHours(tenantId, startDate, endDate) {
        const alerts = [];
        const employees = await this.prisma.employee.findMany({
            where: { tenantId },
            include: {
                schedules: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    include: {
                        shift: true,
                    },
                },
            },
        });
        for (const employee of employees) {
            const weeklyHours = {};
            for (const schedule of employee.schedules) {
                const scheduleDate = new Date(schedule.date);
                const weekKey = this.getWeekKey(scheduleDate);
                if (!weeklyHours[weekKey]) {
                    weeklyHours[weekKey] = 0;
                }
                const startTime = schedule.customStartTime || schedule.shift.startTime;
                const endTime = schedule.customEndTime || schedule.shift.endTime;
                const hours = this.calculateHours(startTime, endTime, schedule.shift.breakDuration);
                weeklyHours[weekKey] += hours;
            }
            for (const [week, hours] of Object.entries(weeklyHours)) {
                if (hours > 44) {
                    alerts.push({
                        id: `weekly-hours-${employee.id}-${week}`,
                        type: hours > 48 ? 'CRITICAL' : 'WARNING',
                        message: `Heures hebdomadaires dépassées: ${hours.toFixed(1)}h (limite: 44h)`,
                        employeeId: employee.id,
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        date: week,
                        details: { hours, limit: 44 },
                    });
                }
            }
        }
        return alerts;
    }
    async checkRestPeriods(tenantId, startDate, endDate) {
        const alerts = [];
        const employees = await this.prisma.employee.findMany({
            where: { tenantId },
            include: {
                schedules: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    include: {
                        shift: true,
                    },
                    orderBy: { date: 'asc' },
                },
            },
        });
        for (const employee of employees) {
            for (let i = 0; i < employee.schedules.length - 1; i++) {
                const currentSchedule = employee.schedules[i];
                const nextSchedule = employee.schedules[i + 1];
                const currentDate = new Date(currentSchedule.date);
                const nextDate = new Date(nextSchedule.date);
                const daysDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                    const currentEndTime = currentSchedule.customEndTime || currentSchedule.shift.endTime;
                    const nextStartTime = nextSchedule.customStartTime || nextSchedule.shift.startTime;
                    const restHours = this.calculateRestHours(currentDate, currentEndTime, nextDate, nextStartTime);
                    if (restHours < 11) {
                        alerts.push({
                            id: `rest-period-${employee.id}-${currentSchedule.id}-${nextSchedule.id}`,
                            type: restHours < 9 ? 'CRITICAL' : 'WARNING',
                            message: `Période de repos insuffisante: ${restHours.toFixed(1)}h (minimum: 11h)`,
                            employeeId: employee.id,
                            employeeName: `${employee.firstName} ${employee.lastName}`,
                            date: currentDate.toISOString().split('T')[0],
                            details: { restHours, minimum: 11 },
                        });
                    }
                }
            }
        }
        return alerts;
    }
    async checkNightShifts(tenantId, startDate, endDate) {
        const alerts = [];
        const employees = await this.prisma.employee.findMany({
            where: { tenantId },
            include: {
                schedules: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    include: {
                        shift: true,
                    },
                    orderBy: { date: 'asc' },
                },
            },
        });
        for (const employee of employees) {
            const nightShifts = employee.schedules.filter((s) => s.shift && s.shift.isNightShift);
            if (nightShifts.length === 0)
                continue;
            let consecutiveCount = 1;
            let maxConsecutive = 1;
            for (let i = 0; i < nightShifts.length - 1; i++) {
                const currentDate = new Date(nightShifts[i].date);
                const nextDate = new Date(nightShifts[i + 1].date);
                const daysDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                    consecutiveCount++;
                    maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
                }
                else {
                    consecutiveCount = 1;
                }
            }
            if (maxConsecutive > 3) {
                alerts.push({
                    id: `night-shift-${employee.id}`,
                    type: maxConsecutive > 5 ? 'CRITICAL' : 'WARNING',
                    message: `Travail de nuit répétitif: ${maxConsecutive} nuits consécutives (limite recommandée: 3)`,
                    employeeId: employee.id,
                    employeeName: `${employee.firstName} ${employee.lastName}`,
                    details: { consecutiveNights: maxConsecutive, limit: 3 },
                });
            }
        }
        return alerts;
    }
    async checkMinimumStaff(tenantId, startDate, endDate) {
        const alerts = [];
        const dates = this.getDatesBetween(startDate, endDate);
        const schedules = await this.prisma.schedule.findMany({
            where: {
                tenantId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                employee: {
                    include: {
                        site: true,
                    },
                },
            },
        });
        const schedulesByDateAndSite = {};
        for (const schedule of schedules) {
            const dateKey = schedule.date.toISOString().split('T')[0];
            const siteId = schedule.employee.siteId || 'no-site';
            const key = `${dateKey}-${siteId}`;
            schedulesByDateAndSite[key] = (schedulesByDateAndSite[key] || 0) + 1;
        }
        for (const date of dates) {
            const dateKey = date.toISOString().split('T')[0];
            const sites = await this.prisma.site.findMany({
                where: { tenantId },
            });
            for (const site of sites) {
                const key = `${dateKey}-${site.id}`;
                const staffCount = schedulesByDateAndSite[key] || 0;
                if (staffCount === 0) {
                    alerts.push({
                        id: `minimum-staff-${site.id}-${dateKey}`,
                        type: 'WARNING',
                        message: `Aucun employé planifié pour le ${dateKey} sur le site ${site.name}`,
                        date: dateKey,
                        details: { siteId: site.id, siteName: site.name, staffCount: 0 },
                    });
                }
            }
        }
        return alerts;
    }
    getWeekKey(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const dayOfWeek = d.getDay();
        const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }
    calculateHours(startTime, endTime, breakDuration) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        let startMinutes = startHour * 60 + startMin;
        let endMinutes = endHour * 60 + endMin;
        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }
        const totalMinutes = endMinutes - startMinutes - breakDuration;
        return totalMinutes / 60;
    }
    calculateRestHours(currentDate, currentEndTime, nextDate, nextStartTime) {
        const [endHour, endMin] = currentEndTime.split(':').map(Number);
        const [startHour, startMin] = nextStartTime.split(':').map(Number);
        const endDateTime = new Date(currentDate);
        endDateTime.setHours(endHour, endMin, 0, 0);
        const startDateTime = new Date(nextDate);
        startDateTime.setHours(startHour, startMin, 0, 0);
        const diffMs = startDateTime.getTime() - endDateTime.getTime();
        return diffMs / (1000 * 60 * 60);
    }
    getDatesBetween(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map