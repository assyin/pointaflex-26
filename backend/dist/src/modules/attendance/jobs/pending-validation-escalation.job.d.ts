import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/mail.service';
import { AttendanceService } from '../attendance.service';
export declare class PendingValidationEscalationJob {
    private prisma;
    private mailService;
    private attendanceService;
    private readonly logger;
    constructor(prisma: PrismaService, mailService: MailService, attendanceService: AttendanceService);
    handlePendingValidationEscalations(): Promise<void>;
    private getActiveTenants;
    private isScheduledTime;
    private processTenant;
    private sendEscalationNotification;
    private sendNotificationEmail;
}
