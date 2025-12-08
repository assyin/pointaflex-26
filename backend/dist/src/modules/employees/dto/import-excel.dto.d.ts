export declare class ImportEmployeeDto {
    matricule: string;
    civilite?: string;
    lastName: string;
    firstName: string;
    situationFamiliale?: string;
    nbEnfants?: number;
    dateNaissance?: string;
    cnss?: string;
    cin?: string;
    address?: string;
    city?: string;
    agence?: string;
    rib?: string;
    contrat?: string;
    hireDate?: string;
    department?: string;
    region?: string;
    category?: string;
    position?: string;
    phone?: string;
}
export declare class ImportResultDto {
    success: number;
    failed: number;
    errors: Array<{
        row: number;
        matricule?: string;
        error: string;
    }>;
    imported: Array<{
        matricule: string;
        firstName: string;
        lastName: string;
    }>;
}
