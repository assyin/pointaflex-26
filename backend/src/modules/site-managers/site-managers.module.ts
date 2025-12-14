import { Module } from '@nestjs/common';
import { SiteManagersService } from './site-managers.service';
import { SiteManagersController } from './site-managers.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SiteManagersController],
  providers: [SiteManagersService],
  exports: [SiteManagersService],
})
export class SiteManagersModule {}
