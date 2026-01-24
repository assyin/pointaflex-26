const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();

async function generateReport() {
  console.log('Generating weekly hours report for GAB and TF departments...');
  console.log('Period: January 12-19, 2026\n');

  const startDate = new Date('2026-01-12T00:00:00.000Z');
  const endDate = new Date('2026-01-20T00:00:00.000Z');

  // Get departments
  const departments = await prisma.department.findMany({
    where: {
      name: { in: ['GAB', 'TF'] }
    }
  });

  const gabDeptId = departments.find(d => d.name === 'GAB')?.id;
  const tfDeptId = departments.find(d => d.name === 'TF')?.id;

  console.log(`GAB Department ID: ${gabDeptId}`);
  console.log(`TF Department ID: ${tfDeptId}\n`);

  // Get employees from both departments
  const employees = await prisma.employee.findMany({
    where: {
      departmentId: { in: [gabDeptId, tfDeptId] }
    },
    include: {
      position: true,
      department: true
    },
    orderBy: [
      { department: { name: 'asc' } },
      { lastName: 'asc' },
      { firstName: 'asc' }
    ]
  });

  console.log(`Total employees found: ${employees.length}`);

  // Get attendance records for the period
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      employee: {
        departmentId: { in: [gabDeptId, tfDeptId] }
      },
      timestamp: {
        gte: startDate,
        lt: endDate
      }
    },
    orderBy: [
      { employeeId: 'asc' },
      { timestamp: 'asc' }
    ]
  });

  console.log(`Total attendance records: ${attendanceRecords.length}\n`);

  // Group attendance by employee
  const attendanceByEmployee = {};
  for (const record of attendanceRecords) {
    if (!attendanceByEmployee[record.employeeId]) {
      attendanceByEmployee[record.employeeId] = [];
    }
    attendanceByEmployee[record.employeeId].push(record);
  }

  // Calculate hours for each employee
  function calculateWeeklyHours(employeeId) {
    const records = attendanceByEmployee[employeeId] || [];

    // Group by date
    const byDate = {};
    for (const record of records) {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { ins: [], outs: [] };
      }
      if (record.type === 'IN') {
        byDate[dateKey].ins.push(record.timestamp);
      } else if (record.type === 'OUT') {
        byDate[dateKey].outs.push(record.timestamp);
      }
    }

    let totalMinutes = 0;
    const dailyDetails = {};

    // Calculate hours for each day
    for (const [date, punches] of Object.entries(byDate)) {
      const ins = punches.ins.sort((a, b) => a - b);
      const outs = punches.outs.sort((a, b) => a - b);

      let dayMinutes = 0;
      let hasOut = outs.length > 0;

      if (ins.length > 0) {
        if (hasOut) {
          // Calculate actual hours: first IN to last OUT
          const firstIn = ins[0];
          const lastOut = outs[outs.length - 1];
          dayMinutes = (lastOut - firstIn) / (1000 * 60);

          // Cap at reasonable maximum (16 hours)
          if (dayMinutes > 960) dayMinutes = 480; // If > 16h, use 8h default
          if (dayMinutes < 0) dayMinutes = 480; // If negative, use 8h default
        } else {
          // No OUT punch - count 8 hours (480 minutes)
          dayMinutes = 480;
        }
      }

      dailyDetails[date] = {
        hours: Math.round(dayMinutes / 60 * 100) / 100,
        hasOut: hasOut,
        inCount: ins.length,
        outCount: outs.length
      };

      totalMinutes += dayMinutes;
    }

    return {
      totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      daysWorked: Object.keys(byDate).length,
      dailyDetails: dailyDetails
    };
  }

  // Prepare data for Excel
  const gabEmployees = employees.filter(e => e.department?.name === 'GAB');
  const tfEmployees = employees.filter(e => e.department?.name === 'TF');

  console.log(`GAB employees: ${gabEmployees.length}`);
  console.log(`TF employees: ${tfEmployees.length}\n`);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PointaFlex';
  workbook.created = new Date();

  // Function to create a sheet for a department
  function createDepartmentSheet(sheetName, employeesList) {
    const sheet = workbook.addWorksheet(sheetName);

    // Define columns
    sheet.columns = [
      { header: 'Matricule', key: 'matricule', width: 12 },
      { header: 'Nom', key: 'lastName', width: 18 },
      { header: 'Prenom', key: 'firstName', width: 18 },
      { header: 'Fonction', key: 'position', width: 28 },
      { header: 'Dim 12/01', key: 'day12', width: 10 },
      { header: 'Lun 13/01', key: 'day13', width: 10 },
      { header: 'Mar 14/01', key: 'day14', width: 10 },
      { header: 'Mer 15/01', key: 'day15', width: 10 },
      { header: 'Jeu 16/01', key: 'day16', width: 10 },
      { header: 'Ven 17/01', key: 'day17', width: 10 },
      { header: 'Sam 18/01', key: 'day18', width: 10 },
      { header: 'Dim 19/01', key: 'day19', width: 10 },
      { header: 'Total Heures', key: 'totalHours', width: 14 },
      { header: 'Jours Travailles', key: 'daysWorked', width: 16 }
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add data rows
    for (const emp of employeesList) {
      const hoursData = calculateWeeklyHours(emp.id);
      const daily = hoursData.dailyDetails;

      const row = sheet.addRow({
        matricule: emp.matricule,
        lastName: emp.lastName,
        firstName: emp.firstName,
        position: emp.position?.name || '-',
        day12: daily['2026-01-12']?.hours || 0,
        day13: daily['2026-01-13']?.hours || 0,
        day14: daily['2026-01-14']?.hours || 0,
        day15: daily['2026-01-15']?.hours || 0,
        day16: daily['2026-01-16']?.hours || 0,
        day17: daily['2026-01-17']?.hours || 0,
        day18: daily['2026-01-18']?.hours || 0,
        day19: daily['2026-01-19']?.hours || 0,
        totalHours: hoursData.totalHours,
        daysWorked: hoursData.daysWorked
      });

      // Style daily hours columns
      for (let col = 5; col <= 12; col++) {
        const cell = row.getCell(col);
        const value = cell.value;
        if (value === 8) {
          // Default 8 hours (no OUT) - highlight in yellow
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF9C4' }
          };
        } else if (value > 10) {
          // Long hours - highlight in orange
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCC80' }
          };
        }
        cell.alignment = { horizontal: 'center' };
      }

      // Style total hours column
      const totalCell = row.getCell(13);
      totalCell.font = { bold: true };
      totalCell.alignment = { horizontal: 'center' };

      // Style days worked column
      row.getCell(14).alignment = { horizontal: 'center' };
    }

    // Add totals row
    const lastDataRow = sheet.lastRow.number;
    const totalsRow = sheet.addRow({
      matricule: '',
      lastName: 'TOTAL',
      firstName: '',
      position: '',
      day12: { formula: `SUM(E2:E${lastDataRow})` },
      day13: { formula: `SUM(F2:F${lastDataRow})` },
      day14: { formula: `SUM(G2:G${lastDataRow})` },
      day15: { formula: `SUM(H2:H${lastDataRow})` },
      day16: { formula: `SUM(I2:I${lastDataRow})` },
      day17: { formula: `SUM(J2:J${lastDataRow})` },
      day18: { formula: `SUM(K2:K${lastDataRow})` },
      day19: { formula: `SUM(L2:L${lastDataRow})` },
      totalHours: { formula: `SUM(M2:M${lastDataRow})` },
      daysWorked: { formula: `SUM(N2:N${lastDataRow})` }
    });
    totalsRow.font = { bold: true };
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5E9' }
    };

    // Add borders
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Freeze first row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    return sheet;
  }

  // Create sheets
  createDepartmentSheet('Departement GAB', gabEmployees);
  createDepartmentSheet('Departement TF', tfEmployees);

  // Add legend sheet
  const legendSheet = workbook.addWorksheet('Legende');
  legendSheet.addRow(['LEGENDE DU RAPPORT']);
  legendSheet.addRow([]);
  legendSheet.addRow(['Periode:', 'Du 12 Janvier au 19 Janvier 2026']);
  legendSheet.addRow([]);
  legendSheet.addRow(['Couleurs:']);
  legendSheet.addRow(['  Jaune:', '8 heures comptees par defaut (pas de pointage sortie)']);
  legendSheet.addRow(['  Orange:', 'Journee longue (> 10 heures)']);
  legendSheet.addRow([]);
  legendSheet.addRow(['Notes:']);
  legendSheet.addRow(['  - Si un employe a pointe entree sans sortie, 8 heures sont comptees']);
  legendSheet.addRow(['  - Les heures sont calculees de la premiere entree a la derniere sortie']);
  legendSheet.addRow(['  - Les jours sans pointage ne sont pas comptes']);

  // Save workbook
  const outputPath = path.join(__dirname, '../Rapport_Heures_GAB_TF_12-19_Jan_2026.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`\nReport generated successfully!`);
  console.log(`File: ${outputPath}`);

  // Print summary
  console.log('\n--- SUMMARY ---');
  console.log(`GAB Department: ${gabEmployees.length} employees`);
  console.log(`TF Department: ${tfEmployees.length} employees`);

  await prisma.$disconnect();
}

generateReport().catch(console.error);
