const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const tenantId = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';

async function main() {
  // Trouver departement GAB
  const gabDept = await prisma.department.findFirst({
    where: { tenantId, name: { contains: 'GAB', mode: 'insensitive' } }
  });
  
  // Employes GAB
  const gabEmployees = await prisma.employee.findMany({
    where: { tenantId, departmentId: gabDept.id },
    select: { id: true, matricule: true }
  });
  
  console.log('Employes GAB:', gabEmployees.length);
  
  // Schedules GAB Jan 1-23
  const schedules = await prisma.schedule.count({
    where: {
      employeeId: { in: gabEmployees.map(e => e.id) },
      date: { gte: new Date('2026-01-01'), lte: new Date('2026-01-23') }
    }
  });
  
  console.log('Schedules GAB (Jan 1-23):', schedules);
  
  await prisma.$disconnect();
}
main();
