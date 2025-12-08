"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_SCENARIOS = exports.ABSENCE_SCENARIO = exports.LONG_BREAK_SCENARIO = exports.DOUBLE_IN_SCENARIO = exports.MISSING_OUT_SCENARIO = exports.MISSION_SCENARIO = exports.EARLY_LEAVE_SCENARIO = exports.LATE_ARRIVAL_SCENARIO = exports.NORMAL_DAY_SCENARIO = void 0;
exports.getScenarioByName = getScenarioByName;
const client_1 = require("@prisma/client");
exports.NORMAL_DAY_SCENARIO = {
    name: 'normal',
    description: 'Journée de travail normale avec pause déjeuner',
    probability: 0.70,
    patterns: [
        { type: client_1.AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
        { type: client_1.AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
    ],
    requiresShift: true,
};
exports.LATE_ARRIVAL_SCENARIO = {
    name: 'late',
    description: 'Arrivée en retard',
    probability: 0.15,
    patterns: [
        { type: client_1.AttendanceType.IN, timeOffset: '08:45', varianceMinutes: 30 },
        { type: client_1.AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
        { type: client_1.AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
    ],
    requiresShift: true,
};
exports.EARLY_LEAVE_SCENARIO = {
    name: 'earlyLeave',
    description: 'Départ anticipé',
    probability: 0.05,
    patterns: [
        { type: client_1.AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
        { type: client_1.AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.OUT, timeOffset: '15:30', varianceMinutes: 15 },
    ],
    requiresShift: true,
};
exports.MISSION_SCENARIO = {
    name: 'mission',
    description: 'Mission externe',
    probability: 0.02,
    patterns: [
        { type: client_1.AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.MISSION_START, timeOffset: '09:00', varianceMinutes: 15 },
        { type: client_1.AttendanceType.MISSION_END, timeOffset: '15:00', varianceMinutes: 30 },
        { type: client_1.AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
    ],
    requiresShift: false,
};
exports.MISSING_OUT_SCENARIO = {
    name: 'missingOut',
    description: 'Oubli de pointage de sortie',
    probability: 0.03,
    patterns: [
        { type: client_1.AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
        { type: client_1.AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
    ],
    requiresShift: true,
};
exports.DOUBLE_IN_SCENARIO = {
    name: 'doubleIn',
    description: 'Double pointage d\'entrée',
    probability: 0.02,
    patterns: [
        { type: client_1.AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 5 },
        { type: client_1.AttendanceType.IN, timeOffset: '08:30', varianceMinutes: 10 },
        { type: client_1.AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
        { type: client_1.AttendanceType.BREAK_END, timeOffset: '13:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
    ],
    requiresShift: true,
};
exports.LONG_BREAK_SCENARIO = {
    name: 'longBreak',
    description: 'Pause déjeuner trop longue',
    probability: 0.02,
    patterns: [
        { type: client_1.AttendanceType.IN, timeOffset: '08:00', varianceMinutes: 10 },
        { type: client_1.AttendanceType.BREAK_START, timeOffset: '12:00', varianceMinutes: 15 },
        { type: client_1.AttendanceType.BREAK_END, timeOffset: '14:30', varianceMinutes: 20 },
        { type: client_1.AttendanceType.OUT, timeOffset: '17:00', varianceMinutes: 20 },
    ],
    requiresShift: true,
};
exports.ABSENCE_SCENARIO = {
    name: 'absence',
    description: 'Absence complète (aucun pointage)',
    probability: 0.01,
    patterns: [],
    requiresShift: false,
};
exports.ALL_SCENARIOS = [
    exports.NORMAL_DAY_SCENARIO,
    exports.LATE_ARRIVAL_SCENARIO,
    exports.EARLY_LEAVE_SCENARIO,
    exports.MISSION_SCENARIO,
    exports.MISSING_OUT_SCENARIO,
    exports.DOUBLE_IN_SCENARIO,
    exports.LONG_BREAK_SCENARIO,
    exports.ABSENCE_SCENARIO,
];
function getScenarioByName(name) {
    return exports.ALL_SCENARIOS.find(s => s.name === name);
}
//# sourceMappingURL=scenarios.config.js.map