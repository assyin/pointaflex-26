export declare enum ScenarioType {
    NORMAL = "normal",
    LATE = "late",
    EARLY_LEAVE = "earlyLeave",
    ANOMALY = "anomaly",
    MISSION = "mission",
    ABSENCE = "absence",
    DOUBLE_IN = "doubleIn",
    MISSING_OUT = "missingOut",
    LONG_BREAK = "longBreak"
}
export declare class GenerateSingleAttendanceDto {
    employeeId: string;
    date: string;
    scenario: ScenarioType;
    siteId?: string;
}
