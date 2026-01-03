import { Module } from '@nestjs/common';
import { EmailAdminController } from './email-admin.controller';
import { EmailAdminService } from './email-admin.service';
import { PrismaModule } from '../../database/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [EmailAdminController],
  providers: [EmailAdminService],
  exports: [EmailAdminService],
})
export class EmailAdminModule {}

