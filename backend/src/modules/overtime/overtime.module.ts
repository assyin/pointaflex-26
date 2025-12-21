import { Module } from '@nestjs/common';
import { OvertimeService } from './overtime.service';
import { OvertimeController } from './overtime.controller';
import { PrismaModule } from '../../database/prisma.module';
import { RecoveryDaysModule } from '../recovery-days/recovery-days.module';

@Module({
  imports: [PrismaModule, RecoveryDaysModule],
  controllers: [OvertimeController],
  providers: [OvertimeService],
  exports: [OvertimeService],
})
export class OvertimeModule {}
