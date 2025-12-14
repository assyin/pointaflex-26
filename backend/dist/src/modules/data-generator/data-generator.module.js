"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGeneratorModule = void 0;
const common_1 = require("@nestjs/common");
const data_generator_service_1 = require("./data-generator.service");
const data_generator_controller_1 = require("./data-generator.controller");
const data_generator_shifts_service_1 = require("./data-generator-shifts.service");
const data_generator_shifts_controller_1 = require("./data-generator-shifts.controller");
const data_generator_holidays_service_1 = require("./data-generator-holidays.service");
const data_generator_holidays_controller_1 = require("./data-generator-holidays.controller");
const data_generator_leaves_service_1 = require("./data-generator-leaves.service");
const data_generator_leaves_controller_1 = require("./data-generator-leaves.controller");
const data_generator_schedules_service_1 = require("./data-generator-schedules.service");
const data_generator_schedules_controller_1 = require("./data-generator-schedules.controller");
const data_generator_orchestrator_service_1 = require("./data-generator-orchestrator.service");
const data_generator_cleanup_service_1 = require("./data-generator-cleanup.service");
const data_generator_structure_service_1 = require("./data-generator-structure.service");
const data_generator_rbac_service_1 = require("./data-generator-rbac.service");
const data_generator_employee_service_1 = require("./data-generator-employee.service");
const data_generator_hierarchy_service_1 = require("./data-generator-hierarchy.service");
const data_generator_overtime_service_1 = require("./data-generator-overtime.service");
const data_generator_recovery_service_1 = require("./data-generator-recovery.service");
const data_generator_device_service_1 = require("./data-generator-device.service");
const data_generator_replacement_service_1 = require("./data-generator-replacement.service");
const data_generator_notification_service_1 = require("./data-generator-notification.service");
const data_generator_all_controller_1 = require("./data-generator-all.controller");
const prisma_module_1 = require("../../database/prisma.module");
const attendance_module_1 = require("../attendance/attendance.module");
let DataGeneratorModule = class DataGeneratorModule {
};
exports.DataGeneratorModule = DataGeneratorModule;
exports.DataGeneratorModule = DataGeneratorModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, attendance_module_1.AttendanceModule],
        controllers: [
            data_generator_controller_1.DataGeneratorController,
            data_generator_shifts_controller_1.DataGeneratorShiftsController,
            data_generator_holidays_controller_1.DataGeneratorHolidaysController,
            data_generator_leaves_controller_1.DataGeneratorLeavesController,
            data_generator_schedules_controller_1.DataGeneratorSchedulesController,
            data_generator_all_controller_1.DataGeneratorAllController,
        ],
        providers: [
            data_generator_service_1.DataGeneratorService,
            data_generator_shifts_service_1.DataGeneratorShiftsService,
            data_generator_holidays_service_1.DataGeneratorHolidaysService,
            data_generator_leaves_service_1.DataGeneratorLeavesService,
            data_generator_schedules_service_1.DataGeneratorSchedulesService,
            data_generator_orchestrator_service_1.DataGeneratorOrchestratorService,
            data_generator_cleanup_service_1.DataGeneratorCleanupService,
            data_generator_structure_service_1.DataGeneratorStructureService,
            data_generator_rbac_service_1.DataGeneratorRBACService,
            data_generator_employee_service_1.DataGeneratorEmployeeService,
            data_generator_hierarchy_service_1.DataGeneratorHierarchyService,
            data_generator_overtime_service_1.DataGeneratorOvertimeService,
            data_generator_recovery_service_1.DataGeneratorRecoveryService,
            data_generator_device_service_1.DataGeneratorDeviceService,
            data_generator_replacement_service_1.DataGeneratorReplacementService,
            data_generator_notification_service_1.DataGeneratorNotificationService,
        ],
        exports: [
            data_generator_service_1.DataGeneratorService,
            data_generator_shifts_service_1.DataGeneratorShiftsService,
            data_generator_holidays_service_1.DataGeneratorHolidaysService,
            data_generator_leaves_service_1.DataGeneratorLeavesService,
            data_generator_schedules_service_1.DataGeneratorSchedulesService,
            data_generator_orchestrator_service_1.DataGeneratorOrchestratorService,
            data_generator_cleanup_service_1.DataGeneratorCleanupService,
            data_generator_structure_service_1.DataGeneratorStructureService,
            data_generator_rbac_service_1.DataGeneratorRBACService,
            data_generator_employee_service_1.DataGeneratorEmployeeService,
            data_generator_hierarchy_service_1.DataGeneratorHierarchyService,
            data_generator_overtime_service_1.DataGeneratorOvertimeService,
            data_generator_recovery_service_1.DataGeneratorRecoveryService,
            data_generator_device_service_1.DataGeneratorDeviceService,
            data_generator_replacement_service_1.DataGeneratorReplacementService,
            data_generator_notification_service_1.DataGeneratorNotificationService,
        ],
    })
], DataGeneratorModule);
//# sourceMappingURL=data-generator.module.js.map