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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let TenantsService = class TenantsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.tenant.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new common_1.ConflictException('Slug already exists');
        }
        const tenant = await this.prisma.tenant.create({
            data: {
                ...dto,
                settings: {
                    create: {},
                },
            },
            include: {
                settings: true,
            },
        });
        return tenant;
    }
    async findAll(page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};
        const [data, total] = await Promise.all([
            this.prisma.tenant.findMany({
                where,
                skip,
                take: limit,
                include: {
                    settings: true,
                    _count: {
                        select: {
                            users: true,
                            employees: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.tenant.count({ where }),
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
    async findOne(id) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
            include: {
                settings: true,
                _count: {
                    select: {
                        users: true,
                        employees: true,
                        sites: true,
                    },
                },
            },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        return tenant;
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.tenant.update({
            where: { id },
            data: dto,
            include: {
                settings: true,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.tenant.delete({
            where: { id },
        });
    }
    async getSettings(tenantId) {
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    legalName: true,
                    displayName: true,
                    country: true,
                    city: true,
                    hrEmail: true,
                    phone: true,
                    language: true,
                    settings: true,
                },
            });
            if (!tenant) {
                throw new common_1.NotFoundException('Tenant not found');
            }
            return {
                legalName: tenant.legalName || '',
                displayName: tenant.displayName || '',
                country: tenant.country || '',
                city: tenant.city || '',
                hrEmail: tenant.hrEmail || '',
                phone: tenant.phone || '',
                language: tenant.language || '',
                ...(tenant.settings || {}),
            };
        }
        catch (error) {
            if (error.message?.includes('legalName') || error.message?.includes('does not exist') || error.code === 'P2021') {
                try {
                    const tenant = await this.prisma.tenant.findUnique({
                        where: { id: tenantId },
                        select: {
                            displayName: true,
                            country: true,
                            city: true,
                            hrEmail: true,
                            phone: true,
                            language: true,
                            settings: true,
                        },
                    });
                    if (!tenant) {
                        throw new common_1.NotFoundException('Tenant not found');
                    }
                    return {
                        legalName: '',
                        displayName: tenant.displayName || '',
                        country: tenant.country || '',
                        city: tenant.city || '',
                        hrEmail: tenant.hrEmail || '',
                        phone: tenant.phone || '',
                        language: tenant.language || '',
                        ...(tenant.settings || {}),
                    };
                }
                catch (innerError) {
                    const tenant = await this.prisma.tenant.findUnique({
                        where: { id: tenantId },
                        include: {
                            settings: true,
                        },
                    });
                    if (!tenant) {
                        throw new common_1.NotFoundException('Tenant not found');
                    }
                    return {
                        legalName: tenant.legalName || '',
                        displayName: tenant.displayName || '',
                        country: tenant.country || '',
                        city: tenant.city || '',
                        hrEmail: tenant.hrEmail || '',
                        phone: tenant.phone || '',
                        language: tenant.language || '',
                        ...(tenant.settings || {}),
                    };
                }
            }
            throw error;
        }
    }
    async updateSettings(tenantId, dto) {
        await this.findOne(tenantId);
        const { legalName, displayName, country, city, hrEmail, phone, language, timezone, ...settingsData } = dto;
        try {
            const filteredSettingsData = {};
            const validSettingsFields = [
                'firstDayOfWeek', 'workingDays', 'workDaysPerWeek', 'maxWeeklyHours',
                'lateToleranceEntry', 'earlyToleranceExit', 'breakDuration',
                'overtimeRounding', 'overtimeRate', 'nightShiftRate',
                'alertWeeklyHoursExceeded', 'alertInsufficientRest', 'alertNightWorkRepetitive', 'alertMinimumStaffing',
                'annualLeaveDays', 'leaveApprovalLevels', 'twoLevelWorkflow', 'anticipatedLeave',
                'monthlyPayrollEmail', 'sfptExport', 'requireBreakPunch', 'temporaryMatriculeExpiryDays',
                'recoveryConversionRate', 'recoveryExpiryDays', 'dailyWorkingHours'
            ];
            for (const [key, value] of Object.entries(settingsData)) {
                if (value !== undefined && validSettingsFields.includes(key)) {
                    if (key === 'workingDays' && Array.isArray(value)) {
                        filteredSettingsData[key] = value;
                    }
                    else {
                        filteredSettingsData[key] = value;
                    }
                }
            }
            const [tenant, settings] = await this.prisma.$transaction([
                this.prisma.tenant.update({
                    where: { id: tenantId },
                    data: {
                        ...(legalName !== undefined && { legalName }),
                        ...(displayName !== undefined && { displayName }),
                        ...(country !== undefined && { country }),
                        ...(city !== undefined && { city }),
                        ...(hrEmail !== undefined && { hrEmail }),
                        ...(phone !== undefined && { phone }),
                        ...(language !== undefined && { language }),
                        ...(timezone !== undefined && { timezone }),
                    },
                }),
                this.prisma.tenantSettings.upsert({
                    where: { tenantId },
                    create: {
                        tenantId,
                        ...filteredSettingsData,
                    },
                    update: filteredSettingsData,
                }),
            ]);
            return {
                ...tenant,
                settings,
            };
        }
        catch (error) {
            console.error('Error updating tenant settings:', {
                message: error.message,
                code: error.code,
                meta: error.meta,
                stack: error.stack,
            });
            if (error.message?.includes('does not exist') || error.code === 'P2021' || error.code === 'P2009' || error.code === 'P2011') {
                const tenantData = {};
                if (displayName !== undefined)
                    tenantData.displayName = displayName;
                if (country !== undefined)
                    tenantData.country = country;
                if (city !== undefined)
                    tenantData.city = city;
                if (hrEmail !== undefined)
                    tenantData.hrEmail = hrEmail;
                if (phone !== undefined)
                    tenantData.phone = phone;
                if (language !== undefined)
                    tenantData.language = language;
                if (timezone !== undefined)
                    tenantData.timezone = timezone;
                const filteredSettingsData = {};
                const validSettingsFields = [
                    'firstDayOfWeek', 'workingDays', 'workDaysPerWeek', 'maxWeeklyHours',
                    'lateToleranceEntry', 'earlyToleranceExit', 'breakDuration',
                    'overtimeRounding', 'overtimeRate', 'nightShiftRate',
                    'alertWeeklyHoursExceeded', 'alertInsufficientRest', 'alertNightWorkRepetitive', 'alertMinimumStaffing',
                    'annualLeaveDays', 'leaveApprovalLevels', 'twoLevelWorkflow', 'anticipatedLeave',
                    'monthlyPayrollEmail', 'sfptExport'
                ];
                for (const [key, value] of Object.entries(settingsData)) {
                    if (value !== undefined && validSettingsFields.includes(key)) {
                        if (key === 'workingDays' && Array.isArray(value)) {
                            filteredSettingsData[key] = value;
                        }
                        else {
                            filteredSettingsData[key] = value;
                        }
                    }
                }
                try {
                    const [tenant, settings] = await this.prisma.$transaction([
                        this.prisma.tenant.update({
                            where: { id: tenantId },
                            data: tenantData,
                        }),
                        this.prisma.tenantSettings.upsert({
                            where: { tenantId },
                            create: {
                                tenantId,
                                ...filteredSettingsData,
                            },
                            update: filteredSettingsData,
                        }),
                    ]);
                    return {
                        ...tenant,
                        settings,
                    };
                }
                catch (innerError) {
                    console.error('Error in fallback update:', innerError.message, innerError.code);
                    try {
                        const filteredSettingsData = {};
                        const validSettingsFields = [
                            'firstDayOfWeek', 'workingDays', 'workDaysPerWeek', 'maxWeeklyHours',
                            'lateToleranceEntry', 'earlyToleranceExit', 'breakDuration',
                            'overtimeRounding', 'overtimeRate', 'nightShiftStart', 'nightShiftEnd', 'nightShiftRate',
                            'alertWeeklyHoursExceeded', 'alertInsufficientRest', 'alertNightWorkRepetitive', 'alertMinimumStaffing',
                            'annualLeaveDays', 'leaveApprovalLevels', 'twoLevelWorkflow', 'anticipatedLeave',
                            'monthlyPayrollEmail', 'sfptExport'
                        ];
                        for (const [key, value] of Object.entries(settingsData)) {
                            if (value !== undefined && validSettingsFields.includes(key)) {
                                if (key === 'workingDays' && Array.isArray(value)) {
                                    filteredSettingsData[key] = value;
                                }
                                else {
                                    filteredSettingsData[key] = value;
                                }
                            }
                        }
                        const settings = await this.prisma.tenantSettings.upsert({
                            where: { tenantId },
                            create: {
                                tenantId,
                                ...filteredSettingsData,
                            },
                            update: filteredSettingsData,
                        });
                        return {
                            id: tenantId,
                            settings,
                        };
                    }
                    catch (finalError) {
                        console.error('Final error:', finalError.message, finalError.code);
                        throw finalError;
                    }
                }
            }
            throw error;
        }
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map