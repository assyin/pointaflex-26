import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAndAssignShifts() {
  try {
    console.log('🚀 Création des shifts et assignation aux employés...\n');

    // 1. Récupérer un employé pour obtenir le tenantId
    const firstEmployee = await prisma.employee.findFirst({
      where: { isActive: true },
    });

    if (!firstEmployee) {
      console.log('❌ Aucun employé actif trouvé.');
      return;
    }

    const tenantId = firstEmployee.tenantId;
    console.log(`✅ Tenant ID: ${tenantId}\n`);

    // 2. Vérifier si des shifts existent déjà
    const existingShifts = await prisma.shift.findMany({
      where: { tenantId },
    });

    if (existingShifts.length > 0) {
      console.log(`ℹ️  ${existingShifts.length} shift(s) existant(s) trouvé(s):`);
      existingShifts.forEach((shift) => {
        console.log(`   - ${shift.name} (${shift.startTime} - ${shift.endTime})`);
      });
      console.log('\n⚠️  Suppression des shifts existants...');

      // Dissocier les employés d'abord
      await prisma.employee.updateMany({
        where: { tenantId, currentShiftId: { in: existingShifts.map(s => s.id) } },
        data: { currentShiftId: null },
      });

      // Supprimer les shifts
      await prisma.shift.deleteMany({
        where: { tenantId },
      });
      console.log('✅ Shifts existants supprimés\n');
    }

    // 3. Créer 3 shifts par défaut
    console.log('📝 Création de 3 shifts par défaut...\n');

    const morningShift = await prisma.shift.create({
      data: {
        tenantId,
        name: 'Équipe du Matin',
        code: 'MATIN',
        startTime: '08:00',
        endTime: '17:00',
        breakDuration: 60,
        isNightShift: false,
        color: '#3b82f6', // Bleu
      },
    });
    console.log(`✅ Shift créé: ${morningShift.name} (${morningShift.startTime} - ${morningShift.endTime})`);

    const afternoonShift = await prisma.shift.create({
      data: {
        tenantId,
        name: 'Équipe de l\'Après-midi',
        code: 'APRES_MIDI',
        startTime: '14:00',
        endTime: '23:00',
        breakDuration: 60,
        isNightShift: false,
        color: '#f59e0b', // Orange
      },
    });
    console.log(`✅ Shift créé: ${afternoonShift.name} (${afternoonShift.startTime} - ${afternoonShift.endTime})`);

    const nightShift = await prisma.shift.create({
      data: {
        tenantId,
        name: 'Équipe de Nuit',
        code: 'NUIT',
        startTime: '22:00',
        endTime: '07:00',
        breakDuration: 60,
        isNightShift: true,
        color: '#8b5cf6', // Violet
      },
    });
    console.log(`✅ Shift créé: ${nightShift.name} (${nightShift.startTime} - ${nightShift.endTime})\n`);

    const shifts = [morningShift, afternoonShift, nightShift];

    // 4. Récupérer tous les employés actifs
    const employees = await prisma.employee.findMany({
      where: { isActive: true, tenantId },
      orderBy: { matricule: 'asc' },
    });

    console.log(`👥 ${employees.length} employés actifs trouvés\n`);

    // 5. Assigner les shifts de manière aléatoire
    console.log('🔀 Assignation aléatoire des shifts aux employés...\n');

    const shiftCounts = {
      [morningShift.id]: 0,
      [afternoonShift.id]: 0,
      [nightShift.id]: 0,
    };

    for (const employee of employees) {
      // Sélection aléatoire d'un shift
      const randomShift = shifts[Math.floor(Math.random() * shifts.length)];

      await prisma.employee.update({
        where: { id: employee.id },
        data: { currentShiftId: randomShift.id },
      });

      shiftCounts[randomShift.id]++;
    }

    // 6. Afficher les statistiques
    console.log('✅ Assignation terminée !\n');
    console.log('📊 Répartition des employés par shift:\n');
    console.log(`   - ${morningShift.name}: ${shiftCounts[morningShift.id]} employés`);
    console.log(`   - ${afternoonShift.name}: ${shiftCounts[afternoonShift.id]} employés`);
    console.log(`   - ${nightShift.name}: ${shiftCounts[nightShift.id]} employés`);
    console.log(`   - TOTAL: ${employees.length} employés\n`);

    // 7. Vérification finale
    const employeesWithShift = await prisma.employee.count({
      where: { tenantId, currentShiftId: { not: null }, isActive: true },
    });

    console.log('✅ Vérification finale:');
    console.log(`   - Employés avec shift assigné: ${employeesWithShift}/${employees.length}`);

    if (employeesWithShift === employees.length) {
      console.log('\n🎉 Tous les employés ont été assignés à un shift avec succès!\n');
    } else {
      console.log('\n⚠️  Attention: Certains employés n\'ont pas été assignés.\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAndAssignShifts();
