"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function fixMissingOutAnomalies() {
    console.log('🔍 Recherche des anomalies MISSING_OUT incorrectes...\n');
    const inWithMissingOut = await prisma.attendance.findMany({
        where: {
            type: client_1.AttendanceType.IN,
            hasAnomaly: true,
            anomalyType: 'MISSING_OUT',
        },
        include: {
            employee: {
                select: {
                    id: true,
                    matricule: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: { timestamp: 'desc' },
    });
    console.log(`📋 Trouvé ${inWithMissingOut.length} IN avec anomalie MISSING_OUT\n`);
    let fixedCount = 0;
    let stillMissingCount = 0;
    for (const inRecord of inWithMissingOut) {
        const timestamp = inRecord.timestamp;
        const startOfDay = new Date(timestamp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(timestamp);
        endOfDay.setHours(23, 59, 59, 999);
        const todayRecords = await prisma.attendance.findMany({
            where: {
                tenantId: inRecord.tenantId,
                employeeId: inRecord.employeeId,
                timestamp: { gte: startOfDay, lte: endOfDay },
            },
            orderBy: { timestamp: 'asc' },
        });
        const sortedRecords = [...todayRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        let outRecord;
        let inCount = 0;
        const inIndex = sortedRecords.findIndex(r => r.id === inRecord.id);
        for (let i = inIndex + 1; i < sortedRecords.length; i++) {
            const record = sortedRecords[i];
            if (record.type === client_1.AttendanceType.BREAK_START || record.type === client_1.AttendanceType.BREAK_END) {
                continue;
            }
            if (record.type === client_1.AttendanceType.IN) {
                inCount++;
            }
            if (record.type === client_1.AttendanceType.OUT) {
                if (inCount === 0) {
                    outRecord = record;
                    break;
                }
                else {
                    inCount--;
                }
            }
        }
        const employeeName = `${inRecord.employee.firstName} ${inRecord.employee.lastName}`;
        const dateStr = timestamp.toISOString().split('T')[0];
        const timeStr = timestamp.toTimeString().split(' ')[0];
        if (outRecord) {
            await prisma.attendance.update({
                where: { id: inRecord.id },
                data: {
                    hasAnomaly: false,
                    anomalyType: null,
                    anomalyNote: null,
                },
            });
            const outTimeStr = outRecord.timestamp.toTimeString().split(' ')[0];
            console.log(`✅ CORRIGÉ: ${employeeName} (${inRecord.employee.matricule}) - ${dateStr}`);
            console.log(`   IN: ${timeStr} → OUT: ${outTimeStr}`);
            console.log('');
            fixedCount++;
        }
        else {
            console.log(`⚠️  TOUJOURS MANQUANT: ${employeeName} (${inRecord.employee.matricule}) - ${dateStr} ${timeStr}`);
            stillMissingCount++;
        }
    }
    console.log('\n═════════════════════════════════════════════');
    console.log(`📊 RÉSUMÉ:`);
    console.log(`   ✅ Anomalies corrigées: ${fixedCount}`);
    console.log(`   ⚠️  Anomalies légitimes: ${stillMissingCount}`);
    console.log('═════════════════════════════════════════════\n');
}
async function main() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  SCRIPT DE CORRECTION DES ANOMALIES MISSING_OUT');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    try {
        await fixMissingOutAnomalies();
        console.log('✅ Script terminé avec succès.');
    }
    catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=fix-missing-out-anomalies.js.map