export declare function normalizeMatricule(matricule: string | number | null | undefined): string;
export declare function generateMatriculeVariants(normalizedMatricule: string, maxLength?: number): string[];
export declare function findEmployeeByMatriculeFlexible(prisma: any, tenantId: string, matriculeToFind: string | number): Promise<any | null>;
