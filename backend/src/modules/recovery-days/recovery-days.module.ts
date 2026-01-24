import { Module } from '@nestjs/common';
import { RecoveryDaysController } from './recovery-days.controller';
import { RecoveryDaysService } from './recovery-days.service';
import { PrismaModule } from '../../database/prisma.module';
import { MarkUsedRecoveryDaysJob } from './jobs/mark-used-recovery-days.job';

@Module({
  imports: [PrismaModule],
  controllers: [RecoveryDaysController],
  providers: [RecoveryDaysService, MarkUsedRecoveryDaysJob],
  exports: [RecoveryDaysService, MarkUsedRecoveryDaysJob],
})
export class RecoveryDaysModule {}
