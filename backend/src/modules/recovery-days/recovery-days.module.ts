import { Module } from '@nestjs/common';
import { RecoveryDaysController } from './recovery-days.controller';
import { RecoveryDaysService } from './recovery-days.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecoveryDaysController],
  providers: [RecoveryDaysService],
  exports: [RecoveryDaysService],
})
export class RecoveryDaysModule {}
