import { AttendanceType } from '@prisma/client';

export interface TimePattern {
  type: AttendanceType;
  timeOffset: string; // Format "HH:mm"
  varianceMinutes: number; // Variance en minutes (±)
}

export interface GenerationScenario {
  name: string;
  description: string;
  probability: number; // Entre 0 et 1
  patterns: TimePattern[];
  requiresShift?: boolean; // Si le scénario nécessite un shift assigné
}

export interface ScenarioDistribution {
  normal: number; // Pourcentage
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
