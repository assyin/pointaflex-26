"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OvertimeModule = void 0;
const common_1 = require("@nestjs/common");
const overtime_service_1 = require("./overtime.service");
const overtime_controller_1 = require("./overtime.controller");
const prisma_module_1 = require("../../database/prisma.module");
const recovery_days_module_1 = require("../recovery-days/recovery-days.module");
let OvertimeModule = class OvertimeModule {
};
exports.OvertimeModule = OvertimeModule;
exports.OvertimeModule = OvertimeModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, recovery_days_module_1.RecoveryDaysModule],
        controllers: [overtime_controller_1.OvertimeController],
        providers: [overtime_service_1.OvertimeService],
        exports: [overtime_service_1.OvertimeService],
    })
], OvertimeModule);
//# sourceMappingURL=overtime.module.js.map