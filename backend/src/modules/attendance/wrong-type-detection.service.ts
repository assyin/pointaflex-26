import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface WrongTypeDetectionResult {
  isWrongType: boolean;
  confidence: number; // 0-100
  expectedType: 'IN' | 'OUT' | null;
  actualType: 'IN' | 'OUT';
  reason: string;
  detectionMethod: string;
}

@Injectable()
export class WrongTypeDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Détecte si un pointage a probablement le mauvais type (IN au lieu de OUT ou inversement).
   * Retourne un résultat avec le niveau de confiance.
   */
  async detect(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    actualType: 'IN' | 'OUT',
    departmentId?: string,
  ): Promise<WrongTypeDetectionResult> {
    // 1. Charger la config tenant + éventuel override département
    const config = await this.getEffectiveConfig(tenantId, departmentId);

    if (!config.enabled) {
      return { isWrongType: false, confidence: 0, expectedType: null, actualType, reason: 'Détection désactivée', detectionMethod: 'NONE' };
    }

    const method = config.detectionMethod;

    if (method === 'SHIFT_BASED' || method === 'COMBINED') {
      const shiftResult = await this.detectByShift(tenantId, employeeId, timestamp, actualType, config.marginMinutes);
      if (shiftResult.isWrongType && shiftResult.confidence >= config.confidenceThreshold) {
        return shiftResult;
      }
      if (method === 'SHIFT_BASED') {
        return shiftResult;
      }
    }

    if (method === 'CONTEXT_BASED' || method === 'COMBINED') {
      const contextResult = await this.detectByContext(tenantId, employeeId, timestamp, actualType);
      if (contextResult.isWrongType && contextResult.confidence >= config.confidenceThreshold) {
        return contextResult;
      }
      if (method === 'CONTEXT_BASED') {
        return contextResult;
      }
    }

    return { isWrongType: false, confidence: 0, expectedType: null, actualType, reason: 'Aucune anomalie de type détectée', detectionMethod: method };
  }

  /**
   * Détection basée sur le shift de l'employé.
   * Compare le timestamp avec les heures de début/fin du shift.
   */
  private async detectByShift(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    actualType: 'IN' | 'OUT',
    marginMinutes: number,
  ): Promise<WrongTypeDetectionResult> {
    // Trouver le shift actuel de l'employé (via schedule ou shift par défaut)
    const dateStr = timestamp.toISOString().split('T')[0];
    const dayOfWeek = timestamp.getDay(); // 0=Sunday

    // Chercher le planning du jour
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        tenantId,
        employeeId,
        date: new Date(dateStr),
      },
      include: { shift: true },
    });

    // Fallback: shift par défaut de l'employé
    let shift = schedule?.shift as any;
    if (!shift) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        include: { currentShift: true },
      });
      shift = employee?.currentShift;
    }

    if (!shift) {
      return {
        isWrongType: false,
        confidence: 0,
        expectedType: null,
        actualType,
        reason: 'Aucun shift trouvé pour cet employé',
        detectionMethod: 'SHIFT_BASED',
      };
    }

    // Parser les heures du shift
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);

    const punchMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
    const shiftStartMinutes = startH * 60 + startM;
    const shiftEndMinutes = endH * 60 + endM;

    // Gérer les shifts de nuit (endTime < startTime)
    const isNightShift = shiftEndMinutes < shiftStartMinutes;

    let distanceToStart: number;
    let distanceToEnd: number;

    if (isNightShift) {
      // Shift de nuit: ex 21:00-05:00
      // Normaliser les minutes
      const normalizedPunch = punchMinutes < shiftStartMinutes ? punchMinutes + 1440 : punchMinutes;
      const normalizedEnd = shiftEndMinutes + 1440;
      distanceToStart = Math.abs(normalizedPunch - shiftStartMinutes);
      distanceToEnd = Math.abs(normalizedPunch - normalizedEnd);
    } else {
      distanceToStart = Math.abs(punchMinutes - shiftStartMinutes);
      distanceToEnd = Math.abs(punchMinutes - shiftEndMinutes);
    }

    // Logique: si le pointage est proche du début du shift → devrait être IN
    //          si le pointage est proche de la fin du shift → devrait être OUT
    let expectedType: 'IN' | 'OUT' | null = null;
    let confidence = 0;

    if (distanceToStart <= marginMinutes && distanceToEnd > marginMinutes) {
      expectedType = 'IN';
      // Plus le pointage est proche du début, plus la confiance est élevée
      confidence = Math.round(100 - (distanceToStart / marginMinutes) * 40);
    } else if (distanceToEnd <= marginMinutes && distanceToStart > marginMinutes) {
      expectedType = 'OUT';
      confidence = Math.round(100 - (distanceToEnd / marginMinutes) * 40);
    } else if (distanceToStart <= marginMinutes && distanceToEnd <= marginMinutes) {
      // Ambigu - choisir le plus proche
      expectedType = distanceToStart < distanceToEnd ? 'IN' : 'OUT';
      confidence = 50; // Faible confiance car ambigu
    }

    if (expectedType && expectedType !== actualType) {
      return {
        isWrongType: true,
        confidence: Math.min(confidence, 100),
        expectedType,
        actualType,
        reason: `Pointage ${actualType} proche de ${expectedType === 'IN' ? 'début' : 'fin'} du shift (${shift.startTime}-${shift.endTime}). Distance: ${expectedType === 'IN' ? distanceToStart : distanceToEnd} min`,
        detectionMethod: 'SHIFT_BASED',
      };
    }

    return {
      isWrongType: false,
      confidence: 0,
      expectedType: null,
      actualType,
      reason: 'Type cohérent avec le shift',
      detectionMethod: 'SHIFT_BASED',
    };
  }

  /**
   * Détection basée sur le contexte des pointages précédents.
   * Si le dernier pointage est IN et le nouveau est aussi IN → le nouveau devrait être OUT.
   */
  private async detectByContext(
    tenantId: string,
    employeeId: string,
    timestamp: Date,
    actualType: 'IN' | 'OUT',
  ): Promise<WrongTypeDetectionResult> {
    // Chercher le dernier pointage valide (non DEBOUNCE_BLOCKED)
    const lastPunch = await this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        timestamp: { lt: timestamp },
        OR: [
          { anomalyType: null },
          { anomalyType: { notIn: ['DEBOUNCE_BLOCKED', 'PROBABLE_WRONG_TYPE'] } },
        ],
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastPunch) {
      // Premier pointage du jour → devrait être IN
      if (actualType === 'OUT') {
        return {
          isWrongType: true,
          confidence: 70,
          expectedType: 'IN',
          actualType,
          reason: 'Premier pointage de la journée enregistré comme OUT (attendu: IN)',
          detectionMethod: 'CONTEXT_BASED',
        };
      }
      return {
        isWrongType: false,
        confidence: 0,
        expectedType: null,
        actualType,
        reason: 'Premier pointage IN cohérent',
        detectionMethod: 'CONTEXT_BASED',
      };
    }

    // Vérifier la séquence logique
    const hoursSinceLastPunch = (timestamp.getTime() - lastPunch.timestamp.getTime()) / (1000 * 60 * 60);

    // Si le dernier pointage est du même type et dans un délai raisonnable (< 14h)
    if (lastPunch.type === actualType && hoursSinceLastPunch < 14) {
      const expectedType = actualType === 'IN' ? 'OUT' : 'IN';
      // Confiance basée sur le délai: plus c'est dans la journée, plus c'est probable
      const confidence = hoursSinceLastPunch < 12 ? 85 : 65;

      return {
        isWrongType: true,
        confidence,
        expectedType,
        actualType,
        reason: `Deux ${actualType} consécutifs détectés (dernier: ${lastPunch.timestamp.toLocaleTimeString('fr-FR')}, il y a ${hoursSinceLastPunch.toFixed(1)}h). Attendu: ${expectedType}`,
        detectionMethod: 'CONTEXT_BASED',
      };
    }

    return {
      isWrongType: false,
      confidence: 0,
      expectedType: null,
      actualType,
      reason: 'Séquence de types cohérente',
      detectionMethod: 'CONTEXT_BASED',
    };
  }

  /**
   * Récupère la configuration effective (tenant + override département).
   */
  private async getEffectiveConfig(
    tenantId: string,
    departmentId?: string,
  ): Promise<{
    enabled: boolean;
    autoCorrect: boolean;
    detectionMethod: string;
    marginMinutes: number;
    confidenceThreshold: number;
    requiresValidation: boolean;
  }> {
    const tenantSettings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        enableWrongTypeDetection: true,
        wrongTypeAutoCorrect: true,
        wrongTypeDetectionMethod: true,
        wrongTypeShiftMarginMinutes: true,
        wrongTypeConfidenceThreshold: true,
        wrongTypeRequiresValidation: true,
      },
    });

    const baseConfig = {
      enabled: tenantSettings?.enableWrongTypeDetection ?? false,
      autoCorrect: tenantSettings?.wrongTypeAutoCorrect ?? false,
      detectionMethod: tenantSettings?.wrongTypeDetectionMethod ?? 'SHIFT_BASED',
      marginMinutes: tenantSettings?.wrongTypeShiftMarginMinutes ?? 120,
      confidenceThreshold: tenantSettings?.wrongTypeConfidenceThreshold ?? 80,
      requiresValidation: tenantSettings?.wrongTypeRequiresValidation ?? true,
    };

    // Override par département si existe
    if (departmentId) {
      const deptSettings = await this.prisma.departmentSettings.findUnique({
        where: { departmentId },
        select: {
          wrongTypeDetectionEnabled: true,
          wrongTypeAutoCorrect: true,
          wrongTypeShiftMarginMinutes: true,
        },
      });

      if (deptSettings) {
        if (deptSettings.wrongTypeDetectionEnabled !== null) {
          baseConfig.enabled = deptSettings.wrongTypeDetectionEnabled;
        }
        if (deptSettings.wrongTypeAutoCorrect !== null) {
          baseConfig.autoCorrect = deptSettings.wrongTypeAutoCorrect;
        }
        if (deptSettings.wrongTypeShiftMarginMinutes !== null) {
          baseConfig.marginMinutes = deptSettings.wrongTypeShiftMarginMinutes;
        }
      }
    }

    return baseConfig;
  }
}
