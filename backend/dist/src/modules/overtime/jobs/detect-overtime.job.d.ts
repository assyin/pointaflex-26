import { PrismaService } from '../../../database/prisma.service';
import { OvertimeService } from '../overtime.service';
export declare class DetectOvertimeJob {
    private prisma;
    private overtimeService;
    private readonly logger;
    constructor(prisma: PrismaService, overtimeService: OvertimeService);
    detectOvertime(): Promise<void>;
    private consolidateOvertimeForTenant;
    private isNightShiftTime;
    private isEmployeeOnLeaveOrRecovery;
}
