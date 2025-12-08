import { PrismaService } from '../../database/prisma.service';
export interface LegalAlert {
    id: string;
    type: 'WARNING' | 'CRITICAL';
    message: string;
    employeeId?: string;
    employeeName?: string;
    date?: string;
    details?: any;
}
export declare class AlertsService {
    private prisma;
    constructor(prisma: PrismaService);
    generateAlerts(tenantId: string, startDate: Date, endDate: Date): Promise<LegalAlert[]>;
    private checkWeeklyHours;
    private checkRestPeriods;
    private checkNightShifts;
    private checkMinimumStaff;
    private getWeekKey;
    private calculateHours;
    private calculateRestHours;
    private getDatesBetween;
}
