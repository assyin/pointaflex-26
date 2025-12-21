"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_module_1 = require("./database/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const users_module_1 = require("./modules/users/users.module");
const employees_module_1 = require("./modules/employees/employees.module");
const attendance_module_1 = require("./modules/attendance/attendance.module");
const shifts_module_1 = require("./modules/shifts/shifts.module");
const teams_module_1 = require("./modules/teams/teams.module");
const schedules_module_1 = require("./modules/schedules/schedules.module");
const leaves_module_1 = require("./modules/leaves/leaves.module");
const overtime_module_1 = require("./modules/overtime/overtime.module");
const recovery_days_module_1 = require("./modules/recovery-days/recovery-days.module");
const reports_module_1 = require("./modules/reports/reports.module");
const audit_module_1 = require("./modules/audit/audit.module");
const devices_module_1 = require("./modules/devices/devices.module");
const data_generator_module_1 = require("./modules/data-generator/data-generator.module");
const sites_module_1 = require("./modules/sites/sites.module");
const site_managers_module_1 = require("./modules/site-managers/site-managers.module");
const departments_module_1 = require("./modules/departments/departments.module");
const positions_module_1 = require("./modules/positions/positions.module");
const holidays_module_1 = require("./modules/holidays/holidays.module");
const roles_module_1 = require("./modules/roles/roles.module");
const permissions_module_1 = require("./modules/permissions/permissions.module");
const terminal_matricule_mapping_module_1 = require("./modules/terminal-matricule-mapping/terminal-matricule-mapping.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const tenant_resolver_middleware_1 = require("./common/middleware/tenant-resolver.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_resolver_middleware_1.TenantResolverMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            cache_manager_1.CacheModule.register({
                isGlobal: true,
                ttl: 300000,
                max: 100,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            tenants_module_1.TenantsModule,
            users_module_1.UsersModule,
            employees_module_1.EmployeesModule,
            attendance_module_1.AttendanceModule,
            shifts_module_1.ShiftsModule,
            teams_module_1.TeamsModule,
            schedules_module_1.SchedulesModule,
            leaves_module_1.LeavesModule,
            overtime_module_1.OvertimeModule,
            recovery_days_module_1.RecoveryDaysModule,
            reports_module_1.ReportsModule,
            audit_module_1.AuditModule,
            devices_module_1.DevicesModule,
            data_generator_module_1.DataGeneratorModule,
            sites_module_1.SitesModule,
            site_managers_module_1.SiteManagersModule,
            departments_module_1.DepartmentsModule,
            positions_module_1.PositionsModule,
            holidays_module_1.HolidaysModule,
            roles_module_1.RolesModule,
            permissions_module_1.PermissionsModule,
            terminal_matricule_mapping_module_1.TerminalMatriculeMappingModule,
            dashboard_module_1.DashboardModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: permissions_guard_1.PermissionsGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map