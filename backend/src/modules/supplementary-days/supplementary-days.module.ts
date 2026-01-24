import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SupplementaryDaysService } from './supplementary-days.service';
import { SupplementaryDaysController } from './supplementary-days.controller';
import { PrismaModule } from '../../database/prisma.module';
import { DetectSupplementaryDaysJob } from './jobs/detect-supplementary-days.job';

@Module({
  imports: [PrismaModule, ScheduleModule],
  controllers: [SupplementaryDaysController],
  providers: [SupplementaryDaysService, DetectSupplementaryDaysJob],
  exports: [SupplementaryDaysService],
})
export class SupplementaryDaysModule {}
