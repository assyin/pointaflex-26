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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attendance_service_1 = require("./attendance.service");
const create_attendance_dto_1 = require("./dto/create-attendance.dto");
const webhook_attendance_dto_1 = require("./dto/webhook-attendance.dto");
const correct_attendance_dto_1 = require("./dto/correct-attendance.dto");
const attendance_stats_dto_1 = require("./dto/attendance-stats.dto");
const bulk_correct_dto_1 = require("./dto/bulk-correct.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const current_tenant_decorator_1 = require("../../common/decorators/current-tenant.decorator");
const client_1 = require("@prisma/client");
let AttendanceController = class AttendanceController {
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    create(tenantId, createAttendanceDto) {
        return this.attendanceService.create(tenantId, createAttendanceDto);
    }
    async handleWebhook(deviceId, tenantId, apiKey, webhookData) {
        if (!deviceId || !tenantId) {
            throw new common_1.UnauthorizedException('Missing device credentials');
        }
        return this.attendanceService.handleWebhook(tenantId, deviceId, webhookData, apiKey);
    }
    async handleWebhookFast(deviceId, tenantId, apiKey, webhookData) {
        if (!deviceId || !tenantId) {
            throw new common_1.UnauthorizedException('Missing device credentials');
        }
        return this.attendanceService.handleWebhookFast(tenantId, deviceId, webhookData, apiKey);
    }
    async getPunchCount(deviceId, tenantId, apiKey, employeeId, date, punchTime) {
        if (!deviceId || !tenantId) {
            throw new common_1.UnauthorizedException('Missing device credentials');
        }
        return this.attendanceService.getPunchCountForDay(tenantId, employeeId, date, deviceId, apiKey, punchTime);
    }
    async handlePushFromTerminal(body, headers) {
        console.log('📥 [Push URL] Données reçues du terminal:', JSON.stringify(body, null, 2));
        console.log('📋 [Push URL] Headers:', headers);
        let deviceId = headers['device-id'] || headers['x-device-id'] || headers['deviceid'];
        if (!deviceId) {
            deviceId = body.SN || body.deviceId || body.serialNumber;
            if (!deviceId && body.sn) {
                deviceId = body.sn;
            }
        }
        if (!deviceId) {
            deviceId = 'Terminal_Caisse';
        }
        const tenantId = headers['x-tenant-id'] || headers['tenant-id'] ||
            '90fab0cc-8539-4566-8da7-8742e9b6937b';
        try {
            let attendanceData = body;
            if (body.table === 'attendance' && body.data) {
                attendanceData = body.data;
            }
            const webhookData = {
                employeeId: attendanceData.pin || attendanceData.userId || attendanceData.cardno || attendanceData.userCode || attendanceData.user_id,
                timestamp: attendanceData.time || attendanceData.checktime || attendanceData.timestamp || new Date().toISOString(),
                type: this.mapAttendanceType(attendanceData.state || attendanceData.status || attendanceData.checktype || attendanceData.type),
                method: this.mapVerifyMode(attendanceData.verifymode || attendanceData.verify || attendanceData.verifyMode || attendanceData.verify_mode),
                rawData: body,
            };
            console.log('🔄 [Push URL] Données converties:', JSON.stringify(webhookData, null, 2));
            const apiKey = headers['x-api-key'] || headers['api-key'] || headers['apikey'];
            const result = await this.attendanceService.handleWebhook(tenantId, deviceId, webhookData, apiKey);
            console.log('✅ [Push URL] Pointage enregistré avec succès');
            return result;
        }
        catch (error) {
            console.error('❌ [Push URL] Erreur:', error.message);
            console.error('📋 [Push URL] Body reçu:', body);
            throw error;
        }
    }
    mapAttendanceType(state) {
        if (state === undefined || state === null)
            return client_1.AttendanceType.IN;
        const stateNum = typeof state === 'string' ? parseInt(state, 10) : state;
        if (stateNum === 0 || stateNum === 2)
            return client_1.AttendanceType.OUT;
        return client_1.AttendanceType.IN;
    }
    mapVerifyMode(mode) {
        if (mode === undefined || mode === null)
            return client_1.DeviceType.MANUAL;
        const modeNum = typeof mode === 'string' ? parseInt(mode, 10) : mode;
        const map = {
            0: client_1.DeviceType.PIN_CODE,
            1: client_1.DeviceType.FINGERPRINT,
            3: client_1.DeviceType.FINGERPRINT,
            4: client_1.DeviceType.FACE_RECOGNITION,
            15: client_1.DeviceType.RFID_BADGE,
        };
        return map[modeNum] || client_1.DeviceType.MANUAL;
    }
    findAll(user, tenantId, employeeId, siteId, startDate, endDate, hasAnomaly, type) {
        console.log('🔵 [AttendanceController.findAll] REQUÊTE REÇUE');
        console.log('🔵 [AttendanceController.findAll] tenantId:', tenantId);
        console.log('🔵 [AttendanceController.findAll] user:', JSON.stringify(user));
        console.log('🔵 [AttendanceController.findAll] startDate:', startDate, 'endDate:', endDate);
        return this.attendanceService.findAll(tenantId, {
            employeeId,
            siteId,
            startDate,
            endDate,
            hasAnomaly: hasAnomaly ? hasAnomaly === 'true' : undefined,
            type,
        }, user.userId, user.permissions || []);
    }
    getAnomalies(user, tenantId, startDate, endDate, employeeId, departmentId, siteId, anomalyType, isCorrected, page, limit, date) {
        return this.attendanceService.getAnomaliesPaginated(tenantId, {
            startDate: startDate || date,
            endDate: endDate || date,
            employeeId,
            departmentId,
            siteId,
            anomalyType,
            isCorrected: isCorrected !== undefined ? isCorrected === 'true' : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        }, user.userId, user.permissions || []);
    }
    getDailyReport(tenantId, date) {
        return this.attendanceService.getDailyReport(tenantId, date);
    }
    findOne(tenantId, id) {
        return this.attendanceService.findOne(tenantId, id);
    }
    delete(user, tenantId, id) {
        return this.attendanceService.remove(tenantId, id, user.userId, user.permissions || []);
    }
    correctAttendance(user, tenantId, id, correctionDto) {
        return this.attendanceService.correctAttendance(tenantId, id, correctionDto, user.userId, user.permissions || []);
    }
    approveCorrection(user, tenantId, id, body) {
        return this.attendanceService.approveCorrection(tenantId, id, user.userId, body.approved, body.comment);
    }
    getPresenceRate(tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        if (!query.employeeId) {
            throw new Error('employeeId is required');
        }
        return this.attendanceService.getPresenceRate(tenantId, query.employeeId, startDate, endDate);
    }
    getPunctualityRate(tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        if (!query.employeeId) {
            throw new Error('employeeId is required');
        }
        return this.attendanceService.getPunctualityRate(tenantId, query.employeeId, startDate, endDate);
    }
    getTrends(tenantId, query) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        if (!query.employeeId) {
            throw new Error('employeeId is required');
        }
        return this.attendanceService.getTrends(tenantId, query.employeeId, startDate, endDate);
    }
    getRecurringAnomalies(tenantId, employeeId, days) {
        if (!employeeId) {
            throw new Error('employeeId is required');
        }
        return this.attendanceService.detectRecurringAnomalies(tenantId, employeeId, days ? parseInt(days, 10) : 30);
    }
    getCorrectionHistory(tenantId, id) {
        return this.attendanceService.getCorrectionHistory(tenantId, id);
    }
    bulkCorrectAttendance(user, tenantId, bulkDto) {
        return this.attendanceService.bulkCorrectAttendance(tenantId, {
            ...bulkDto,
            correctedBy: user.userId,
        });
    }
    exportAnomalies(tenantId, format, startDate, endDate, employeeId, anomalyType) {
        return this.attendanceService.exportAnomalies(tenantId, { startDate, endDate, employeeId, anomalyType }, format || 'csv');
    }
    getAnomaliesDashboard(user, tenantId, startDate, endDate) {
        return this.attendanceService.getAnomaliesDashboard(tenantId, new Date(startDate), new Date(endDate), user.userId, user.permissions || []);
    }
    getAnomaliesAnalytics(tenantId, startDate, endDate, employeeId, departmentId, siteId, anomalyType) {
        return this.attendanceService.getAnomaliesAnalytics(tenantId, startDate, endDate, {
            employeeId,
            departmentId,
            siteId,
            anomalyType,
        });
    }
    getMonthlyAnomaliesReport(tenantId, year, month) {
        return this.attendanceService.getMonthlyAnomaliesReport(tenantId, parseInt(year, 10), parseInt(month, 10));
    }
    getHighAnomalyRateEmployees(tenantId, threshold, days) {
        return this.attendanceService.getHighAnomalyRateEmployees(tenantId, threshold ? parseInt(threshold, 10) : 5, days ? parseInt(days, 10) : 30);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create manual attendance record' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Attendance created successfully' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_attendance_dto_1.CreateAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook endpoint for biometric devices' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Device-ID', required: true, description: 'Device unique ID' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Tenant-ID', required: true, description: 'Tenant ID' }),
    (0, swagger_1.ApiHeader)({ name: 'X-API-Key', required: false, description: 'Device API Key' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Attendance recorded from device' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid device credentials' }),
    __param(0, (0, common_1.Headers)('x-device-id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Headers)('x-api-key')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, webhook_attendance_dto_1.WebhookAttendanceDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('webhook/fast'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Fast webhook - returns immediately, processes in background' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Device-ID', required: true, description: 'Device unique ID' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Tenant-ID', required: true, description: 'Tenant ID' }),
    (0, swagger_1.ApiHeader)({ name: 'X-API-Key', required: false, description: 'Device API Key' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Attendance queued for processing' }),
    __param(0, (0, common_1.Headers)('x-device-id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Headers)('x-api-key')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, webhook_attendance_dto_1.WebhookAttendanceDto]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "handleWebhookFast", null);
__decorate([
    (0, common_1.Get)('count'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get punch count for an employee on a specific date (for IN/OUT detection)' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Device-ID', required: true, description: 'Device unique ID' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Tenant-ID', required: true, description: 'Tenant ID' }),
    (0, swagger_1.ApiHeader)({ name: 'X-API-Key', required: false, description: 'Device API Key' }),
    (0, swagger_1.ApiQuery)({ name: 'employeeId', required: true, description: 'Employee ID or matricule' }),
    (0, swagger_1.ApiQuery)({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' }),
    (0, swagger_1.ApiQuery)({ name: 'punchTime', required: false, description: 'Punch time ISO string (for night shift detection)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the punch count and optional forceType for night shifts' }),
    __param(0, (0, common_1.Headers)('x-device-id')),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Headers)('x-api-key')),
    __param(3, (0, common_1.Query)('employeeId')),
    __param(4, (0, common_1.Query)('date')),
    __param(5, (0, common_1.Query)('punchTime')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "getPunchCount", null);
__decorate([
    (0, common_1.Post)('push'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Push URL endpoint for ZKTeco native push (no auth required)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Attendance recorded from terminal push' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid data format' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "handlePushFromTerminal", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_own', 'attendance.view_team'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all attendance records with filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of attendance records' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Query)('employeeId')),
    __param(3, (0, common_1.Query)('siteId')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __param(6, (0, common_1.Query)('hasAnomaly')),
    __param(7, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('anomalies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_anomalies', 'attendance.view_team', 'attendance.view_department', 'attendance.view_site'),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance anomalies with filters and pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of anomalies' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('employeeId')),
    __param(5, (0, common_1.Query)('departmentId')),
    __param(6, (0, common_1.Query)('siteId')),
    __param(7, (0, common_1.Query)('anomalyType')),
    __param(8, (0, common_1.Query)('isCorrected')),
    __param(9, (0, common_1.Query)('page')),
    __param(10, (0, common_1.Query)('limit')),
    __param(11, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getAnomalies", null);
__decorate([
    (0, common_1.Get)('daily-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily attendance report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Daily report' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getDailyReport", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance record by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Attendance details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Attendance not found' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.delete', 'attendance.edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete manual attendance record' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Attendance deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Attendance not found' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Only manual attendance records can be deleted' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Cannot delete attendance outside your scope' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "delete", null);
__decorate([
    (0, common_1.Patch)(':id/correct'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.correct', 'attendance.edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Correct attendance record' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Attendance corrected successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Attendance not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden: Cannot correct attendance outside your scope' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, correct_attendance_dto_1.CorrectAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "correctAttendance", null);
__decorate([
    (0, common_1.Patch)(':id/approve-correction'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.approve_correction', 'attendance.correct'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve or reject attendance correction' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Correction approved/rejected successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Attendance not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "approveCorrection", null);
__decorate([
    (0, common_1.Get)('stats/presence-rate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_own', 'attendance.view_team'),
    (0, swagger_1.ApiOperation)({ summary: 'Get presence rate for an employee' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Presence rate statistics' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_stats_dto_1.AttendanceStatsQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getPresenceRate", null);
__decorate([
    (0, common_1.Get)('stats/punctuality-rate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_own', 'attendance.view_team'),
    (0, swagger_1.ApiOperation)({ summary: 'Get punctuality rate for an employee' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Punctuality rate statistics' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_stats_dto_1.AttendanceStatsQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getPunctualityRate", null);
__decorate([
    (0, common_1.Get)('stats/trends'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_own', 'attendance.view_team'),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance trends (graphs data)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Trends data for charts' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_stats_dto_1.AttendanceStatsQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getTrends", null);
__decorate([
    (0, common_1.Get)('stats/recurring-anomalies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_anomalies', 'attendance.view_team'),
    (0, swagger_1.ApiOperation)({ summary: 'Detect recurring anomalies for an employee' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of recurring anomalies' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getRecurringAnomalies", null);
__decorate([
    (0, common_1.Get)(':id/correction-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_own'),
    (0, swagger_1.ApiOperation)({ summary: 'Get complete correction history for an attendance record' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Correction history' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getCorrectionHistory", null);
__decorate([
    (0, common_1.Post)('bulk-correct'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.correct', 'attendance.edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Correct multiple attendance records at once' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bulk correction results' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, bulk_correct_dto_1.BulkCorrectAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "bulkCorrectAttendance", null);
__decorate([
    (0, common_1.Get)('export/anomalies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.export', 'attendance.view_all', 'attendance.view_anomalies'),
    (0, swagger_1.ApiOperation)({ summary: 'Export anomalies only (CSV/Excel)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Anomalies export file' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('employeeId')),
    __param(5, (0, common_1.Query)('anomalyType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "exportAnomalies", null);
__decorate([
    (0, common_1.Get)('dashboard/anomalies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_anomalies', 'attendance.view_team'),
    (0, swagger_1.ApiOperation)({ summary: 'Get anomalies dashboard summary' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Anomalies dashboard data' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getAnomaliesDashboard", null);
__decorate([
    (0, common_1.Get)('analytics/anomalies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_anomalies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comprehensive anomalies analytics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Anomalies analytics data' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('employeeId')),
    __param(4, (0, common_1.Query)('departmentId')),
    __param(5, (0, common_1.Query)('siteId')),
    __param(6, (0, common_1.Query)('anomalyType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getAnomaliesAnalytics", null);
__decorate([
    (0, common_1.Get)('reports/monthly-anomalies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_anomalies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get monthly anomalies report by department' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Monthly anomalies report' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getMonthlyAnomaliesReport", null);
__decorate([
    (0, common_1.Get)('alerts/high-anomaly-rate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, permissions_decorator_1.RequirePermissions)('attendance.view_all', 'attendance.view_anomalies'),
    (0, swagger_1.ApiOperation)({ summary: 'Get employees with high anomaly rate' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of employees with high anomaly rate' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('threshold')),
    __param(2, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getHighAnomalyRateEmployees", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('Attendance'),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map