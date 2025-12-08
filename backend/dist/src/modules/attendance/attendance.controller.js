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
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
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
        return this.attendanceService.handleWebhook(tenantId, deviceId, webhookData);
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
            const result = await this.attendanceService.handleWebhook(tenantId, deviceId, webhookData);
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
    findAll(tenantId, employeeId, siteId, startDate, endDate, hasAnomaly, type) {
        return this.attendanceService.findAll(tenantId, {
            employeeId,
            siteId,
            startDate,
            endDate,
            hasAnomaly: hasAnomaly ? hasAnomaly === 'true' : undefined,
            type,
        });
    }
    getAnomalies(tenantId, date) {
        return this.attendanceService.getAnomalies(tenantId, date);
    }
    getDailyReport(tenantId, date) {
        return this.attendanceService.getDailyReport(tenantId, date);
    }
    findOne(tenantId, id) {
        return this.attendanceService.findOne(tenantId, id);
    }
    correctAttendance(tenantId, id, correctionDto) {
        return this.attendanceService.correctAttendance(tenantId, id, correctionDto);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER, client_1.Role.SUPER_ADMIN),
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all attendance records with filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of attendance records' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('siteId')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('hasAnomaly')),
    __param(6, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('anomalies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance anomalies' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of anomalies' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getAnomalies", null);
__decorate([
    (0, common_1.Get)('daily-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER, client_1.Role.SUPER_ADMIN),
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
    (0, common_1.Patch)(':id/correct'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Correct attendance record' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Attendance corrected successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Attendance not found' }),
    __param(0, (0, current_tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, correct_attendance_dto_1.CorrectAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "correctAttendance", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('Attendance'),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map