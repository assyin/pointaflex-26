/**
 * Script de test COMPLET pour la détection automatique des jours supplémentaires
 *
 * Scénarios testés:
 * 1. SAMEDI + Employé éligible → WEEKEND_SATURDAY
 * 2. DIMANCHE + Employé éligible → WEEKEND_SUNDAY
 * 3. JOUR FÉRIÉ (mercredi) + Employé éligible → HOLIDAY
 * 4. JOUR NORMAL (vendredi) → Pas de jour supp
 * 5. SAMEDI + Employé NON éligible → Pas de jour supp
 * 6. Heures insuffisantes (< seuil) → Pas de jour supp
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';
const ELIGIBLE_EMPLOYEE_ID = '9c1ad0d0-9ed1-4773-83db-be6eaed6d8ff'; // Hassan FAEZ
const NON_ELIGIBLE_EMPLOYEE_ID = '7c76a3c1-666f-49bf-adef-13217b9a9507'; // Adil GHANDAOUI

// Dates de test (Janvier 2026)
const TEST_DATES = {
  SATURDAY: new Date('2026-01-24'),       // Samedi
  SUNDAY: new Date('2026-01-25'),         // Dimanche
  HOLIDAY: new Date('2026-01-14'),        // Mercredi - Nouvel An amazigh
  NORMAL_FRIDAY: new Date('2026-01-23'),  // Vendredi normal
  SHORT_WORK: new Date('2026-01-17'),     // Samedi - travail court (< seuil)
};

async function cleanupTestData() {
  console.log('\n🧹 Nettoyage des données de test...');

  const allDates = Object.values(TEST_DATES);

  for (const date of allDates) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    await prisma.supplementaryDay.deleteMany({
      where: {
        tenantId: TENANT_ID,
        date: { gte: startOfDay, lte: endOfDay },
        notes: { contains: '[TEST]' },
      },
    });

    await prisma.attendance.deleteMany({
      where: {
        tenantId: TENANT_ID,
        timestamp: { gte: startOfDay, lte: endOfDay },
        rawData: { path: ['source'], equals: 'TEST_SCRIPT' },
      },
    });
  }

  console.log('✅ Nettoyage terminé');
}

async function createTestAttendance(employeeId, date, checkInHour, checkInMin, checkOutHour, checkOutMin) {
  const checkIn = new Date(date);
  checkIn.setHours(checkInHour, checkInMin || 0, 0, 0);

  const checkOut = new Date(date);
  checkOut.setHours(checkOutHour, checkOutMin || 0, 0, 0);

  const hoursWorked = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);

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

  const attendanceOut = await prisma.attendance.create({
    data: {
      tenantId: TENANT_ID,
      employeeId,
      timestamp: checkOut,
      type: 'OUT',
      method: 'MANUAL',
      source: 'MANUAL',
      validationStatus: 'NONE',
      hoursWorked: parseFloat(hoursWorked),
      rawData: { source: 'TEST_SCRIPT' },
    },
  });

  return { attendanceIn, attendanceOut, hoursWorked: parseFloat(hoursWorked), checkIn, checkOut };
}

function getDayOfWeek(date) {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[date.getDay()];
}

async function isSupplementaryDay(tenantId, date) {
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0) return { isSupplementary: true, type: 'WEEKEND_SUNDAY' };
  if (dayOfWeek === 6) return { isSupplementary: true, type: 'WEEKEND_SATURDAY' };

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const holiday = await prisma.holiday.findFirst({
    where: {
      tenantId,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  if (holiday) return { isSupplementary: true, type: 'HOLIDAY', holidayName: holiday.name };

  return { isSupplementary: false, type: null };
}

async function simulateAutoDetection(tenantId, attendanceOut, checkIn) {
  const employee = await prisma.employee.findUnique({
    where: { id: attendanceOut.employeeId },
    select: { id: true, firstName: true, lastName: true, isEligibleForOvertime: true },
  });

  if (employee.isEligibleForOvertime === false) {
    return { created: false, reason: 'Employé non éligible' };
  }

  const { isSupplementary, type, holidayName } = await isSupplementaryDay(tenantId, attendanceOut.timestamp);

  if (!isSupplementary) {
    return { created: false, reason: 'Jour normal (pas weekend/férié)' };
  }

  // Vérifier le seuil minimum (30 min = 0.5h)
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  const minimumThreshold = Number(settings?.overtimeMinimumThreshold || 30) / 60;
  const hoursWorked = Number(attendanceOut.hoursWorked);

  if (hoursWorked < minimumThreshold) {
    return { created: false, reason: `Heures insuffisantes (${hoursWorked}h < ${minimumThreshold}h)` };
  }

  // Vérifier si déjà existant
  const startOfDay = new Date(attendanceOut.timestamp);
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.supplementaryDay.findFirst({
    where: { tenantId, employeeId: attendanceOut.employeeId, date: startOfDay },
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
      hours: hoursWorked,
      type,
      source: 'AUTO_DETECTED',
      status: 'PENDING',
      checkIn,
      checkOut: attendanceOut.timestamp,
      attendanceId: attendanceOut.id,
      notes: `[TEST] ${holidayName ? `Jour férié: ${holidayName}` : type}`,
    },
  });

  return { created: true, supplementaryDay, type, holidayName };
}

async function runTest(testName, employeeId, date, checkInH, checkInM, checkOutH, checkOutM, expectedType, shouldCreate) {
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`📋 ${testName}`);
  console.log(`   📅 ${date.toISOString().split('T')[0]} (${getDayOfWeek(date)})`);

  const { attendanceOut, hoursWorked, checkIn } = await createTestAttendance(
    employeeId, date, checkInH, checkInM, checkOutH, checkOutM
  );
  console.log(`   ⏰ ${String(checkInH).padStart(2,'0')}:${String(checkInM||0).padStart(2,'0')} → ${String(checkOutH).padStart(2,'0')}:${String(checkOutM||0).padStart(2,'0')} (${hoursWorked}h)`);

  const result = await simulateAutoDetection(TENANT_ID, attendanceOut, checkIn);

  if (shouldCreate) {
    if (result.created) {
      const typeMatch = result.type === expectedType;
      if (typeMatch) {
        console.log(`   ✅ SUCCÈS: ${result.type}${result.holidayName ? ` (${result.holidayName})` : ''} créé`);
        console.log(`      • Heures: ${result.supplementaryDay.hours}h`);
        console.log(`      • Statut: ${result.supplementaryDay.status}`);
        return { success: true, test: testName };
      } else {
        console.log(`   ❌ ÉCHEC: Type ${result.type} ≠ attendu ${expectedType}`);
        return { success: false, test: testName, error: `Type ${result.type} au lieu de ${expectedType}` };
      }
    } else {
      console.log(`   ❌ ÉCHEC: Non créé - ${result.reason}`);
      return { success: false, test: testName, error: result.reason };
    }
  } else {
    if (result.created) {
      console.log(`   ❌ ÉCHEC: Créé alors que non attendu (${result.type})`);
      return { success: false, test: testName, error: `Créé: ${result.type}` };
    } else {
      console.log(`   ✅ SUCCÈS: Non créé (${result.reason})`);
      return { success: true, test: testName };
    }
  }
}

async function main() {
  console.log('═'.repeat(65));
  console.log('🧪 TESTS COMPLETS - DÉTECTION AUTO JOURS SUPPLÉMENTAIRES');
  console.log('═'.repeat(65));

  try {
    await cleanupTestData();

    const results = [];

    // Test 1: Samedi → WEEKEND_SATURDAY
    results.push(await runTest(
      'Test 1: SAMEDI + Éligible → WEEKEND_SATURDAY',
      ELIGIBLE_EMPLOYEE_ID, TEST_DATES.SATURDAY,
      8, 0, 17, 0,
      'WEEKEND_SATURDAY', true
    ));

    // Test 2: Dimanche → WEEKEND_SUNDAY
    results.push(await runTest(
      'Test 2: DIMANCHE + Éligible → WEEKEND_SUNDAY',
      ELIGIBLE_EMPLOYEE_ID, TEST_DATES.SUNDAY,
      8, 0, 17, 0,
      'WEEKEND_SUNDAY', true
    ));

    // Test 3: Jour férié (14 janvier) → HOLIDAY
    results.push(await runTest(
      'Test 3: JOUR FÉRIÉ (Nouvel An amazigh) → HOLIDAY',
      ELIGIBLE_EMPLOYEE_ID, TEST_DATES.HOLIDAY,
      8, 0, 17, 0,
      'HOLIDAY', true
    ));

    // Test 4: Vendredi normal → Pas de jour supp
    results.push(await runTest(
      'Test 4: VENDREDI normal → Pas de jour supp',
      ELIGIBLE_EMPLOYEE_ID, TEST_DATES.NORMAL_FRIDAY,
      8, 0, 17, 0,
      null, false
    ));

    // Test 5: Samedi + Non éligible → Pas de jour supp
    results.push(await runTest(
      'Test 5: SAMEDI + Non éligible → Pas de jour supp',
      NON_ELIGIBLE_EMPLOYEE_ID, TEST_DATES.SATURDAY,
      8, 0, 17, 0,
      null, false
    ));

    // Test 6: Samedi + Heures insuffisantes (15 min < 30 min) → Pas de jour supp
    results.push(await runTest(
      'Test 6: SAMEDI + Heures insuffisantes (0.25h) → Pas de jour supp',
      ELIGIBLE_EMPLOYEE_ID, TEST_DATES.SHORT_WORK,
      8, 0, 8, 15,
      null, false
    ));

    // Vérification finale
    console.log(`\n${'─'.repeat(65)}`);
    console.log('📊 VÉRIFICATION EN BASE');
    console.log(`${'─'.repeat(65)}`);

    const createdDays = await prisma.supplementaryDay.findMany({
      where: { tenantId: TENANT_ID, notes: { contains: '[TEST]' } },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'asc' },
    });

    console.log(`\n   ${createdDays.length} jour(s) supplémentaire(s) créé(s):\n`);
    for (const sd of createdDays) {
      console.log(`   ${sd.date.toISOString().split('T')[0]} | ${sd.type.padEnd(18)} | ${sd.hours}h | ${sd.employee.firstName} ${sd.employee.lastName}`);
    }

    // Résumé
    console.log('\n' + '═'.repeat(65));
    console.log('📈 RÉSUMÉ FINAL');
    console.log('═'.repeat(65));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n   ✅ Réussis: ${passed}/${results.length}`);
    console.log(`   ❌ Échoués: ${failed}/${results.length}`);

    if (failed > 0) {
      console.log('\n   ⚠️  Échecs:');
      results.filter(r => !r.success).forEach(r => console.log(`      • ${r.test}: ${r.error}`));
    }

    const success = failed === 0;
    console.log(`\n   ${success ? '🎉 VALIDATION RÉUSSIE - TOUS LES TESTS PASSENT!' : '⚠️  ÉCHEC - Certains tests ont échoué'}`);
    console.log('═'.repeat(65) + '\n');

    // Cleanup
    await cleanupTestData();

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
