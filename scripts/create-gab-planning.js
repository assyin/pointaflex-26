const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const presenceFile = '/home/assyin/PointaFlex/Fichier Reference/Liste Presence GAB Janvier.xlsx';
const outputDir = '/home/assyin/PointaFlex/Fichier Reference/Planning_Genere';
const SHIFT_CODE = '4-2-GAB';

console.log('='.repeat(80));
console.log('GENERATION DU PLANNING GAB - JANVIER 2026');
console.log('='.repeat(80));

const presenceWb = XLSX.readFile(presenceFile);
const presenceSheet = presenceWb.Sheets['Sheet1'];
const presenceData = XLSX.utils.sheet_to_json(presenceSheet, { header: 1 });

let headerRowIndex = -1;
for (let i = 0; i < presenceData.length; i++) {
  const row = presenceData[i];
  if (row && row[0] === 'MATRICULE') {
    headerRowIndex = i;
    break;
  }
}

console.log('\nLigne en-tete trouvee: ' + headerRowIndex);

const employees = [];
for (let i = headerRowIndex + 1; i < presenceData.length; i++) {
  const row = presenceData[i];
  if (!row || !row[0] || row[0] === 'MATRICULE') continue;
  if (row[0] === null) continue;

  const matricule = String(row[0]).padStart(5, '0');
  const nom = row[1] || '';
  const prenom = row[2] || '';
  if (!nom) continue;

  const attendance = {};
  for (let day = 1; day <= 23; day++) {
    const colIndex = day + 2;
    const value = row[colIndex];
    attendance[day] = value || '';
  }

  employees.push({ matricule, nom, prenom, attendance });
}

console.log('\nEmployes extraits: ' + employees.length);
employees.forEach((emp, i) => {
  const presents = Object.entries(emp.attendance).filter(([d, v]) => v === 'P').length;
  console.log('  ' + (i + 1) + '. ' + emp.matricule + ' - ' + emp.nom + ' ' + emp.prenom + ' (' + presents + ' jours P)');
});

const weeks = [
  { name: 'Semaine_1_Jan_01-07', startDate: new Date(2026, 0, 1), days: [1, 2, 3, 4, 5, 6, 7] },
  { name: 'Semaine_2_Jan_08-14', startDate: new Date(2026, 0, 8), days: [8, 9, 10, 11, 12, 13, 14] },
  { name: 'Semaine_3_Jan_15-21', startDate: new Date(2026, 0, 15), days: [15, 16, 17, 18, 19, 20, 21] },
  { name: 'Semaine_4_Jan_22-23', startDate: new Date(2026, 0, 22), days: [22, 23] }
];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

weeks.forEach(week => {
  console.log('\n--- Generation: ' + week.name + ' ---');

  const wb = XLSX.utils.book_new();
  const data = [];

  data.push(['PLANNING HEBDOMADAIRE - GAB']);
  data.push([]);
  const dateStr = week.startDate.toISOString().split('T')[0];
  data.push(['Semaine du:', null, dateStr]);
  data.push([]);

  const headers = ['Matricule', 'Nom', 'Prenom', 'Shift'];
  week.days.forEach(day => {
    const date = new Date(2026, 0, day);
    const dayOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];
    headers.push(dayOfWeek + ' ' + day + '/01');
  });
  data.push(headers);

  employees.forEach(emp => {
    const row = [emp.matricule, emp.nom, emp.prenom, SHIFT_CODE];
    week.days.forEach(day => {
      const status = emp.attendance[day];
      if (status === 'P') {
        row.push(SHIFT_CODE);
      } else if (status === 'R') {
        row.push('-');
      } else if (status === 'A') {
        row.push('A');
      } else if (status === 'C') {
        row.push('C');
      } else if (status === 'M') {
        row.push('M');
      } else {
        row.push(status || '-');
      }
    });
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
    ...week.days.map(() => ({ wch: 12 }))
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Planning');

  const shiftsData = [
    ['CODES SHIFTS DISPONIBLES'],
    [],
    ['Code', 'Nom du Shift', 'Heure Debut', 'Heure Fin'],
    ['4-2-GAB', 'Shift GAB 4-2', '07:00', '21:00'],
    [],
    ['CODES SPECIAUX'],
    ['-', 'Repos'],
    ['A', 'Absent'],
    ['M', 'Maladie'],
    ['C', 'Conge'],
    ['R', 'Recuperation']
  ];
  const wsShifts = XLSX.utils.aoa_to_sheet(shiftsData);
  XLSX.utils.book_append_sheet(wb, wsShifts, 'Codes Shifts');

  const outputFile = path.join(outputDir, 'Planning_GAB_' + week.name + '.xlsx');
  XLSX.writeFile(wb, outputFile);
  console.log('Fichier cree: ' + outputFile);
});

console.log('\n' + '='.repeat(80));
console.log('GENERATION TERMINEE');
console.log('Fichiers generes dans: ' + outputDir);
console.log('Total employes: ' + employees.length);
