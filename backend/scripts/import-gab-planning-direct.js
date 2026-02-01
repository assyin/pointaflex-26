const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();
const tenantId = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';

async function main() {
  console.log('=== IMPORT DIRECT PLANNINGS GAB ===\n');
  
  // 1. Lire le fichier de presence original
  const presenceFile = '/home/assyin/PointaFlex/Fichier Reference/Liste Presence GAB Janvier.xlsx';
  const wb = XLSX.readFile(presenceFile);
  const ws = wb.Sheets['Sheet1'];
  const presenceData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  // 2. Recuperer le shift 4-2-GAB
  const shift = await prisma.shift.findFirst({
    where: { tenantId, code: '4-2-GAB' }
  });
  
  if (!shift) {
    console.log('Shift 4-2-GAB non trouve!');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Shift:', shift.code, '(' + shift.startTime + ' - ' + shift.endTime + ')');
  
  // 3. Recuperer tous les employes avec leurs matricules
  const employees = await prisma.employee.findMany({
    where: { tenantId },
    select: { id: true, matricule: true, firstName: true, lastName: true }
  });
  
  const employeeMap = new Map();
  employees.forEach(e => employeeMap.set(e.matricule, e));
  
  console.log('Employes charges:', employees.length);
  
  // 4. Extraire les donnees de presence et creer les plannings
  let created = 0;
  let skipped = 0;
  let notFound = 0;
  
  for (let i = 6; i < presenceData.length; i++) {
    const row = presenceData[i];
    if (!row || !row[0] || isNaN(row[0])) continue;
    
    const matricule = String(row[0]).padStart(5, '0');
    const employee = employeeMap.get(matricule);
    
    if (!employee) {
      notFound++;
      continue;
    }
    
    // Jours 1-23 sont dans colonnes 3-25
    for (let day = 1; day <= 23; day++) {
      const colIndex = day + 2;
      const status = row[colIndex];
      
      if (status === 'P') {
        // Creer un planning pour ce jour
        const date = new Date(Date.UTC(2026, 0, day, 0, 0, 0, 0));
        
        try {
          await prisma.schedule.create({
            data: {
              tenantId,
              employeeId: employee.id,
              shiftId: shift.id,
              date: date,
              status: 'PUBLISHED'
            }
          });
          created++;
        } catch (error) {
          if (error.code === 'P2002') {
            skipped++; // Deja existe
          } else {
            console.log('Erreur:', employee.matricule, 'jour', day, error.message);
          }
        }
      }
    }
  }
  
  console.log('\n=== RESULTAT ===');
  console.log('Plannings crees:', created);
  console.log('Deja existants:', skipped);
  console.log('Employes non trouves:', notFound);
  
  // 5. Verification
  console.log('\n=== VERIFICATION ===');
  const gabDept = await prisma.department.findFirst({
    where: { tenantId, name: { contains: 'GAB', mode: 'insensitive' } }
  });
  
  const gabEmployees = await prisma.employee.findMany({
    where: { tenantId, departmentId: gabDept.id },
    select: { id: true }
  });
  
  const scheduleCount = await prisma.schedule.count({
    where: {
      tenantId,
      employeeId: { in: gabEmployees.map(e => e.id) },
      date: { gte: new Date('2026-01-01'), lte: new Date('2026-01-23') }
    }
  });
  
  console.log('Total plannings GAB (1-23 Jan):', scheduleCount);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
