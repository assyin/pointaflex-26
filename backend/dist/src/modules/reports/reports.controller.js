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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const export_service_1 = require("./services/export.service");
const dashboard_stats_dto_1 = require("./dto/dashboard-stats.dto");
const attendance_report_dto_1 = require("./dto/attendance-report.dto");
const overtime_report_dto_1 = require("./dto/overtime-report.dto");
const absences_report_dto_1 = require("./dto/absences-report.dto");
const payroll_report_dto_1 = require("./dto/payroll-report.dto");
const planning_report_dto_1 = require("./dto/planning-report.dto");
const export_report_dto_1 = require("./dto/export-report.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const client_1 = require("@prisma/client");
let ReportsController = class ReportsController {
    constructor(reportsService, exportService) {
        this.reportsService = reportsService;
        this.exportService = exportService;
    }
    getDashboardStats(user, query) {
        return this.reportsService.getDashboardStats(user.tenantId, query, user.userId, user.role);
    }
    getAttendanceReport(user, dto) {
        return this.reportsService.getAttendanceReport(user.tenantId, dto);
    }
    getEmployeeReport(user, id, startDate, endDate) {
        return this.reportsService.getEmployeeReport(user.tenantId, id, startDate, endDate);
    }
    getTeamReport(user, id, startDate, endDate) {
        return this.reportsService.getTeamReport(user.tenantId, id, startDate, endDate);
    }
    getOvertimeReport(user, dto) {
        return this.reportsService.getOvertimeReport(user.tenantId, dto);
    }
    getAbsencesReport(user, dto) {
        return this.reportsService.getAbsencesReport(user.tenantId, dto);
    }
    getPayrollReport(user, dto) {
        return this.reportsService.getPayrollReport(user.tenantId, dto);
    }
    async exportReport(user, type, dto, res) {
        await this.exportService.exportReport(user.tenantId, user.userId, type, dto, res);
    }
    getPlanningReport(user, dto) {
        return this.reportsService.getPlanningReport(user.tenantId, dto);
    }
    getReportHistory(user) {
        return this.reportsService.getReportHistory(user.tenantId, user.userId);
    }
    async downloadReportFromHistory(user, id, res) {
        return this.exportService.downloadReportFromHistory(user.tenantId, user.userId, id, res);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER, client_1.LegacyRole.SUPER_ADMIN, client_1.LegacyRole.EMPLOYEE),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard statistics (supports scope: personal, team, tenant, platform)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dashboard_stats_dto_1.DashboardStatsQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('attendance'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, attendance_report_dto_1.AttendanceReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getAttendanceReport", null);
__decorate([
    (0, common_1.Get)('employee/:id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get employee report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getEmployeeReport", null);
__decorate([
    (0, common_1.Get)('team/:id'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get team report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getTeamReport", null);
__decorate([
    (0, common_1.Get)('overtime'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get overtime report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, overtime_report_dto_1.OvertimeReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getOvertimeReport", null);
__decorate([
    (0, common_1.Get)('absences'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get absences and lateness report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, absences_report_dto_1.AbsencesReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getAbsencesReport", null);
__decorate([
    (0, common_1.Get)('payroll'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get payroll export report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payroll_report_dto_1.PayrollReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getPayrollReport", null);
__decorate([
    (0, common_1.Post)(':type/export'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Export report in PDF, Excel or CSV format' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, export_report_dto_1.ExportReportDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportReport", null);
__decorate([
    (0, common_1.Get)('planning'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get planning/shifts report' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, planning_report_dto_1.PlanningReportDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getPlanningReport", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Get report generation history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getReportHistory", null);
__decorate([
    (0, common_1.Get)('history/:id/download'),
    (0, roles_decorator_1.Roles)(client_1.LegacyRole.ADMIN_RH, client_1.LegacyRole.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Download a report from history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "downloadReportFromHistory", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('Reports'),
    (0, common_1.Controller)('reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        export_service_1.ExportService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map