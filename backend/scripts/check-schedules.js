const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const tenantId = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';

async function main() {
  // Trouver BAABOUCHE
  const emp = await prisma.employee.findFirst({
    where: { tenantId, matricule: '02919' },
    select: { id: true, firstName: true, lastName: true, matricule: true }
  });
  
  if (!emp) {
    console.log('Employe 02919 non trouve');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Employe:', emp.firstName, emp.lastName, '(' + emp.matricule + ')');
  
  // Trouver ses plannings pour Janvier 2026
  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: emp.id,
      date: {
        gte: new Date('2026-01-01'),
        lte: new Date('2026-01-31')
      }
    },
    include: {
      shift: { select: { code: true } }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log('\nPlannings en Janvier 2026:', schedules.length);
  schedules.forEach(s => {
    const dateStr = s.date.toISOString().split('T')[0];
    console.log('  ' + dateStr + ': ' + (s.shift?.code || 'CUSTOM') + ' (' + s.startTime + '-' + s.endTime + ')');
  });
  
  await prisma.$disconnect();
}
main().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
