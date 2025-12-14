import { Module } from '@nestjs/common';
import { DataGeneratorService } from './data-generator.service';
import { DataGeneratorController } from './data-generator.controller';
import { DataGeneratorShiftsService } from './data-generator-shifts.service';
import { DataGeneratorShiftsController } from './data-generator-shifts.controller';
import { DataGeneratorHolidaysService } from './data-generator-holidays.service';
import { DataGeneratorHolidaysController } from './data-generator-holidays.controller';
import { DataGeneratorLeavesService } from './data-generator-leaves.service';
import { DataGeneratorLeavesController } from './data-generator-leaves.controller';
import { DataGeneratorSchedulesService } from './data-generator-schedules.service';
import { DataGeneratorSchedulesController } from './data-generator-schedules.controller';
import { DataGeneratorOrchestratorService } from './data-generator-orchestrator.service';
import { DataGeneratorCleanupService } from './data-generator-cleanup.service';
import { DataGeneratorStructureService } from './data-generator-structure.service';
import { DataGeneratorRBACService } from './data-generator-rbac.service';
import { DataGeneratorEmployeeService } from './data-generator-employee.service';
import { DataGeneratorHierarchyService } from './data-generator-hierarchy.service';
import { DataGeneratorOvertimeService } from './data-generator-overtime.service';
import { DataGeneratorRecoveryService } from './data-generator-recovery.service';
import { DataGeneratorDeviceService } from './data-generator-device.service';
import { DataGeneratorReplacementService } from './data-generator-replacement.service';
import { DataGeneratorNotificationService } from './data-generator-notification.service';
import { DataGeneratorAllController } from './data-generator-all.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [PrismaModule, AttendanceModule],
  controllers: [
    DataGeneratorController,
    DataGeneratorShiftsController,
    DataGeneratorHolidaysController,
    DataGeneratorLeavesController,
    DataGeneratorSchedulesController,
    DataGeneratorAllController,
  ],
  providers: [
    DataGeneratorService,
    DataGeneratorShiftsService,
    DataGeneratorHolidaysService,
    DataGeneratorLeavesService,
    DataGeneratorSchedulesService,
    DataGeneratorOrchestratorService,
    DataGeneratorCleanupService,
    DataGeneratorStructureService,
    DataGeneratorRBACService,
    DataGeneratorEmployeeService,
    DataGeneratorHierarchyService,
    DataGeneratorOvertimeService,
    DataGeneratorRecoveryService,
    DataGeneratorDeviceService,
    DataGeneratorReplacementService,
    DataGeneratorNotificationService,
  ],
  exports: [
    DataGeneratorService,
    DataGeneratorShiftsService,
    DataGeneratorHolidaysService,
    DataGeneratorLeavesService,
    DataGeneratorSchedulesService,
    DataGeneratorOrchestratorService,
    DataGeneratorCleanupService,
    DataGeneratorStructureService,
    DataGeneratorRBACService,
    DataGeneratorEmployeeService,
    DataGeneratorHierarchyService,
    DataGeneratorOvertimeService,
    DataGeneratorRecoveryService,
    DataGeneratorDeviceService,
    DataGeneratorReplacementService,
    DataGeneratorNotificationService,
  ],
})
export class DataGeneratorModule {}
