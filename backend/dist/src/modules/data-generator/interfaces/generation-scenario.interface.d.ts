import { AttendanceType } from '@prisma/client';
export interface TimePattern {
    type: AttendanceType;
    timeOffset: string;
    varianceMinutes: number;
}
export interface GenerationScenario {
    name: string;
    description: string;
    probability: number;
    patterns: TimePattern[];
    requiresShift?: boolean;
}
export interface ScenarioDistribution {
    normal: number;
    late: number;
    earlyLeave: number;
    anomaly: number;
    mission: number;
    absence: number;
}
export interface GenerationStats {
    totalGenerated: number;
    byType: Record<string, number>;
    byScenario: Record<string, number>;
    anomaliesDetected: number;
    startDate: string;
    endDate: string;
}
