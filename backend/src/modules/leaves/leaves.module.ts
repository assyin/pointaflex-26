import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { LeaveTypesController } from './leave-types.controller';
import { PrismaModule } from '../../database/prisma.module';
import { FileStorageService } from './services/file-storage.service';
import { LeaveBalanceService } from './services/leave-balance.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeavesController, LeaveTypesController],
  providers: [LeavesService, FileStorageService, LeaveBalanceService],
  exports: [LeavesService, LeaveBalanceService],
})
export class LeavesModule {}
