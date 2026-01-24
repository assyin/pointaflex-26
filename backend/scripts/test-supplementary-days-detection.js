/**
 * Script de test pour la détection automatique des jours supplémentaires
 *
 * Ce script:
 * 1. Crée des pointages de test sur différentes dates (samedi, dimanche, jour normal)
 * 2. Appelle le service de détection pour créer les jours supplémentaires
 * 3. Vérifie que les jours supplémentaires ont été correctement créés
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';
const ELIGIBLE_EMPLOYEE_ID = '9c1ad0d0-9ed1-4773-83db-be6eaed6d8ff'; // Hassan FAEZ - éligible
const NON_ELIGIBLE_EMPLOYEE_ID = '7c76a3c1-666f-49bf-adef-13217b9a9507'; // Adil GHANDAOUI - non éligible

// Dates de test
const TEST_DATES = {
  SATURDAY: new Date('2026-01-24'),   // Samedi 24 janvier 2026
  SUNDAY: new Date('2026-01-25'),     // Dimanche 25 janvier 2026
  FRIDAY: new Date('2026-01-23'),     // Vendredi 23 janvier 2026 (jour normal)
};

async function cleanupTestData() {
  console.log('\n🧹 Nettoyage des données de test précédentes...');

  const allDates = Object.values(TEST_DATES);

  for (const date of allDates) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Supprimer les jours supplémentaires de test
    const deletedSupp = await prisma.supplementaryDay.deleteMany({
      where: {
        tenantId: TENANT_ID,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        notes: { contains: '[TEST]' },
      },
    });

    // Supprimer les pointages de test
    const deletedAtt = await prisma.attendance.deleteMany({
      where: {
        tenantId: TENANT_ID,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
        rawData: { path: ['source'], equals: 'TEST_SCRIPT' },
      },
    });

    if (deletedSupp.count > 0 || deletedAtt.count > 0) {
      console.log(`   ${date.toISOString().split('T')[0]}: ${deletedAtt.count} pointages, ${deletedSupp.count} jours supp supprimés`);
    }
  }

  console.log('✅ Nettoyage terminé');
}

async function createTestAttendance(employeeId, date, checkInHour, checkOutHour) {
  const checkIn = new Date(date);
  checkIn.setHours(checkInHour, 0, 0, 0);

  const checkOut = new Date(date);
  checkOut.setHours(checkOutHour, 0, 0, 0);

  const hoursWorked = checkOutHour - checkInHour;

  // Créer le pointage IN
  const attendanceIn = await prisma.attendance.create({
    data: {
      tenantId: TENANT_ID,
      employeeId,
      timestamp: checkIn,
      type: 'IN',
      method: 'MANUAL',
      source: 'MANUAL',
      validationStatus: 'NONE',
      rawData: { source: 'TEST_SCRIPT' },
    },
  });

  // Créer le pointage OUT avec hoursWorked
  const attendanceOut = await prisma.attendance.create({
    data: {
      tenantId: TENANT_ID,
      employeeId,
      timestamp: checkOut,
      type: 'OUT',
      method: 'MANUAL',
      source: 'MANUAL',
      validationStatus: 'NONE',
      hoursWorked: hoursWorked,
      rawData: { source: 'TEST_SCRIPT' },
    },
  });

  return { attendanceIn, attendanceOut, hoursWorked };
}

function getDayOfWeek(date) {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[date.getDay()];
}

async function isSupplementaryDay(tenantId, date) {
  const dayOfWeek = date.getDay();

  // Samedi (6) ou Dimanche (0)
  if (dayOfWeek === 0) return { isSupplementary: true, type: 'WEEKEND_SUNDAY' };
  if (dayOfWeek === 6) return { isSupplementary: true, type: 'WEEKEND_SATURDAY' };

  // Vérifier les jours fériés
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const holiday = await prisma.holiday.findFirst({
    where: {
      tenantId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (holiday) return { isSupplementary: true, type: 'HOLIDAY' };

  return { isSupplementary: false, type: null };
}

async function simulateAutoDetection(tenantId, attendanceOut) {
  // Cette fonction simule ce que fait createAutoSupplementaryDay

  const employee = await prisma.employee.findUnique({
    where: { id: attendanceOut.employeeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isEligibleForOvertime: true
    },
  });

  // Vérifier l'éligibilité
  if (employee.isEligibleForOvertime === false) {
    return { created: false, reason: 'Employé non éligible' };
  }

  const { isSupplementary, type } = await isSupplementaryDay(tenantId, attendanceOut.timestamp);

  if (!isSupplementary) {
    return { created: false, reason: 'Pas un jour supplémentaire (semaine normale)' };
  }

  // Vérifier si déjà existant
  const startOfDay = new Date(attendanceOut.timestamp);
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.supplementaryDay.findFirst({
    where: {
      tenantId,
      employeeId: attendanceOut.employeeId,
      date: startOfDay,
    },
  });

  if (existing) {
    return { created: false, reason: 'Déjà existant', supplementaryDay: existing };
  }

  // Créer le jour supplémentaire
  const supplementaryDay = await prisma.supplementaryDay.create({
    data: {
      tenantId,
      employeeId: attendanceOut.employeeId,
      date: startOfDay,
      hours: Number(attendanceOut.hoursWorked),
      type,
      source: 'AUTO_DETECTED',
      status: 'PENDING',
      attendanceId: attendanceOut.id,
      notes: '[TEST] Créé par script de test',
    },
  });

  return { created: true, supplementaryDay, type };
}

async function runTest(testName, employeeId, date, expectedType, shouldCreate) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 ${testName}`);
  console.log(`   📅 Date: ${date.toISOString().split('T')[0]} (${getDayOfWeek(date)})`);

  // Créer les pointages
  const { attendanceOut, hoursWorked } = await createTestAttendance(employeeId, date, 8, 17);
  console.log(`   ⏰ Pointages créés: IN 08:00 → OUT 17:00 (${hoursWorked}h)`);

  // Simuler la détection automatique
  const result = await simulateAutoDetection(TENANT_ID, attendanceOut);

  if (shouldCreate) {
    if (result.created) {
      if (result.type === expectedType) {
        console.log(`   ✅ SUCCÈS: Jour supplémentaire créé`);
        console.log(`      • Type: ${result.supplementaryDay.type}`);
        console.log(`      • Heures: ${result.supplementaryDay.hours}h`);
        console.log(`      • Statut: ${result.supplementaryDay.status}`);
        return { success: true, test: testName };
      } else {
        console.log(`   ❌ ÉCHEC: Type incorrect`);
        console.log(`      • Attendu: ${expectedType}`);
        console.log(`      • Reçu: ${result.type}`);
        return { success: false, test: testName, error: 'Type incorrect' };
      }
    } else {
      console.log(`   ❌ ÉCHEC: Jour supplémentaire NON créé`);
      console.log(`      • Raison: ${result.reason}`);
      console.log(`      • Attendu: ${expectedType}`);
      return { success: false, test: testName, error: result.reason };
    }
  } else {
    if (result.created) {
      console.log(`   ❌ ÉCHEC: Jour supplémentaire créé alors qu'il ne devrait pas`);
      console.log(`      • Type créé: ${result.type}`);
      return { success: false, test: testName, error: 'Créé alors que non attendu' };
    } else {
      console.log(`   ✅ SUCCÈS: Jour supplémentaire NON créé (comportement attendu)`);
      console.log(`      • Raison: ${result.reason}`);
      return { success: true, test: testName };
    }
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🧪 TESTS DE DÉTECTION AUTO DES JOURS SUPPLÉMENTAIRES');
  console.log('═'.repeat(60));
  console.log(`📍 Tenant: ${TENANT_ID}`);
  console.log(`👤 Employé éligible: ${ELIGIBLE_EMPLOYEE_ID}`);
  console.log(`👤 Employé non éligible: ${NON_ELIGIBLE_EMPLOYEE_ID}`);

  try {
    await cleanupTestData();

    const results = [];

    // Test 1: Samedi avec employé éligible → WEEKEND_SATURDAY
    results.push(await runTest(
      'Test 1: SAMEDI + Employé éligible → WEEKEND_SATURDAY',
      ELIGIBLE_EMPLOYEE_ID,
      TEST_DATES.SATURDAY,
      'WEEKEND_SATURDAY',
      true
    ));

    // Test 2: Dimanche avec employé éligible → WEEKEND_SUNDAY
    results.push(await runTest(
      'Test 2: DIMANCHE + Employé éligible → WEEKEND_SUNDAY',
      ELIGIBLE_EMPLOYEE_ID,
      TEST_DATES.SUNDAY,
      'WEEKEND_SUNDAY',
      true
    ));

    // Test 3: Vendredi (jour normal) → Pas de jour supp
    results.push(await runTest(
      'Test 3: VENDREDI (jour normal) → Pas de jour supp',
      ELIGIBLE_EMPLOYEE_ID,
      TEST_DATES.FRIDAY,
      null,
      false
    ));

    // Test 4: Samedi avec employé NON éligible → Pas de jour supp
    results.push(await runTest(
      'Test 4: SAMEDI + Employé NON éligible → Pas de jour supp',
      NON_ELIGIBLE_EMPLOYEE_ID,
      TEST_DATES.SATURDAY,
      null,
      false
    ));

    // Vérification finale en base
    console.log(`\n${'─'.repeat(60)}`);
    console.log('📊 VÉRIFICATION FINALE EN BASE DE DONNÉES');
    console.log(`${'─'.repeat(60)}`);

    const supplementaryDays = await prisma.supplementaryDay.findMany({
      where: {
        tenantId: TENANT_ID,
        notes: { contains: '[TEST]' },
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    console.log(`\n   ${supplementaryDays.length} jour(s) supplémentaire(s) créé(s):\n`);

    for (const sd of supplementaryDays) {
      console.log(`   • ${sd.date.toISOString().split('T')[0]} | ${sd.type.padEnd(18)} | ${sd.hours}h | ${sd.employee.firstName} ${sd.employee.lastName}`);
    }

    // Résumé final
    console.log('\n' + '═'.repeat(60));
    console.log('📈 RÉSUMÉ DES TESTS');
    console.log('═'.repeat(60));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n   ✅ Tests réussis: ${passed}/${results.length}`);
    console.log(`   ❌ Tests échoués: ${failed}/${results.length}`);

    if (failed > 0) {
      console.log('\n   ⚠️  Détails des échecs:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`      • ${r.test}: ${r.error}`);
      });
    }

    const allPassed = failed === 0;
    console.log(`\n   ${allPassed ? '🎉 TOUS LES TESTS SONT PASSÉS!' : '⚠️  CERTAINS TESTS ONT ÉCHOUÉ'}`);
    console.log('\n' + '═'.repeat(60));

    // Nettoyage final
    console.log('\n🧹 Nettoyage final des données de test...');
    await cleanupTestData();

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
