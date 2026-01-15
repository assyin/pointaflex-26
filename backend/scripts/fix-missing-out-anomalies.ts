/**
 * Script pour corriger les anomalies MISSING_OUT incorrectes
 *
 * Ce script vérifie tous les pointages IN avec anomalie MISSING_OUT
 * et les corrige si un OUT correspondant existe.
 */

import { PrismaClient, AttendanceType } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMissingOutAnomalies() {
  console.log('🔍 Recherche des anomalies MISSING_OUT incorrectes...\n');

  // 1. Récupérer tous les IN avec anomalie MISSING_OUT
  const inWithMissingOut = await prisma.attendance.findMany({
    where: {
      type: AttendanceType.IN,
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

    // Récupérer tous les pointages de cet employé pour cette journée
    const todayRecords = await prisma.attendance.findMany({
      where: {
        tenantId: inRecord.tenantId,
        employeeId: inRecord.employeeId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Trouver le OUT correspondant à ce IN
    const sortedRecords = [...todayRecords].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    let outRecord: typeof todayRecords[0] | undefined;
    let inCount = 0;

    // Parcourir depuis le IN jusqu'à la fin de la journée
    const inIndex = sortedRecords.findIndex(r => r.id === inRecord.id);

    for (let i = inIndex + 1; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];

      // Ignorer les BREAK
      if (record.type === AttendanceType.BREAK_START || record.type === AttendanceType.BREAK_END) {
        continue;
      }

      if (record.type === AttendanceType.IN) {
        inCount++;
      }

      if (record.type === AttendanceType.OUT) {
        if (inCount === 0) {
          // C'est le OUT correspondant à notre IN
          outRecord = record;
          break;
        } else {
          inCount--;
        }
      }
    }

    const employeeName = `${inRecord.employee.firstName} ${inRecord.employee.lastName}`;
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0];

    if (outRecord) {
      // Un OUT correspondant existe - corriger l'anomalie
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
    } else {
      // Pas de OUT trouvé - anomalie légitime
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
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
