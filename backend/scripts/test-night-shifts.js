/**
 * Script de test pour les SHIFTS DE NUIT
 *
 * Scénarios testés:
 * 1. Samedi 22:00 → Dimanche 06:00 = WEEKEND_SATURDAY (basé sur IN)
 * 2. Vendredi 22:00 → Samedi 06:00 = WEEKEND_SATURDAY (basé sur OUT car vendredi = normal)
 * 3. Dimanche 22:00 → Lundi 06:00 = WEEKEND_SUNDAY (basé sur IN)
 * 4. Jeudi 22:00 → Vendredi 06:00 = Pas de jour supp (normal → normal)
 */

const { PrismaClient, SupplementaryDayType } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_ID = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';
const ELIGIBLE_EMPLOYEE_ID = '9c1ad0d0-9ed1-4773-83db-be6eaed6d8ff'; // Hassan FAEZ

async function cleanupTestData() {
  console.log('\n🧹 Nettoyage des données de test...');

  await prisma.supplementaryDay.deleteMany({
    where: {
      tenantId: TENANT_ID,
      notes: { contains: '[TEST-NIGHT]' },
    },
  });

  await prisma.attendance.deleteMany({
    where: {
      tenantId: TENANT_ID,
      rawData: { path: ['source'], equals: 'TEST_NIGHT_SHIFT' },
    },
  });

  console.log('✅ Nettoyage terminé');
}

async function createNightShiftAttendance(employeeId, inDate, inHour, outDate, outHour) {
  const checkIn = new Date(inDate);
  checkIn.setHours(inHour, 0, 0, 0);

  const checkOut = new Date(outDate);
  checkOut.setHours(outHour, 0, 0, 0);

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
      rawData: { source: 'TEST_NIGHT_SHIFT' },
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
      rawData: { source: 'TEST_NIGHT_SHIFT' },
    },
  });

  return { attendanceIn, attendanceOut, checkIn, checkOut, hoursWorked: parseFloat(hoursWorked) };
}

function getDayName(date) {
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
    where: { tenantId, date: { gte: startOfDay, lte: endOfDay } },
  });

  if (holiday) return { isSupplementary: true, type: 'HOLIDAY' };

  return { isSupplementary: false, type: null };
}

async function simulateNightShiftDetection(tenantId, checkIn, checkOut, hoursWorked, attendanceOutId, employeeId) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, firstName: true, lastName: true, isEligibleForOvertime: true },
  });

  if (employee.isEligibleForOvertime === false) {
    return { created: false, reason: 'Employé non éligible' };
  }

  // Logique shift de nuit: priorité au checkIn
  let finalType = null;
  let referenceDate = checkIn;

  const checkInResult = await isSupplementaryDay(tenantId, checkIn);
  if (checkInResult.isSupplementary && checkInResult.type) {
    finalType = checkInResult.type;
    referenceDate = checkIn;
  } else {
    // Si IN n'est pas un jour supp, vérifier OUT
    const checkOutResult = await isSupplementaryDay(tenantId, checkOut);
    if (checkOutResult.isSupplementary && checkOutResult.type) {
      finalType = checkOutResult.type;
      referenceDate = checkOut;
    }
  }

  if (!finalType) {
    return { created: false, reason: 'Ni IN ni OUT sur un jour supplémentaire' };
  }

  // Vérifier seuil minimum
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  const minimumThreshold = Number(settings?.overtimeMinimumThreshold || 30) / 60;
  if (hoursWorked < minimumThreshold) {
    return { created: false, reason: `Heures insuffisantes (${hoursWorked}h < ${minimumThreshold}h)` };
  }

  // Vérifier si déjà existant
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.supplementaryDay.findFirst({
    where: { tenantId, employeeId, date: startOfDay },
  });

  if (existing) {
    return { created: false, reason: 'Déjà existant' };
  }

  // Créer
  const supplementaryDay = await prisma.supplementaryDay.create({
    data: {
      tenantId,
      employeeId,
      date: startOfDay,
      hours: hoursWorked,
      type: finalType,
      source: 'AUTO_DETECTED',
      status: 'PENDING',
      checkIn,
      checkOut,
      attendanceId: attendanceOutId,
      notes: `[TEST-NIGHT] Shift nuit: ${getDayName(checkIn)} ${checkIn.getHours()}h → ${getDayName(checkOut)} ${checkOut.getHours()}h`,
    },
  });

  return { created: true, supplementaryDay, type: finalType, referenceDate };
}

async function runNightShiftTest(testName, inDateStr, inHour, outDateStr, outHour, expectedType, shouldCreate) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📋 ${testName}`);

  const inDate = new Date(inDateStr);
  const outDate = new Date(outDateStr);

  console.log(`   🌙 IN:  ${getDayName(inDate)} ${inDateStr} ${String(inHour).padStart(2,'0')}:00`);
  console.log(`   ☀️  OUT: ${getDayName(outDate)} ${outDateStr} ${String(outHour).padStart(2,'0')}:00`);

  const { attendanceOut, checkIn, checkOut, hoursWorked } = await createNightShiftAttendance(
    ELIGIBLE_EMPLOYEE_ID, inDateStr, inHour, outDateStr, outHour
  );

  console.log(`   ⏱️  Durée: ${hoursWorked}h`);

  const result = await simulateNightShiftDetection(
    TENANT_ID, checkIn, checkOut, hoursWorked, attendanceOut.id, ELIGIBLE_EMPLOYEE_ID
  );

  if (shouldCreate) {
    if (result.created) {
      const typeMatch = result.type === expectedType;
      if (typeMatch) {
        console.log(`   ✅ SUCCÈS: ${result.type} créé (basé sur ${getDayName(result.referenceDate)})`);
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
  console.log('═'.repeat(70));
  console.log('🌙 TESTS SHIFTS DE NUIT - JOURS SUPPLÉMENTAIRES');
  console.log('═'.repeat(70));

  try {
    await cleanupTestData();

    const results = [];

    // Test 1: Samedi soir → Dimanche matin = WEEKEND_SATURDAY (basé sur IN = samedi)
    // Semaine 1: 24-25 Jan
    results.push(await runNightShiftTest(
      'Test 1: Samedi 22:00 → Dimanche 06:00 = WEEKEND_SATURDAY',
      '2026-01-24', 22, '2026-01-25', 6,
      'WEEKEND_SATURDAY', true
    ));

    // Test 2: Vendredi soir → Samedi matin = WEEKEND_SATURDAY (basé sur OUT car vendredi = normal)
    // Semaine 2: 30-31 Jan (différent du test 1)
    results.push(await runNightShiftTest(
      'Test 2: Vendredi 22:00 → Samedi 06:00 = WEEKEND_SATURDAY',
      '2026-01-30', 22, '2026-01-31', 6,
      'WEEKEND_SATURDAY', true
    ));

    // Test 3: Dimanche soir → Lundi matin = WEEKEND_SUNDAY (basé sur IN = dimanche)
    // Semaine 3: 1-2 Fév
    results.push(await runNightShiftTest(
      'Test 3: Dimanche 22:00 → Lundi 06:00 = WEEKEND_SUNDAY',
      '2026-02-01', 22, '2026-02-02', 6,
      'WEEKEND_SUNDAY', true
    ));

    // Test 4: Jeudi soir → Vendredi matin = Pas de jour supp (normal → normal)
    results.push(await runNightShiftTest(
      'Test 4: Jeudi 22:00 → Vendredi 06:00 = Pas de jour supp',
      '2026-01-22', 22, '2026-01-23', 6,
      null, false
    ));

    // Vérification en base
    console.log(`\n${'─'.repeat(70)}`);
    console.log('📊 VÉRIFICATION EN BASE');
    console.log(`${'─'.repeat(70)}`);

    const createdDays = await prisma.supplementaryDay.findMany({
      where: { tenantId: TENANT_ID, notes: { contains: '[TEST-NIGHT]' } },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'asc' },
    });

    console.log(`\n   ${createdDays.length} jour(s) supplémentaire(s) créé(s):\n`);
    for (const sd of createdDays) {
      console.log(`   ${sd.date.toISOString().split('T')[0]} | ${sd.type.padEnd(18)} | ${sd.hours}h | ${sd.notes.replace('[TEST-NIGHT] ', '')}`);
    }

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📈 RÉSUMÉ');
    console.log('═'.repeat(70));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n   ✅ Réussis: ${passed}/${results.length}`);
    console.log(`   ❌ Échoués: ${failed}/${results.length}`);

    if (failed > 0) {
      console.log('\n   ⚠️  Échecs:');
      results.filter(r => !r.success).forEach(r => console.log(`      • ${r.test}: ${r.error}`));
    }

    const success = failed === 0;
    console.log(`\n   ${success ? '🎉 TOUS LES TESTS SHIFTS DE NUIT PASSENT!' : '⚠️  CERTAINS TESTS ONT ÉCHOUÉ'}`);
    console.log('═'.repeat(70) + '\n');

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
