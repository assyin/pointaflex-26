const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();
const tenantId = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';

async function main() {
  // Lire le fichier original de presence
  const presenceFile = '/home/assyin/PointaFlex/Fichier Reference/Liste Presence GAB Janvier.xlsx';
  const wb = XLSX.readFile(presenceFile);
  const ws = wb.Sheets['Sheet1'];
  const presenceData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  // Extraire les attendances
  const attendanceMap = new Map();
  for (let i = 6; i < presenceData.length; i++) {
    const row = presenceData[i];
    if (row && row[0] && !isNaN(row[0])) {
      const matricule = String(row[0]).padStart(5, '0');
      attendanceMap.set(matricule, {
        nom: row[1],
        prenom: row[2],
        // Jours 1-4 sont dans colonnes 3-6
        jan1: row[3],
        jan2: row[4],
        jan3: row[5],
        jan4: row[6]
      });
    }
  }
  
  // Recuperer les schedules du 1-4 janvier 2026
  const schedules = await prisma.schedule.findMany({
    where: {
      tenantId,
      date: {
        gte: new Date('2026-01-01'),
        lte: new Date('2026-01-04')
      }
    },
    include: {
      employee: { select: { matricule: true, firstName: true, lastName: true } },
      shift: { select: { code: true } }
    },
    orderBy: [{ employee: { matricule: 'asc' } }, { date: 'asc' }]
  });
  
  // Grouper par employe
  const schedulesByEmployee = new Map();
  schedules.forEach(s => {
    const key = s.employee.matricule;
    if (!schedulesByEmployee.has(key)) {
      schedulesByEmployee.set(key, { employee: s.employee, days: {} });
    }
    const day = new Date(s.date).getUTCDate();
    schedulesByEmployee.get(key).days[day] = s.shift?.code || 'CUSTOM';
  });
  
  // Comparer
  console.log('=== COMPARAISON FICHIER ORIGINAL vs BASE DE DONNEES ===');
  console.log('Matricule | Nom         | J1 Fichier | J1 DB    | J2 Fichier | J2 DB    | Erreur?');
  console.log('-'.repeat(100));
  
  let errors = 0;
  for (const [matricule, att] of attendanceMap) {
    const dbData = schedulesByEmployee.get(matricule);
    
    const fichierJ1 = att.jan1 === 'P' ? '4-2-GAB' : '-';
    const fichierJ2 = att.jan2 === 'P' ? '4-2-GAB' : '-';
    const dbJ1 = dbData?.days[1] || '-';
    const dbJ2 = dbData?.days[2] || '-';
    
    const erreur1 = fichierJ1 !== dbJ1;
    const erreur2 = fichierJ2 !== dbJ2;
    
    if (erreur1 || erreur2) {
      errors++;
      console.log(
        matricule + ' | ' + 
        (att.nom || '').padEnd(12) + ' | ' +
        fichierJ1.padEnd(10) + ' | ' + 
        dbJ1.padEnd(8) + ' | ' +
        fichierJ2.padEnd(10) + ' | ' + 
        dbJ2.padEnd(8) + ' | ' +
        (erreur1 ? 'ERREUR J1 ' : '') + (erreur2 ? 'ERREUR J2' : '')
      );
    }
  }
  
  console.log('\n=== RESUME ===');
  console.log('Employes avec erreurs: ' + errors);
  console.log('Total plannings 1-4 Jan dans DB: ' + schedules.length);
  
  await prisma.$disconnect();
}
main().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
