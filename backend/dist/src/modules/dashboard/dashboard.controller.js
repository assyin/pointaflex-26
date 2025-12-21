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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getEmployeeDashboard(req, employeeId, dateStr) {
        const tenantId = req.tenantId;
        const targetEmployeeId = employeeId || req.user.employeeId;
        const date = dateStr ? new Date(dateStr) : new Date();
        return this.dashboardService.getEmployeeDashboard(tenantId, targetEmployeeId, date);
    }
    async getTeamDashboard(req, managerId, dateStr) {
        const tenantId = req.tenantId;
        const targetManagerId = managerId || req.user.employeeId;
        const date = dateStr ? new Date(dateStr) : new Date();
        return this.dashboardService.getTeamDashboard(tenantId, targetManagerId, date);
    }
    async getDepartmentDashboard(req, departmentId, dateStr) {
        const tenantId = req.tenantId;
        const date = dateStr ? new Date(dateStr) : new Date();
        return this.dashboardService.getDepartmentDashboard(tenantId, departmentId, date);
    }
    async getSiteDashboard(req, siteId, dateStr) {
        const tenantId = req.tenantId;
        const date = dateStr ? new Date(dateStr) : new Date();
        return this.dashboardService.getSiteDashboard(tenantId, siteId, date);
    }
    async getTenantDashboard(req, dateStr) {
        const tenantId = req.tenantId;
        const date = dateStr ? new Date(dateStr) : new Date();
        return this.dashboardService.getTenantDashboard(tenantId, date);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('employee'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getEmployeeDashboard", null);
__decorate([
    (0, common_1.Get)('team'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('managerId')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTeamDashboard", null);
__decorate([
    (0, common_1.Get)('department'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('departmentId')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDepartmentDashboard", null);
__decorate([
    (0, common_1.Get)('site'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('siteId')),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSiteDashboard", null);
__decorate([
    (0, common_1.Get)('tenant'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTenantDashboard", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map