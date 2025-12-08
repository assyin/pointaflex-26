export declare class ImportScheduleRowDto {
    matricule: string;
    dateDebut: string;
    dateFin?: string;
    shiftCode: string;
    customStartTime?: string;
    customEndTime?: string;
    teamCode?: string;
    notes?: string;
}
export declare class ImportScheduleResultDto {
    success: number;
    failed: number;
    errors: Array<{
        row: number;
        matricule?: string;
        error: string;
    }>;
    imported: Array<{
        matricule: string;
        date: string;
        shiftCode: string;
    }>;
}
