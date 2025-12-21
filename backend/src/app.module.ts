import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { TeamsModule } from './modules/teams/teams.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { RecoveryDaysModule } from './modules/recovery-days/recovery-days.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DataGeneratorModule } from './modules/data-generator/data-generator.module';
import { SitesModule } from './modules/sites/sites.module';
import { SiteManagersModule } from './modules/site-managers/site-managers.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PositionsModule } from './modules/positions/positions.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { TerminalMatriculeMappingModule } from './modules/terminal-matricule-mapping/terminal-matricule-mapping.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 5 minutes par défaut
      max: 100, // 100 éléments max en cache
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    EmployeesModule,
    AttendanceModule,
    ShiftsModule,
    TeamsModule,
    SchedulesModule,
    LeavesModule,
    OvertimeModule,
    RecoveryDaysModule,
    ReportsModule,
    AuditModule,
    DevicesModule,
    DataGeneratorModule,
    SitesModule,
    SiteManagersModule,
    DepartmentsModule,
    PositionsModule,
    HolidaysModule,
    RolesModule,
    PermissionsModule,
    TerminalMatriculeMappingModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
