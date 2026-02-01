const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const tenantId = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';

async function main() {
  console.log('=== NETTOYAGE PLANNINGS GAB JANVIER 2026 ===\n');
  
  // Trouver le departement GAB
  const gabDept = await prisma.department.findFirst({
    where: { tenantId, name: { contains: 'GAB', mode: 'insensitive' } },
    select: { id: true, name: true }
  });
  
  if (!gabDept) {
    console.log('Departement GAB non trouve');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Departement trouve:', gabDept.name);
  
  // Trouver tous les employes GAB
  const employees = await prisma.employee.findMany({
    where: { tenantId, departmentId: gabDept.id },
    select: { id: true, matricule: true, firstName: true, lastName: true }
  });
  
  console.log('Employes GAB:', employees.length);
  
  const employeeIds = employees.map(e => e.id);
  
  // Compter les plannings existants
  const existingCount = await prisma.schedule.count({
    where: {
      tenantId,
      employeeId: { in: employeeIds },
      date: {
        gte: new Date('2026-01-01'),
        lte: new Date('2026-01-25')
      }
    }
  });
  
  console.log('Plannings existants (1-25 Jan):', existingCount);
  
  // Supprimer
  const deleteResult = await prisma.schedule.deleteMany({
    where: {
      tenantId,
      employeeId: { in: employeeIds },
      date: {
        gte: new Date('2026-01-01'),
        lte: new Date('2026-01-25')
      }
    }
  });
  
  console.log('\n✅ Plannings supprimes:', deleteResult.count);
  console.log('\nVous pouvez maintenant reimporter les fichiers de planning.');
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
