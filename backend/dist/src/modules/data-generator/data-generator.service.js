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
var DataGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const attendance_service_1 = require("../attendance/attendance.service");
const client_1 = require("@prisma/client");
const scenarios_config_1 = require("./scenarios/scenarios.config");
let DataGeneratorService = DataGeneratorService_1 = class DataGeneratorService {
    constructor(prisma, attendanceService) {
        this.prisma = prisma;
        this.attendanceService = attendanceService;
        this.logger = new common_1.Logger(DataGeneratorService_1.name);
    }
    roundOvertimeHours(hours, roundingMinutes) {
        if (roundingMinutes <= 0)
            return hours;
        const totalMinutes = hours * 60;
        const roundedMinutes = Math.round(totalMinutes / roundingMinutes) * roundingMinutes;
        return roundedMinutes / 60;
    }
    async generateSingleDay(tenantId, dto) {
        this.logger.log(`Génération de pointage pour ${dto.employeeId} le ${dto.date} (scénario: ${dto.scenario})`);
        const employee = await this.prisma.employee.findFirst({
            where: { id: dto.employeeId, tenantId },
            include: { currentShift: true, site: true },
        });
        if (!employee) {
            throw new common_1.BadRequestException('Employee not found');
        }
        const scenario = this.getScenarioForType(dto.scenario);
        if (!scenario) {
            throw new common_1.BadRequestException(`Scenario ${dto.scenario} not found`);
        }
        if (scenario.requiresShift && !employee.currentShift) {
            throw new common_1.BadRequestException('Employee needs a shift assigned for this scenario');
        }
        const attendances = await this.generateAttendancesForScenario(tenantId, employee.id, dto.date, scenario, dto.siteId || employee.siteId, employee.currentShift);
        return {
            success: true,
            employee: {
                id: employee.id,
                matricule: employee.matricule,
                firstName: employee.firstName,
                lastName: employee.lastName,
            },
            date: dto.date,
            scenario: scenario.name,
            generatedCount: attendances.length,
            attendances,
        };
    }
    async generateBulk(tenantId, dto) {
        this.logger.log(`Génération en masse du ${dto.startDate} au ${dto.endDate}`);
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (startDate > endDate) {
            throw new common_1.BadRequestException('Start date must be before end date');
        }
        const total = Object.values(dto.distribution).reduce((sum, val) => sum + val, 0);
        if (Math.abs(total - 100) > 0.01) {
            throw new common_1.BadRequestException('Distribution percentages must sum to 100');
        }
        let employees = await this.prisma.employee.findMany({
            where: {
                tenantId,
                isActive: true,
                ...(dto.employeeIds && dto.employeeIds.length > 0
                    ? { id: { in: dto.employeeIds } }
                    : {}),
            },
            include: { currentShift: true, site: true },
        });
        if (employees.length === 0) {
            throw new common_1.BadRequestException('No active employees found');
        }
        this.logger.log(`Génération pour ${employees.length} employés`);
        const excludeHolidays = dto.excludeHolidays !== false;
        let holidays = [];
        if (excludeHolidays) {
            holidays = await this.prisma.holiday.findMany({
                where: {
                    tenantId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            });
            this.logger.log(`${holidays.length} jour(s) férié(s) trouvé(s) dans la période`);
        }
        const approvedLeaves = await this.prisma.leave.findMany({
            where: {
                tenantId,
                status: client_1.LeaveStatus.APPROVED,
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });
        this.logger.log(`${approvedLeaves.length} congé(s) approuvé(s) trouvé(s) dans la période`);
        const stats = {
            totalGenerated: 0,
            byType: {},
            byScenario: {},
            anomaliesDetected: 0,
            holidaysIgnored: 0,
            weekendsIgnored: 0,
            leavesRespected: 0,
            overtimeGenerated: 0,
            startDate: dto.startDate,
            endDate: dto.endDate,
            employeesCount: employees.length,
        };
        const excludeWeekends = dto.excludeWeekends !== false;
        const generateOvertime = dto.generateOvertime === true;
        const overtimeThreshold = dto.overtimeThreshold || 30;
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay();
            if (excludeHolidays && this.isHoliday(currentDate, holidays)) {
                stats.holidaysIgnored++;
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }
            if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
                stats.weekendsIgnored++;
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }
            for (const employee of employees) {
                if (this.isEmployeeOnLeave(employee.id, currentDate, approvedLeaves)) {
                    stats.leavesRespected++;
                    continue;
                }
                const scenario = this.pickScenarioByDistribution(dto.distribution);
                try {
                    const attendances = await this.generateAttendancesForScenario(tenantId, employee.id, dateStr, scenario, dto.siteId || employee.siteId, employee.currentShift);
                    stats.totalGenerated += attendances.length;
                    stats.byScenario[scenario.name] = (stats.byScenario[scenario.name] || 0) + 1;
                    const anomalies = attendances.filter(a => a.hasAnomaly);
                    stats.anomaliesDetected += anomalies.length;
                    if (generateOvertime && attendances.length > 0 && employee.currentShift) {
                        const overtimeCreated = await this.calculateAndCreateOvertime(tenantId, employee, dateStr, attendances, employee.currentShift, overtimeThreshold);
                        if (overtimeCreated) {
                            stats.overtimeGenerated++;
                        }
                    }
                }
                catch (error) {
                    this.logger.warn(`Erreur lors de la génération pour ${employee.matricule} le ${dateStr}: ${error.message}`);
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        this.logger.log(`Génération terminée: ${stats.totalGenerated} pointages créés`);
        return stats;
    }
    async cleanGeneratedData(tenantId, dto) {
        const where = {
            tenantId,
            isGenerated: true,
        };
        if (!dto.deleteAll) {
            if (dto.afterDate) {
                where.timestamp = { gte: new Date(dto.afterDate) };
            }
            if (dto.employeeId) {
                where.employeeId = dto.employeeId;
            }
            if (dto.siteId) {
                where.siteId = dto.siteId;
            }
        }
        const result = await this.prisma.attendance.deleteMany({ where });
        this.logger.log(`${result.count} pointages générés supprimés`);
        return {
            success: true,
            deletedCount: result.count,
        };
    }
    async getStats(tenantId) {
        const generated = await this.prisma.attendance.findMany({
            where: { tenantId, isGenerated: true },
            select: {
                type: true,
                hasAnomaly: true,
                timestamp: true,
                generatedBy: true,
            },
        });
        const byType = {};
        const byScenario = {};
        let anomaliesDetected = 0;
        let minDate = null;
        let maxDate = null;
        for (const record of generated) {
            byType[record.type] = (byType[record.type] || 0) + 1;
            const scenario = record.generatedBy || 'unknown';
            byScenario[scenario] = (byScenario[scenario] || 0) + 1;
            if (record.hasAnomaly) {
                anomaliesDetected++;
            }
            if (!minDate || record.timestamp < minDate) {
                minDate = record.timestamp;
            }
            if (!maxDate || record.timestamp > maxDate) {
                maxDate = record.timestamp;
            }
        }
        return {
            totalGenerated: generated.length,
            byType,
            byScenario,
            anomaliesDetected,
            startDate: minDate ? minDate.toISOString().split('T')[0] : '',
            endDate: maxDate ? maxDate.toISOString().split('T')[0] : '',
        };
    }
    async generateAttendancesForScenario(tenantId, employeeId, date, scenario, siteId, shift) {
        const attendances = [];
        if (scenario.patterns.length === 0) {
            return attendances;
        }
        for (const pattern of scenario.patterns) {
            const timestamp = this.calculateTimestamp(date, pattern, shift);
            const attendance = await this.attendanceService.create(tenantId, {
                employeeId,
                timestamp: timestamp.toISOString(),
                type: pattern.type,
                method: client_1.DeviceType.MANUAL,
                siteId,
                rawData: {
                    generated: true,
                    scenario: scenario.name,
                    pattern: pattern.type,
                },
            });
            await this.prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    isGenerated: true,
                    generatedBy: scenario.name,
                },
            });
            attendances.push(attendance);
        }
        return attendances;
    }
    calculateTimestamp(date, pattern, shift) {
        const baseDate = new Date(date);
        let [hours, minutes] = pattern.timeOffset.split(':').map(Number);
        if (shift && pattern.type === client_1.AttendanceType.IN) {
            const [shiftHours, shiftMinutes] = shift.startTime.split(':').map(Number);
            hours = shiftHours;
            minutes = shiftMinutes;
        }
        const varianceMinutes = this.getRandomVariance(pattern.varianceMinutes);
        minutes += varianceMinutes;
        baseDate.setHours(hours, minutes, 0, 0);
        return baseDate;
    }
    getRandomVariance(maxVariance) {
        return Math.floor(Math.random() * (maxVariance * 2 + 1)) - maxVariance;
    }
    pickScenarioByDistribution(distribution) {
        const random = Math.random() * 100;
        let cumulative = 0;
        const scenarioMapping = {
            normal: 'normal',
            late: 'late',
            earlyLeave: 'earlyLeave',
            anomaly: 'missingOut',
            mission: 'mission',
            absence: 'absence',
        };
        for (const [key, percentage] of Object.entries(distribution)) {
            cumulative += percentage;
            if (random <= cumulative) {
                const scenarioName = scenarioMapping[key] || key;
                return (0, scenarios_config_1.getScenarioByName)(scenarioName) || scenarios_config_1.ALL_SCENARIOS[0];
            }
        }
        return scenarios_config_1.ALL_SCENARIOS[0];
    }
    getScenarioForType(type) {
        return (0, scenarios_config_1.getScenarioByName)(type);
    }
    isHoliday(date, holidays) {
        const dateStr = date.toISOString().split('T')[0];
        return holidays.some(h => {
            const holidayDate = new Date(h.date).toISOString().split('T')[0];
            return holidayDate === dateStr;
        });
    }
    isEmployeeOnLeave(employeeId, date, leaves) {
        const dateStr = date.toISOString().split('T')[0];
        return leaves.some(leave => {
            if (leave.employeeId !== employeeId)
                return false;
            const leaveStart = new Date(leave.startDate).toISOString().split('T')[0];
            const leaveEnd = new Date(leave.endDate).toISOString().split('T')[0];
            return dateStr >= leaveStart && dateStr <= leaveEnd;
        });
    }
    async calculateAndCreateOvertime(tenantId, employee, date, attendances, shift, thresholdMinutes) {
        try {
            const inAttendance = attendances.find(a => a.type === client_1.AttendanceType.IN);
            const outAttendance = attendances.find(a => a.type === client_1.AttendanceType.OUT);
            if (!inAttendance || !outAttendance) {
                return false;
            }
            const workedMinutes = (new Date(outAttendance.timestamp).getTime() - new Date(inAttendance.timestamp).getTime()) / (1000 * 60);
            const [shiftStartHours, shiftStartMinutes] = shift.startTime.split(':').map(Number);
            const [shiftEndHours, shiftEndMinutes] = shift.endTime.split(':').map(Number);
            let shiftDurationMinutes = (shiftEndHours * 60 + shiftEndMinutes) - (shiftStartHours * 60 + shiftStartMinutes);
            if (shiftDurationMinutes < 0) {
                shiftDurationMinutes += 24 * 60;
            }
            shiftDurationMinutes -= shift.breakDuration || 60;
            const overtimeMinutes = workedMinutes - shiftDurationMinutes;
            if (overtimeMinutes < thresholdMinutes) {
                return false;
            }
            let overtimeHours = overtimeMinutes / 60;
            const existing = await this.prisma.overtime.findFirst({
                where: {
                    tenantId,
                    employeeId: employee.id,
                    date: new Date(date),
                },
            });
            const settings = await this.prisma.tenantSettings.findUnique({
                where: { tenantId },
            });
            const roundingMinutes = settings?.overtimeRounding || 15;
            overtimeHours = this.roundOvertimeHours(overtimeHours, roundingMinutes);
            const rate = shift.isNightShift
                ? Number(settings?.nightShiftRate || 1.5)
                : Number(settings?.overtimeRate || 1.25);
            if (existing) {
                await this.prisma.overtime.update({
                    where: { id: existing.id },
                    data: {
                        hours: overtimeHours,
                        rate,
                        isNightShift: shift.isNightShift || false,
                    },
                });
            }
            else {
                await this.prisma.overtime.create({
                    data: {
                        tenantId,
                        employeeId: employee.id,
                        date: new Date(date),
                        hours: overtimeHours,
                        isNightShift: shift.isNightShift || false,
                        rate,
                        status: client_1.OvertimeStatus.PENDING,
                    },
                });
            }
            return true;
        }
        catch (error) {
            this.logger.warn(`Erreur lors du calcul des heures sup pour ${employee.matricule} le ${date}: ${error.message}`);
            return false;
        }
    }
};
exports.DataGeneratorService = DataGeneratorService;
exports.DataGeneratorService = DataGeneratorService = DataGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attendance_service_1.AttendanceService])
], DataGeneratorService);
//# sourceMappingURL=data-generator.service.js.map