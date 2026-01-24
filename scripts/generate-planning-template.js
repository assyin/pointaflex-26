const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

async function generateDynamicTemplate(departmentName, outputPath, themeColor) {
  const prisma = new PrismaClient();
  const tenantId = '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d';

  const department = await prisma.department.findFirst({
    where: { tenantId, name: { contains: departmentName, mode: 'insensitive' } }
  });

  if (!department) {
    console.log('Département', departmentName, 'non trouvé');
    await prisma.$disconnect();
    return;
  }

  const shifts = await prisma.shift.findMany({
    where: { tenantId },
    select: { code: true, name: true, startTime: true, endTime: true, isNightShift: true },
    orderBy: { code: 'asc' },
  });

  const employees = await prisma.employee.findMany({
    where: { tenantId, departmentId: department.id, isActive: true },
    include: { department: { select: { name: true } }, positionRef: { select: { name: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  console.log('Département:', department.name, '- Employés:', employees.length);

  // Calculate current week's Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PointaFlex';
  workbook.created = new Date();

  // ================== PLANNING SHEET ==================
  const planningSheet = workbook.addWorksheet('Planning', {
    views: [{ state: 'frozen', ySplit: 5 }]
  });

  // Title row
  planningSheet.mergeCells('A1:K1');
  const titleCell = planningSheet.getCell('A1');
  titleCell.value = 'PLANNING HEBDOMADAIRE - ' + department.name.toUpperCase();
  titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor.dark } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  planningSheet.getRow(1).height = 35;

  // Week info row - C3 will contain the Monday date (editable)
  planningSheet.getCell('A3').value = 'Semaine du:';
  planningSheet.getCell('A3').font = { bold: true, size: 12 };

  // C3 = Date du lundi (modifiable par l'utilisateur)
  planningSheet.getCell('C3').value = monday;
  planningSheet.getCell('C3').numFmt = 'DD/MM/YYYY';
  planningSheet.getCell('C3').font = { bold: true, size: 12, color: { argb: themeColor.dark } };
  planningSheet.getCell('C3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
  planningSheet.getCell('C3').border = {
    top: { style: 'medium', color: { argb: themeColor.dark } },
    left: { style: 'medium', color: { argb: themeColor.dark } },
    bottom: { style: 'medium', color: { argb: themeColor.dark } },
    right: { style: 'medium', color: { argb: themeColor.dark } }
  };

  // Note about automatic dates
  planningSheet.mergeCells('E3:K3');
  planningSheet.getCell('E3').value = '↑ Modifier cette date - les colonnes se mettent à jour automatiquement';
  planningSheet.getCell('E3').font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  planningSheet.getRow(4).height = 8;

  // Row 5: Header with DYNAMIC day name + date formulas
  const headerRow = planningSheet.getRow(5);

  // Static columns
  headerRow.getCell(1).value = 'Matricule';
  headerRow.getCell(2).value = 'Nom';
  headerRow.getCell(3).value = 'Prénom';
  headerRow.getCell(4).value = 'Fonction';

  // Dynamic date columns - combining day name with date using CONCATENATE
  headerRow.getCell(5).value = { formula: 'CONCATENATE("Lun ",TEXT($C$3,"DD/MM"))' };
  headerRow.getCell(6).value = { formula: 'CONCATENATE("Mar ",TEXT($C$3+1,"DD/MM"))' };
  headerRow.getCell(7).value = { formula: 'CONCATENATE("Mer ",TEXT($C$3+2,"DD/MM"))' };
  headerRow.getCell(8).value = { formula: 'CONCATENATE("Jeu ",TEXT($C$3+3,"DD/MM"))' };
  headerRow.getCell(9).value = { formula: 'CONCATENATE("Ven ",TEXT($C$3+4,"DD/MM"))' };
  headerRow.getCell(10).value = { formula: 'CONCATENATE("Sam ",TEXT($C$3+5,"DD/MM"))' };
  headerRow.getCell(11).value = { formula: 'CONCATENATE("Dim ",TEXT($C$3+6,"DD/MM"))' };

  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColor.header } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 30;

  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: themeColor.dark } },
      left: { style: 'thin', color: { argb: themeColor.dark } },
      bottom: { style: 'thin', color: { argb: themeColor.dark } },
      right: { style: 'thin', color: { argb: themeColor.dark } }
    };
  });

  // Weekend header cells - different color
  headerRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8F00' } };
  headerRow.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6F00' } };

  planningSheet.columns = [
    { width: 12 }, { width: 18 }, { width: 18 }, { width: 25 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }
  ];

  // Employee rows
  let rowIndex = 6;
  for (const emp of employees) {
    const row = planningSheet.getRow(rowIndex);
    row.values = [
      emp.matricule,
      emp.lastName,
      emp.firstName,
      emp.positionRef?.name || '-',
      '', '', '', '', '', '', ''
    ];

    const bgColor = rowIndex % 2 === 0 ? themeColor.altRow : 'FFFFFFFF';
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };
      if (colNumber >= 5) {
        cell.alignment = { horizontal: 'center' };
      }
    });

    // Weekend columns styling
    row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
    row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFECB3' } };

    rowIndex++;
  }

  // ================== CODES SHIFTS SHEET ==================
  const shiftsSheet = workbook.addWorksheet('Codes Shifts');

  shiftsSheet.mergeCells('A1:E1');
  shiftsSheet.getCell('A1').value = 'CODES SHIFTS DISPONIBLES';
  shiftsSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  shiftsSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
  shiftsSheet.getCell('A1').alignment = { horizontal: 'center' };
  shiftsSheet.getRow(1).height = 30;

  const shiftHeaderRow = shiftsSheet.getRow(3);
  shiftHeaderRow.values = ['Code', 'Nom du Shift', 'Heure Début', 'Heure Fin', 'Shift Nuit'];
  shiftHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  shiftHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42A5F5' } };

  let shiftRow = 4;
  for (const shift of shifts) {
    const row = shiftsSheet.getRow(shiftRow);
    row.values = [shift.code, shift.name, shift.startTime, shift.endTime, shift.isNightShift ? 'Oui' : 'Non'];
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shiftRow % 2 === 0 ? 'FFE3F2FD' : 'FFFFFFFF' } };
    shiftRow++;
  }

  shiftRow += 2;
  shiftsSheet.getCell('A' + shiftRow).value = 'CODES SPECIAUX';
  shiftsSheet.getCell('A' + shiftRow).font = { bold: true, size: 14, color: { argb: 'FFFF6F00' } };
  shiftRow++;

  const specialCodes = [['-', 'Repos'], ['R', 'Récupération'], ['C', 'Congé']];
  for (const [code, desc] of specialCodes) {
    shiftsSheet.getRow(shiftRow).values = [code, desc];
    shiftsSheet.getRow(shiftRow).getCell(1).font = { bold: true, color: { argb: 'FFFF6F00' } };
    shiftRow++;
  }

  shiftsSheet.columns = [{ width: 15 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 12 }];

  // ================== INSTRUCTIONS SHEET ==================
  const instructSheet = workbook.addWorksheet('Instructions');
  instructSheet.getCell('A1').value = "GUIDE D'UTILISATION";
  instructSheet.getCell('A1').font = { bold: true, size: 18, color: { argb: themeColor.dark } };
  instructSheet.getRow(1).height = 35;

  const instructions = [
    '',
    '1. MODIFIER LA DATE DE LA SEMAINE',
    '   • Changer la date dans la cellule C3 (Semaine du)',
    '   • Les en-têtes Lun/Mar/Mer... se mettent à jour AUTOMATIQUEMENT',
    '',
    '2. REMPLIR LE PLANNING',
    '   • Une ligne par employé',
    '   • Remplir les colonnes avec les codes shifts',
    '',
    '3. CODES À UTILISER',
    '   • Voir feuille "Codes Shifts" pour les codes disponibles',
    '   • "-" ou vide = Repos',
    '   • "R" = Récupération, "C" = Congé',
    '',
    '4. HORAIRES PERSONNALISÉS',
    '   • Format: CODE(HH:mm-HH:mm)',
    '   • Exemple: MATIN(09:00-18:00)',
  ];

  let instrRow = 2;
  for (const line of instructions) {
    instructSheet.getCell('A' + instrRow).value = line;
    if (line.match(/^[0-9]\./)) {
      instructSheet.getCell('A' + instrRow).font = { bold: true, size: 12, color: { argb: themeColor.header } };
    }
    instrRow++;
  }
  instructSheet.columns = [{ width: 70 }];

  await workbook.xlsx.writeFile(outputPath);
  console.log('Template créé:', outputPath);
  await prisma.$disconnect();
}

// Themes
const greenTheme = { dark: 'FF1E3A5F', header: 'FF2E7D32', altRow: 'FFF5F5F5' };
const redTheme = { dark: 'FF8B0000', header: 'FFC62828', altRow: 'FFFFEBEE' };

async function main() {
  await generateDynamicTemplate('GAB', '/home/assyin/PointaFlex/Template_Planning_GAB.xlsx', greenTheme);
  await generateDynamicTemplate('SECURITE', '/home/assyin/PointaFlex/Template_Planning_Securite.xlsx', redTheme);
}

main().catch(console.error);
