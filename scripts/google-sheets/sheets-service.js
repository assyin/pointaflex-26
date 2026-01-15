/**
 * Google Sheets Integration Service
 *
 * Ce script permet de lire et modifier des fichiers Google Sheets
 * via l'API Google Sheets v4.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { google } = require('googleapis');

// Chemins des fichiers
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Scopes nécessaires pour Google Sheets et Drive
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly'
];

/**
 * Charge les credentials OAuth
 */
function loadCredentials() {
  try {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Erreur lors du chargement des credentials:', error.message);
    console.log('Assurez-vous que le fichier credentials.json existe.');
    process.exit(1);
  }
}

/**
 * Crée un client OAuth2
 */
function createOAuth2Client(credentials) {
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

/**
 * Obtient un token d'accès via le navigateur
 */
async function getAccessToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n========================================');
    console.log('AUTHENTIFICATION GOOGLE REQUISE');
    console.log('========================================');
    console.log('\n1. Ouvrez ce lien dans votre navigateur:\n');
    console.log(authUrl);
    console.log('\n2. Connectez-vous avec votre compte Google');
    console.log('3. Autorisez l\'application');
    console.log('4. Vous serez redirigé automatiquement\n');

    // Serveur HTTP temporaire pour recevoir le callback
    const server = http.createServer(async (req, res) => {
      try {
        const queryParams = url.parse(req.url, true).query;

        if (queryParams.code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: green;">Authentification réussie!</h1>
                <p>Vous pouvez fermer cette fenêtre et retourner au terminal.</p>
              </body>
            </html>
          `);

          const { tokens } = await oAuth2Client.getToken(queryParams.code);
          oAuth2Client.setCredentials(tokens);

          // Sauvegarder le token
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
          console.log('\n✅ Token sauvegardé dans', TOKEN_PATH);

          server.close();
          resolve(oAuth2Client);
        } else if (queryParams.error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h1>Erreur: ${queryParams.error}</h1></body></html>`);
          server.close();
          reject(new Error(queryParams.error));
        }
      } catch (error) {
        server.close();
        reject(error);
      }
    });

    server.listen(3333, () => {
      console.log('En attente de l\'authentification...');
    });
  });
}

/**
 * Authentifie et retourne un client autorisé
 */
async function authorize() {
  const credentials = loadCredentials();
  const oAuth2Client = createOAuth2Client(credentials);

  // Vérifier si un token existe déjà
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);

      // Vérifier si le token est valide
      try {
        await oAuth2Client.getAccessToken();
        console.log('✅ Authentifié avec le token existant');
        return oAuth2Client;
      } catch (error) {
        console.log('⚠️ Token expiré, nouvelle authentification requise...');
      }
    } catch (error) {
      console.log('⚠️ Token invalide, nouvelle authentification requise...');
    }
  }

  // Obtenir un nouveau token
  return await getAccessToken(oAuth2Client);
}

/**
 * Liste les fichiers Google Sheets accessibles
 */
async function listSpreadsheets(auth, maxResults = 10) {
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.list({
    pageSize: maxResults,
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc'
  });

  return response.data.files;
}

/**
 * Lit les données d'une feuille
 */
async function readSheet(auth, spreadsheetId, range) {
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values;
}

/**
 * Écrit des données dans une feuille
 */
async function writeSheet(auth, spreadsheetId, range, values) {
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });

  return response.data;
}

/**
 * Ajoute des lignes à la fin d'une feuille
 */
async function appendSheet(auth, spreadsheetId, range, values) {
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values },
  });

  return response.data;
}

/**
 * Obtient les métadonnées d'un spreadsheet
 */
async function getSpreadsheetInfo(auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  return {
    title: response.data.properties.title,
    sheets: response.data.sheets.map(s => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
      rowCount: s.properties.gridProperties.rowCount,
      columnCount: s.properties.gridProperties.columnCount,
    }))
  };
}

// Export des fonctions
module.exports = {
  authorize,
  listSpreadsheets,
  readSheet,
  writeSheet,
  appendSheet,
  getSpreadsheetInfo,
};

// Si exécuté directement, lancer l'authentification
if (require.main === module) {
  (async () => {
    try {
      const auth = await authorize();
      console.log('\n✅ Authentification réussie!\n');

      // Lister les spreadsheets disponibles
      console.log('📋 Vos Google Sheets récents:');
      console.log('─'.repeat(50));

      const files = await listSpreadsheets(auth);

      if (files.length === 0) {
        console.log('Aucun fichier Google Sheets trouvé.');
      } else {
        files.forEach((file, index) => {
          console.log(`${index + 1}. ${file.name}`);
          console.log(`   ID: ${file.id}`);
          console.log(`   Modifié: ${new Date(file.modifiedTime).toLocaleString()}`);
          console.log('');
        });
      }

      console.log('─'.repeat(50));
      console.log('\nPour utiliser un fichier, copiez son ID.');

    } catch (error) {
      console.error('Erreur:', error.message);
      process.exit(1);
    }
  })();
}
