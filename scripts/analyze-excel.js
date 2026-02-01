const XLSX = require('xlsx');
const path = require('path');

// Analyser le fichier de présence GAB
const presenceFile = '/home/assyin/PointaFlex/Fichier Reference/Liste Presence GAB Janvier.xlsx';
const templateFile = '/home/assyin/PointaFlex/Fichier Reference/Template_Planning_GAB.xlsx';

console.log('='.repeat(80));
console.log('ANALYSE DU FICHIER DE PRÉSENCE GAB');
console.log('='.repeat(80));

try {
  const workbook = XLSX.readFile(presenceFile);
  console.log('\n📁 Fichier:', presenceFile);
  console.log('📑 Feuilles:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📄 Feuille: ${sheetName}`);
    console.log(`${'─'.repeat(60)}`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Lignes: ${data.length}`);

    // Afficher les premières lignes (en-têtes et quelques données)
    console.log('\n📋 Premières lignes:');
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.length > 0) {
        console.log(`  [${i}] ${JSON.stringify(row.slice(0, 10))}${row.length > 10 ? '...' : ''}`);
      }
    }

    // Compter les colonnes
    if (data.length > 0) {
      const maxCols = Math.max(...data.map(r => r ? r.length : 0));
      console.log(`\n📊 Colonnes max: ${maxCols}`);
    }
  });
} catch (error) {
  console.error('Erreur lecture fichier présence:', error.message);
}

console.log('\n\n' + '='.repeat(80));
console.log('ANALYSE DU TEMPLATE PLANNING');
console.log('='.repeat(80));

try {
  const workbook = XLSX.readFile(templateFile);
  console.log('\n📁 Fichier:', templateFile);
  console.log('📑 Feuilles:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📄 Feuille: ${sheetName}`);
    console.log(`${'─'.repeat(60)}`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Lignes: ${data.length}`);

    // Afficher toutes les lignes du template
    console.log('\n📋 Contenu:');
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > 0) {
        console.log(`  [${i}] ${JSON.stringify(row)}`);
      }
    }
  });
} catch (error) {
  console.error('Erreur lecture template:', error.message);
}
