import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployees() {
  try {
    console.log('🔍 Vérification des employés dans la base de données...\n');

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        site: true,
        department: true,
        team: true,
        currentShift: true,
      },
      orderBy: { matricule: 'asc' },
    });

    console.log(`📊 Total d'employés actifs : ${employees.length}\n`);

    if (employees.length === 0) {
      console.log('❌ Aucun employé trouvé dans la base de données.');
      console.log('Veuillez d\'abord créer des employés avant de générer des pointages.\n');
      return;
    }

    console.log('👥 Liste des employés :\n');

    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.firstName} ${emp.lastName}`);
      console.log(`   - Matricule: ${emp.matricule}`);
      console.log(`   - ID: ${emp.id}`);
      console.log(`   - Site: ${emp.site?.name || 'Non assigné'}`);
      console.log(`   - Département: ${emp.department?.name || 'Non assigné'}`);
      console.log(`   - Équipe: ${emp.team?.name || 'Non assignée'}`);
      console.log(`   - Shift: ${emp.currentShift?.name || 'Non assigné'}`);
      console.log('');
    });

    // Statistiques
    const withShift = employees.filter(e => e.currentShift).length;
    const withSite = employees.filter(e => e.site).length;

    console.log('\n📈 Statistiques :');
    console.log(`   - Employés avec shift assigné: ${withShift}/${employees.length}`);
    console.log(`   - Employés avec site assigné: ${withSite}/${employees.length}`);

    if (withShift === 0) {
      console.log('\n⚠️  ATTENTION: Aucun employé n\'a de shift assigné.');
      console.log('   Certains scénarios nécessitent un shift (normal, retard, etc.)');
      console.log('   Vous devrez créer des shifts et les assigner aux employés.\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmployees();
