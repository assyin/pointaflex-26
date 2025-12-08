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
  ],
  providers: [
    DataGeneratorService,
    DataGeneratorShiftsService,
    DataGeneratorHolidaysService,
    DataGeneratorLeavesService,
    DataGeneratorSchedulesService,
  ],
  exports: [
    DataGeneratorService,
    DataGeneratorShiftsService,
    DataGeneratorHolidaysService,
    DataGeneratorLeavesService,
    DataGeneratorSchedulesService,
  ],
})
export class DataGeneratorModule {}
