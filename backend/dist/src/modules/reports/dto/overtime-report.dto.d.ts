import { OvertimeStatus } from '@prisma/client';
export declare class OvertimeReportDto {
    startDate: string;
    endDate: string;
    employeeId?: string;
    departmentId?: string;
    siteId?: string;
    teamId?: string;
    status?: OvertimeStatus;
    type?: string;
}
