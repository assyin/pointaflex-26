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
exports.SchedulesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const schedules_service_1 = require("./schedules.service");
const alerts_service_1 = require("./alerts.service");
const create_schedule_dto_1 = require("./dto/create-schedule.dto");
const update_schedule_dto_1 = require("./dto/update-schedule.dto");
const create_replacement_dto_1 = require("./dto/create-replacement.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let SchedulesController = class SchedulesController {
    constructor(schedulesService, alertsService) {
        this.schedulesService = schedulesService;
        this.alertsService = alertsService;
    }
    create(user, dto) {
        console.log('Received schedule creation request:', JSON.stringify(dto, null, 2));
        return this.schedulesService.create(user.tenantId, dto);
    }
    createBulk(user, dto) {
        return this.schedulesService.createBulk(user.tenantId, dto.schedules);
    }
    findAll(user, page, limit, employeeId, teamId, shiftId, siteId, startDate, endDate) {
        return this.schedulesService.findAll(user.tenantId, parseInt(page) || 1, parseInt(limit) || 20, {
            employeeId,
            teamId,
            shiftId,
            siteId,
            startDate,
            endDate,
        });
    }
    getWeek(user, date, teamId, siteId) {
        return this.schedulesService.getWeekSchedule(user.tenantId, date, {
            teamId,
            siteId,
        });
    }
    getMonth(user, date, teamId, siteId) {
        return this.schedulesService.getMonthSchedule(user.tenantId, date, {
            teamId,
            siteId,
        });
    }
    getAlerts(user, startDate, endDate) {
        return this.alertsService.generateAlerts(user.tenantId, new Date(startDate), new Date(endDate));
    }
    createReplacement(user, dto) {
        return this.schedulesService.createReplacement(user.tenantId, dto);
    }
    findAllReplacements(user, status, startDate, endDate) {
        return this.schedulesService.findAllReplacements(user.tenantId, {
            status,
            startDate,
            endDate,
        });
    }
    approveReplacement(user, id) {
        return this.schedulesService.approveReplacement(user.tenantId, id, user.id);
    }
    rejectReplacement(user, id) {
        return this.schedulesService.rejectReplacement(user.tenantId, id, user.id);
    }
    findOne(user, id) {
        return this.schedulesService.findOne(user.tenantId, id);
    }
    update(user, id, dto) {
        return this.schedulesService.update(user.tenantId, id, dto);
    }
    remove(user, id) {
        return this.schedulesService.remove(user.tenantId, id);
    }
    removeBulk(user, body) {
        return this.schedulesService.removeBulk(user.tenantId, body.ids);
    }
    async importExcel(user, file) {
        if (!file) {
            return {
                statusCode: common_1.HttpStatus.BAD_REQUEST,
                message: 'Aucun fichier téléchargé',
            };
        }
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
            return {
                statusCode: common_1.HttpStatus.BAD_REQUEST,
                message: 'Format de fichier invalide. Seuls les fichiers .xlsx et .xls sont acceptés.',
            };
        }
        const result = await this.schedulesService.importFromExcel(user.tenantId, file.buffer);
        return {
            statusCode: common_1.HttpStatus.OK,
            message: `Import terminé: ${result.success} planning(s) importé(s), ${result.failed} échec(s)`,
            data: result,
        };
    }
    async downloadTemplate(res) {
        const XLSX = require('xlsx');
        const templateData = [
            ['Matricule', 'Date Début', 'Date Fin', 'Code Shift', 'Heure Début', 'Heure Fin', 'Code Équipe', 'Notes'],
            ['EMP001', '15/01/2025', '', 'M', '08:00', '16:00', 'TEAM001', 'Une journée'],
            ['EMP002', '15/01/2025', '31/01/2025', 'S', '14:00', '22:00', '', 'Intervalle de dates'],
            ['EMP001', '01/02/2025', '28/02/2025', 'M', '', '', 'TEAM001', 'Tout le mois'],
        ];
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(templateData);
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 30 },
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Plannings');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `modele_import_plannings_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.send(buffer);
    }
};
exports.SchedulesController = SchedulesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create new schedule' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_schedule_dto_1.CreateScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Create multiple schedules' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_schedule_dto_1.BulkScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "createBulk", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all schedules' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('employeeId')),
    __param(4, (0, common_1.Query)('teamId')),
    __param(5, (0, common_1.Query)('shiftId')),
    __param(6, (0, common_1.Query)('siteId')),
    __param(7, (0, common_1.Query)('startDate')),
    __param(8, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('week/:date'),
    (0, swagger_1.ApiOperation)({ summary: 'Get week schedule' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('date')),
    __param(2, (0, common_1.Query)('teamId')),
    __param(3, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "getWeek", null);
__decorate([
    (0, common_1.Get)('month/:date'),
    (0, swagger_1.ApiOperation)({ summary: 'Get month schedule' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('date')),
    __param(2, (0, common_1.Query)('teamId')),
    __param(3, (0, common_1.Query)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "getMonth", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get legal alerts for date range' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Post)('replacements'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER, client_1.Role.EMPLOYEE),
    (0, swagger_1.ApiOperation)({ summary: 'Create replacement request' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_replacement_dto_1.CreateReplacementDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "createReplacement", null);
__decorate([
    (0, common_1.Get)('replacements'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all replacements' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "findAllReplacements", null);
__decorate([
    (0, common_1.Patch)('replacements/:id/approve'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Approve replacement' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "approveReplacement", null);
__decorate([
    (0, common_1.Patch)('replacements/:id/reject'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Reject replacement' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "rejectReplacement", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get schedule by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Update schedule' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_schedule_dto_1.UpdateScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Delete schedule' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)('bulk'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Delete multiple schedules' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "removeBulk", null);
__decorate([
    (0, common_1.Post)('import/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Import schedules from Excel file' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SchedulesController.prototype, "importExcel", null);
__decorate([
    (0, common_1.Get)('import/template'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN_RH, client_1.Role.MANAGER),
    (0, swagger_1.ApiOperation)({ summary: 'Download Excel template for schedule import' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchedulesController.prototype, "downloadTemplate", null);
exports.SchedulesController = SchedulesController = __decorate([
    (0, swagger_1.ApiTags)('Schedules'),
    (0, common_1.Controller)('schedules'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [schedules_service_1.SchedulesService,
        alerts_service_1.AlertsService])
], SchedulesController);
//# sourceMappingURL=schedules.controller.js.map