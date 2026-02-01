import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaModule } from '../../database/prisma.module';
import { MailModule } from '../mail/mail.module';
import { SupplementaryDaysModule } from '../supplementary-days/supplementary-days.module';
import { DetectAbsencesJob } from './jobs/detect-absences.job';
import { DetectMissingOutJob } from './jobs/detect-missing-out.job';
import { AutoCloseSessionsJob } from './jobs/auto-close-sessions.job';
import { MissingOutManagerNotificationJob } from './jobs/missing-out-manager-notification.job';
import { MissingInManagerNotificationJob } from './jobs/missing-in-manager-notification.job';
import { LateManagerNotificationJob } from './jobs/late-manager-notification.job';
import { AbsenceManagerNotificationJob } from './jobs/absence-manager-notification.job';
import { AbsencePartialManagerNotificationJob } from './jobs/absence-partial-manager-notification.job';
import { AbsenceTechnicalManagerNotificationJob } from './jobs/absence-technical-manager-notification.job';
import { PendingValidationEscalationJob } from './jobs/pending-validation-escalation.job';
import { WrongTypeDetectionService } from './wrong-type-detection.service';

@Module({
  imports: [PrismaModule, ScheduleModule, MailModule, forwardRef(() => SupplementaryDaysModule)],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    WrongTypeDetectionService,
    DetectAbsencesJob,
    DetectMissingOutJob,
    AutoCloseSessionsJob,
    MissingOutManagerNotificationJob,
    MissingInManagerNotificationJob,
    LateManagerNotificationJob,
    AbsenceManagerNotificationJob,
    AbsencePartialManagerNotificationJob,
    AbsenceTechnicalManagerNotificationJob,
    PendingValidationEscalationJob,
  ],
  exports: [AttendanceService, WrongTypeDetectionService],
})
export class AttendanceModule {}
