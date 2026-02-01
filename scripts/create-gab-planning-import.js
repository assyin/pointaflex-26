const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const presenceFile = '/home/assyin/PointaFlex/Fichier Reference/Liste Presence GAB Janvier.xlsx';
const outputDir = '/home/assyin/PointaFlex/Fichier Reference/Planning_Import';
const SHIFT_CODE = '4-2-GAB';

console.log('='.repeat(80));
console.log('GENERATION PLANNING GAB - FORMAT IMPORT');
console.log('='.repeat(80));

// Lire le fichier de presence
const presenceWb = XLSX.readFile(presenceFile);
const presenceSheet = presenceWb.Sheets['Sheet1'];
const presenceData = XLSX.utils.sheet_to_json(presenceSheet, { header: 1 });

// Trouver la ligne en-tete
let headerRowIndex = -1;
for (let i = 0; i < presenceData.length; i++) {
  const row = presenceData[i];
  if (row && row[0] === 'MATRICULE') {
    headerRowIndex = i;
    break;
  }
}

// Extraire les employes
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
    attendance[day] = row[colIndex] || '';
  }

  employees.push({ matricule, nom, prenom, attendance });
}

console.log('Employes: ' + employees.length);

// Creer le dossier de sortie
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Definir les semaines avec dates du LUNDI
// Janvier 2026: Le 1er janvier est un Jeudi
// Semaine 1: Lun 29/12/2025 - mais on veut Jeu 1 - Dim 4
// Semaine 2: Lun 5/01 - Dim 11/01
// Semaine 3: Lun 12/01 - Dim 18/01
// Semaine 4: Lun 19/01 - Dim 25/01 (on a jusqua 23)

const weeks = [
  { 
    name: 'Semaine_1_Dec29-Jan04', 
    mondayDate: new Date(2025, 11, 29), // Lundi 29 Dec 2025
    days: { // jour du mois Janvier -> index dans semaine (0=Lun, 6=Dim)
      1: 3, 2: 4, 3: 5, 4: 6 // Jeu=3, Ven=4, Sam=5, Dim=6
    }
  },
  { 
    name: 'Semaine_2_Jan05-11', 
    mondayDate: new Date(2026, 0, 5),
    days: { 5: 0, 6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 6 }
  },
  { 
    name: 'Semaine_3_Jan12-18', 
    mondayDate: new Date(2026, 0, 12),
    days: { 12: 0, 13: 1, 14: 2, 15: 3, 16: 4, 17: 5, 18: 6 }
  },
  { 
    name: 'Semaine_4_Jan19-25', 
    mondayDate: new Date(2026, 0, 19),
    days: { 19: 0, 20: 1, 21: 2, 22: 3, 23: 4 } // seulement jusqua 23
  }
];

weeks.forEach(week => {
  console.log('\n--- ' + week.name + ' ---');

  const wb = XLSX.utils.book_new();
  const data = [];

  // Titre
  data.push(['PLANNING HEBDOMADAIRE - GAB']);
  data.push([]);

  // Semaine du (avec date du lundi au format DD/MM/YYYY)
  const mondayStr = week.mondayDate.getDate().toString().padStart(2, '0') + '/' +
                    (week.mondayDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                    week.mondayDate.getFullYear();
  data.push(['Semaine du', mondayStr]);
  data.push([]);

  // En-tetes: Matricule | Nom | Prenom | Lun | Mar | Mer | Jeu | Ven | Sam | Dim
  data.push(['Matricule', 'Nom', 'Prenom', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']);

  // Donnees employes
  employees.forEach(emp => {
    const row = [emp.matricule, emp.nom, emp.prenom];
    
    // Remplir les 7 jours (Lun a Dim = indices 0 a 6)
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      // Trouver quel jour du mois correspond a cet index
      let shiftValue = '-';
      for (const [dayOfMonth, idx] of Object.entries(week.days)) {
        if (parseInt(idx) === dayIndex) {
          const status = emp.attendance[parseInt(dayOfMonth)];
          if (status === 'P') {
            shiftValue = SHIFT_CODE;
          } else if (status === 'R') {
            shiftValue = '-';
          } else if (status === 'A') {
            shiftValue = 'A';
          } else if (status === 'C') {
            shiftValue = 'C';
          } else if (status === 'M') {
            shiftValue = 'M';
          } else {
            shiftValue = '-';
          }
          break;
        }
      }
      row.push(shiftValue);
    }
    
    data.push(row);
  });

  // Creer la feuille
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 15 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Planning');

  // Feuille Codes Shifts
  const shiftsData = [
    ['CODES SHIFTS DISPONIBLES'],
    [],
    ['Code', 'Description', 'Heure Debut', 'Heure Fin'],
    ['4-2-GAB', 'Shift GAB 4-2', '07:00', '21:00'],
    [],
    ['CODES SPECIAUX'],
    ['-', 'Repos'],
    ['A', 'Absent'],
    ['M', 'Maladie'],
    ['C', 'Conge']
  ];
  const wsShifts = XLSX.utils.aoa_to_sheet(shiftsData);
  XLSX.utils.book_append_sheet(wb, wsShifts, 'Codes Shifts');

  // Sauvegarder
  const outputFile = path.join(outputDir, 'Planning_GAB_' + week.name + '.xlsx');
  XLSX.writeFile(wb, outputFile);
  console.log('Fichier: ' + outputFile);
});

console.log('\n' + '='.repeat(80));
console.log('FICHIERS GENERES POUR IMPORT');
console.log('Dossier: ' + outputDir);
console.log('='.repeat(80));
