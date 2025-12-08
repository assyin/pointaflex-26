"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMatricule = normalizeMatricule;
exports.generateMatriculeVariants = generateMatriculeVariants;
exports.findEmployeeByMatriculeFlexible = findEmployeeByMatriculeFlexible;
function normalizeMatricule(matricule) {
    if (!matricule)
        return '';
    const matriculeStr = String(matricule).trim();
    if (matriculeStr === '' || /^0+$/.test(matriculeStr)) {
        return '0';
    }
    if (/^\d+$/.test(matriculeStr)) {
        return String(parseInt(matriculeStr, 10));
    }
    return matriculeStr;
}
function generateMatriculeVariants(normalizedMatricule, maxLength = 10) {
    const variants = [normalizedMatricule];
    if (!/^\d+$/.test(normalizedMatricule)) {
        return variants;
    }
    for (let padding = 1; padding <= (maxLength - normalizedMatricule.length); padding++) {
        const variant = '0'.repeat(padding) + normalizedMatricule;
        variants.push(variant);
    }
    return variants;
}
async function findEmployeeByMatriculeFlexible(prisma, tenantId, matriculeToFind) {
    const matriculeStr = String(matriculeToFind).trim();
    console.log(`[MatriculeUtil] 🔍 Recherche flexible du matricule: "${matriculeStr}" pour tenant: ${tenantId}`);
    if (!matriculeStr || matriculeStr === '') {
        console.log('[MatriculeUtil] ❌ Matricule vide');
        return null;
    }
    console.log(`[MatriculeUtil] Étape 1: Recherche exacte avec "${matriculeStr}"`);
    let employee = await prisma.employee.findFirst({
        where: {
            tenantId,
            matricule: matriculeStr,
        },
    });
    if (employee) {
        console.log(`[MatriculeUtil] ✅ Trouvé par recherche exacte: ${employee.matricule} (${employee.firstName} ${employee.lastName})`);
        return employee;
    }
    const normalizedMatricule = normalizeMatricule(matriculeToFind);
    console.log(`[MatriculeUtil] Étape 2: Normalisation "${matriculeStr}" → "${normalizedMatricule}"`);
    if (!normalizedMatricule || normalizedMatricule === '0') {
        console.log('[MatriculeUtil] ❌ Matricule normalisé vide ou "0"');
        return null;
    }
    if (normalizedMatricule !== matriculeStr) {
        console.log(`[MatriculeUtil] Étape 3: Recherche avec matricule normalisé "${normalizedMatricule}"`);
        employee = await prisma.employee.findFirst({
            where: {
                tenantId,
                matricule: normalizedMatricule,
            },
        });
        if (employee) {
            console.log(`[MatriculeUtil] ✅ Trouvé par normalisation: ${employee.matricule} (${employee.firstName} ${employee.lastName})`);
            return employee;
        }
    }
    const variants = generateMatriculeVariants(normalizedMatricule, 10);
    if (!variants.includes(matriculeStr)) {
        variants.push(matriculeStr);
    }
    console.log(`[MatriculeUtil] Étape 4: Recherche avec ${variants.length} variantes:`, variants.slice(0, 5), '...');
    employee = await prisma.employee.findFirst({
        where: {
            tenantId,
            matricule: {
                in: variants,
            },
        },
    });
    if (employee) {
        console.log(`[MatriculeUtil] ✅ Trouvé par variantes: ${employee.matricule} (${employee.firstName} ${employee.lastName})`);
        return employee;
    }
    if (/^\d+$/.test(matriculeStr) || /^\d+$/.test(normalizedMatricule)) {
        console.log(`[MatriculeUtil] Étape 5: Recherche SQL avec CAST pour "${matriculeStr}"`);
        try {
            const result = await prisma.$queryRaw `
        SELECT id FROM "Employee"
        WHERE "tenantId" = ${tenantId}::text
        AND (
          "matricule" = ${matriculeStr}::text
          OR "matricule" = ${normalizedMatricule}::text
          OR (
            "matricule" ~ '^[0-9]+$'
            AND CAST("matricule" AS INTEGER) = CAST(${matriculeStr} AS INTEGER)
          )
          OR (
            "matricule" ~ '^[0-9]+$'
            AND CAST("matricule" AS INTEGER) = CAST(${normalizedMatricule} AS INTEGER)
          )
        )
        LIMIT 1
      `;
            if (result && result.length > 0) {
                const foundEmployee = await prisma.employee.findUnique({
                    where: { id: result[0].id },
                });
                console.log(`[MatriculeUtil] ✅ Trouvé par SQL CAST: ${foundEmployee.matricule} (${foundEmployee.firstName} ${foundEmployee.lastName})`);
                return foundEmployee;
            }
        }
        catch (sqlError) {
            console.warn(`[MatriculeUtil] Erreur lors de la recherche SQL pour ${matriculeStr}:`, sqlError?.message || sqlError);
        }
    }
    console.log(`[MatriculeUtil] ❌ Employé NON TROUVÉ pour le matricule "${matriculeStr}"`);
    return null;
}
//# sourceMappingURL=matricule.util.js.map