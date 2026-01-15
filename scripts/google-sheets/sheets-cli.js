#!/usr/bin/env node

/**
 * Google Sheets CLI Tool
 *
 * Usage:
 *   node sheets-cli.js auth                          - Authentification
 *   node sheets-cli.js list                          - Lister les spreadsheets
 *   node sheets-cli.js info <spreadsheetId>          - Info sur un spreadsheet
 *   node sheets-cli.js read <spreadsheetId> <range>  - Lire des données
 *   node sheets-cli.js write <spreadsheetId> <range> <json-data> - Écrire des données
 */

const {
  authorize,
  listSpreadsheets,
  readSheet,
  writeSheet,
  appendSheet,
  getSpreadsheetInfo,
} = require('./sheets-service');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    showHelp();
    return;
  }

  try {
    const auth = await authorize();

    switch (command) {
      case 'auth':
        console.log('\n✅ Authentification réussie!');
        break;

      case 'list':
        const files = await listSpreadsheets(auth, parseInt(args[1]) || 10);
        console.log('\n📋 Google Sheets disponibles:\n');
        if (files.length === 0) {
          console.log('Aucun fichier trouvé.');
        } else {
          files.forEach((file, i) => {
            console.log(`${i + 1}. ${file.name}`);
            console.log(`   ID: ${file.id}`);
            console.log('');
          });
        }
        break;

      case 'info':
        if (!args[1]) {
          console.error('❌ Veuillez fournir l\'ID du spreadsheet');
          console.log('Usage: node sheets-cli.js info <spreadsheetId>');
          return;
        }
        const info = await getSpreadsheetInfo(auth, args[1]);
        console.log('\n📊 Informations du spreadsheet:\n');
        console.log(`Titre: ${info.title}`);
        console.log(`\nFeuilles:`);
        info.sheets.forEach(sheet => {
          console.log(`  - ${sheet.title} (${sheet.rowCount} lignes x ${sheet.columnCount} colonnes)`);
        });
        break;

      case 'read':
        if (!args[1] || !args[2]) {
          console.error('❌ Veuillez fournir l\'ID du spreadsheet et la plage');
          console.log('Usage: node sheets-cli.js read <spreadsheetId> <range>');
          console.log('Exemple: node sheets-cli.js read 1abc...xyz "Feuille1!A1:D10"');
          return;
        }
        const data = await readSheet(auth, args[1], args[2]);
        console.log('\n📖 Données lues:\n');
        if (!data || data.length === 0) {
          console.log('Aucune donnée trouvée.');
        } else {
          // Afficher en format tableau
          console.log(JSON.stringify(data, null, 2));
        }
        break;

      case 'write':
        if (!args[1] || !args[2] || !args[3]) {
          console.error('❌ Veuillez fournir l\'ID, la plage et les données');
          console.log('Usage: node sheets-cli.js write <spreadsheetId> <range> <json-data>');
          console.log('Exemple: node sheets-cli.js write 1abc...xyz "Feuille1!A1" \'[["A","B"],["1","2"]]\'');
          return;
        }
        const values = JSON.parse(args[3]);
        const result = await writeSheet(auth, args[1], args[2], values);
        console.log('\n✅ Données écrites avec succès!');
        console.log(`Cellules mises à jour: ${result.updatedCells}`);
        break;

      case 'append':
        if (!args[1] || !args[2] || !args[3]) {
          console.error('❌ Veuillez fournir l\'ID, la plage et les données');
          console.log('Usage: node sheets-cli.js append <spreadsheetId> <range> <json-data>');
          return;
        }
        const appendValues = JSON.parse(args[3]);
        const appendResult = await appendSheet(auth, args[1], args[2], appendValues);
        console.log('\n✅ Données ajoutées avec succès!');
        console.log(`Plage mise à jour: ${appendResult.updates.updatedRange}`);
        break;

      default:
        console.error(`❌ Commande inconnue: ${command}`);
        showHelp();
    }
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.code === 404) {
      console.log('Le spreadsheet n\'existe pas ou vous n\'avez pas accès.');
    }
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Google Sheets CLI Tool
======================

Commandes:
  auth                              Authentification Google
  list [count]                      Lister les spreadsheets (défaut: 10)
  info <spreadsheetId>              Informations sur un spreadsheet
  read <spreadsheetId> <range>      Lire des données
  write <spreadsheetId> <range> <json>  Écrire des données
  append <spreadsheetId> <range> <json> Ajouter des lignes

Exemples:
  node sheets-cli.js auth
  node sheets-cli.js list
  node sheets-cli.js info 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
  node sheets-cli.js read 1Bxi... "Sheet1!A1:D10"
  node sheets-cli.js write 1Bxi... "Sheet1!A1" '[["Hello","World"]]'
`);
}

main();
