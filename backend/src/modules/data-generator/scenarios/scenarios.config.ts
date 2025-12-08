import { AttendanceType } from '@prisma/client';
import { GenerationScenario } from '../interfaces/generation-scenario.interface';

/**
 * Scénario : Journée normale
 * IN → BREAK_START → BREAK_END → OUT
 */
export const NORMAL_DAY_SCENARIO: GenerationScenario = {
  name: 'normal',
  description: 'Journée de travail normale avec pause déjeuner',
  probability: 0.70, // 70%
  patterns: [
    { type: AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
    { type: AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
    { type: AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
    { type: AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
  ],
  requiresShift: true,
};

/**
 * Scénario : Retard
 * Arrivée en retard (15-60 minutes)
 */
export const LATE_ARRIVAL_SCENARIO: GenerationScenario = {
  name: 'late',
  description: 'Arrivée en retard',
  probability: 0.15, // 15%
  patterns: [
    { type: AttendanceType.IN, timeOffset: '08:45', varianceMinutes: 30 }, // Retard de 45min ± 30min
    { type: AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
    { type: AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
    { type: AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
  ],
  requiresShift: true,
};

/**
 * Scénario : Départ anticipé
 */
export const EARLY_LEAVE_SCENARIO: GenerationScenario = {
  name: 'earlyLeave',
  description: 'Départ anticipé',
  probability: 0.05, // 5%
  patterns: [
    { type: AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
    { type: AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
    { type: AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
    { type: AttendanceType.OUT, timeOffset: '15:30', varianceMinutes: 15 }, // Départ à 15h30
  ],
  requiresShift: true,
};

/**
 * Scénario : Mission
 * Début et fin de mission
 */
export const MISSION_SCENARIO: GenerationScenario = {
  name: 'mission',
  description: 'Mission externe',
  probability: 0.02, // 2%
  patterns: [
    { type: AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
    { type: AttendanceType.MISSION_START, timeOffset: '09:00', varianceMinutes: 15 },
    { type: AttendanceType.MISSION_END, timeOffset: '15:00', varianceMinutes: 30 },
    { type: AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
  ],
  requiresShift: false,
};

/**
 * Scénario : Oubli de sortie (anomalie)
 * IN → BREAK_START → BREAK_END → [PAS DE OUT]
 */
export const MISSING_OUT_SCENARIO: GenerationScenario = {
  name: 'missingOut',
  description: 'Oubli de pointage de sortie',
  probability: 0.03, // 3%
  patterns: [
    { type: AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
    { type: AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
    { type: AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
    // Pas de OUT volontairement
  ],
  requiresShift: true,
};

/**
 * Scénario : Double entrée (anomalie)
 * IN → IN (erreur)
 */
export const DOUBLE_IN_SCENARIO: GenerationScenario = {
  name: 'doubleIn',
  description: 'Double pointage d\'entrée',
  probability: 0.02, // 2%
  patterns: [
    { type: AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 5 },
    { type: AttendanceType.IN, timeOffset: '08:30', varianceMinutes: 10 }, // Double IN
    { type: AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
    { type: AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
    { type: AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
  ],
  requiresShift: true,
};

/**
 * Scénario : Pause trop longue (anomalie)
 */
export const LONG_BREAK_SCENARIO: GenerationScenario = {
  name: 'longBreak',
  description: 'Pause déjeuner trop longue',
  probability: 0.02, // 2%
  patterns: [
    { type: AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
    { type: AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
    { type: AttendanceType.BREAK_END, timeOffset: '14:30', varianceMinutes: 20 }, // 2h30 de pause
    { type: AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
  ],
  requiresShift: true,
};

/**
 * Scénario : Absence complète
 * Aucun pointage généré
 */
export const ABSENCE_SCENARIO: GenerationScenario = {
  name: 'absence',
  description: 'Absence complète (aucun pointage)',
  probability: 0.01, // 1%
  patterns: [], // Pas de pointages
  requiresShift: false,
};

/**
 * Toutes les scénarios disponibles
 */
export const ALL_SCENARIOS: GenerationScenario[] = [
  NORMAL_DAY_SCENARIO,
  LATE_ARRIVAL_SCENARIO,
  EARLY_LEAVE_SCENARIO,
  MISSION_SCENARIO,
  MISSING_OUT_SCENARIO,
  DOUBLE_IN_SCENARIO,
  LONG_BREAK_SCENARIO,
  ABSENCE_SCENARIO,
];

/**
 * Récupérer un scénario par son nom
 */
export function getScenarioByName(name: string): GenerationScenario | undefined {
  return ALL_SCENARIOS.find(s => s.name === name);
}
