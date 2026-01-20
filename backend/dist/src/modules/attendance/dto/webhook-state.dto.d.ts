import { AttendanceType, DeviceType } from '@prisma/client';
export declare class WebhookStateDto {
    employeeId: string;
    timestamp: string;
    type: AttendanceType;
    terminalState: number;
    method?: DeviceType;
    source?: string;
    rawData?: Record<string, any>;
}
export declare class WebhookStateResponseDto {
    status: 'CREATED' | 'DUPLICATE' | 'DEBOUNCE_BLOCKED' | 'ERROR';
    id?: string;
    type?: string;
    anomaly?: string;
    existingId?: string;
    error?: string;
    duration?: number;
}
