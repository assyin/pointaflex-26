import { Module } from '@nestjs/common';
import { TerminalMatriculeMappingService } from './terminal-matricule-mapping.service';
import { TerminalMatriculeMappingController } from './terminal-matricule-mapping.controller';
import { TerminalMatriculeMappingScheduler } from './terminal-matricule-mapping.scheduler';
import { PrismaModule } from '../../database/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, ScheduleModule],
  providers: [
    TerminalMatriculeMappingService,
    TerminalMatriculeMappingScheduler,
  ],
  controllers: [TerminalMatriculeMappingController],
  exports: [TerminalMatriculeMappingService],
})
export class TerminalMatriculeMappingModule {}

