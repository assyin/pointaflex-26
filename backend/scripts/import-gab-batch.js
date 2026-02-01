const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();
const tenantId = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';

async function main() {
  console.log('=== IMPORT BATCH PLANNINGS GAB ===\n');
  
  const presenceFile = '/home/assyin/PointaFlex/Fichier Reference/Liste Presence GAB Janvier.xlsx';
  const wb = XLSX.readFile(presenceFile);
  const ws = wb.Sheets['Sheet1'];
  const presenceData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const shift = await prisma.shift.findFirst({
    where: { tenantId, code: '4-2-GAB' }
  });
  
  console.log('Shift:', shift.code);
  
  const employees = await prisma.employee.findMany({
    where: { tenantId },
    select: { id: true, matricule: true }
  });
  
  const employeeMap = new Map();
  employees.forEach(e => employeeMap.set(e.matricule, e.id));
  
  // Preparer tous les plannings a creer
  const schedulesToCreate = [];
  
  for (let i = 6; i < presenceData.length; i++) {
    const row = presenceData[i];
    if (!row || !row[0] || isNaN(row[0])) continue;
    
    const matricule = String(row[0]).padStart(5, '0');
    const employeeId = employeeMap.get(matricule);
    
    if (!employeeId) continue;
    
    for (let day = 1; day <= 23; day++) {
      const status = row[day + 2];
      
      if (status === 'P') {
        schedulesToCreate.push({
          tenantId,
          employeeId,
          shiftId: shift.id,
          date: new Date(Date.UTC(2026, 0, day)),
          status: 'PUBLISHED'
        });
      }
    }
  }
  
  console.log('Plannings a creer:', schedulesToCreate.length);
  
  // Creer en batch
  const result = await prisma.schedule.createMany({
    data: schedulesToCreate,
    skipDuplicates: true
  });
  
  console.log('Plannings crees:', result.count);
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
