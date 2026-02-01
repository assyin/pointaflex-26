import { PrismaService } from '../../database/prisma.service';
export interface WrongTypeDetectionResult {
    isWrongType: boolean;
    confidence: number;
    expectedType: 'IN' | 'OUT' | null;
    actualType: 'IN' | 'OUT';
    reason: string;
    detectionMethod: string;
}
export declare class WrongTypeDetectionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    detect(tenantId: string, employeeId: string, timestamp: Date, actualType: 'IN' | 'OUT', departmentId?: string): Promise<WrongTypeDetectionResult>;
    private detectByShift;
    private detectByContext;
    private getEffectiveConfig;
}
