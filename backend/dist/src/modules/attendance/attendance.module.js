"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const attendance_service_1 = require("./attendance.service");
const attendance_controller_1 = require("./attendance.controller");
const prisma_module_1 = require("../../database/prisma.module");
const mail_module_1 = require("../mail/mail.module");
const detect_absences_job_1 = require("./jobs/detect-absences.job");
const detect_missing_out_job_1 = require("./jobs/detect-missing-out.job");
const auto_close_sessions_job_1 = require("./jobs/auto-close-sessions.job");
const missing_out_manager_notification_job_1 = require("./jobs/missing-out-manager-notification.job");
const missing_in_manager_notification_job_1 = require("./jobs/missing-in-manager-notification.job");
const late_manager_notification_job_1 = require("./jobs/late-manager-notification.job");
const absence_manager_notification_job_1 = require("./jobs/absence-manager-notification.job");
const absence_partial_manager_notification_job_1 = require("./jobs/absence-partial-manager-notification.job");
const absence_technical_manager_notification_job_1 = require("./jobs/absence-technical-manager-notification.job");
let AttendanceModule = class AttendanceModule {
};
exports.AttendanceModule = AttendanceModule;
exports.AttendanceModule = AttendanceModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, schedule_1.ScheduleModule, mail_module_1.MailModule],
        controllers: [attendance_controller_1.AttendanceController],
        providers: [
            attendance_service_1.AttendanceService,
            detect_absences_job_1.DetectAbsencesJob,
            detect_missing_out_job_1.DetectMissingOutJob,
            auto_close_sessions_job_1.AutoCloseSessionsJob,
            missing_out_manager_notification_job_1.MissingOutManagerNotificationJob,
            missing_in_manager_notification_job_1.MissingInManagerNotificationJob,
            late_manager_notification_job_1.LateManagerNotificationJob,
            absence_manager_notification_job_1.AbsenceManagerNotificationJob,
            absence_partial_manager_notification_job_1.AbsencePartialManagerNotificationJob,
            absence_technical_manager_notification_job_1.AbsenceTechnicalManagerNotificationJob,
        ],
        exports: [attendance_service_1.AttendanceService],
    })
], AttendanceModule);
//# sourceMappingURL=attendance.module.js.map