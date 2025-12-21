import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { PrismaModule } from '../../database/prisma.module';
import { UserTenantRolesService } from '../users/user-tenant-roles.service';
import { RolesService } from '../roles/roles.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditModule } from '../audit/audit.module';
import { TerminalMatriculeMappingModule } from '../terminal-matricule-mapping/terminal-matricule-mapping.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    AuditModule,
    TerminalMatriculeMappingModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, UserTenantRolesService, RolesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
