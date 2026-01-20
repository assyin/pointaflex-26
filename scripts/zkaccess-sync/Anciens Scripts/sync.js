/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT DE SYNCHRONISATION ZKACCESS → POINTAFLEX
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ce script synchronise automatiquement les pointages du terminal ZKTeco
 * vers l'application PointaFlex.
 *
 * Installation:
 *   1. Copier ce dossier sur le PC Windows où ZKAccess est installé
 *   2. Ouvrir CMD dans ce dossier
 *   3. Exécuter: npm install
 *   4. Configurer les paramètres ci-dessous
 *   5. Lancer: node sync.js
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - À MODIFIER SELON VOTRE INSTALLATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // ─────────────────────────────────────────────────────────────────────────────
  // POINTAFLEX API
  // ─────────────────────────────────────────────────────────────────────────────
  pointaflex: {
    // URL de l'API PointaFlex (modifier si différent)
    apiUrl: 'http://localhost:3000/api/v1/attendance/webhook',

    // ID du terminal dans PointaFlex (le numéro de série du terminal)
    deviceId: 'A6F5211460142',

    // ID du tenant (récupéré lors de la connexion à PointaFlex)
    // Pour le trouver: connectez-vous à PointaFlex, ouvrez la console du navigateur (F12)
    // et tapez: localStorage.getItem('tenantId')
    tenantId: '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',

    // Clé API générée dans PointaFlex pour ce terminal
    // IMPORTANT: Générez cette clé dans PointaFlex > Terminaux > pointeuse > Générer clé API
    apiKey: 'pk_b24ffd32d09d019b6672d8d6c98a1ed36355fa8e48f3f70440e1692d8cc3d0f2',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ZKACCESS DATABASE
  // ─────────────────────────────────────────────────────────────────────────────
  zkaccess: {
    // Chemin vers la base de données ZKAccess
    dbPath: 'C:\\Program Files (x86)\\ZKTeco\\ZKAccess3.5\\Access.mdb',

    // Numéro de série du terminal à synchroniser
    deviceSerial: 'A6F5211460142',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SYNCHRONISATION
  // ─────────────────────────────────────────────────────────────────────────────
  sync: {
    // Intervalle de synchronisation en secondes (30 = toutes les 30 secondes)
    intervalSeconds: 30,

    // Fichier pour stocker le dernier ID synchronisé
    lastSyncFile: './last_sync_id.json',

    // Fichier de log
    logFile: './sync.log',

    // Nombre de jours d'historique à synchroniser au premier lancement
    initialDaysBack: 7,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

// Logger avec timestamp
function log(message, level = 'INFO') {
  const timestamp = new Date().toLocaleString('fr-FR');
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  // Écrire aussi dans le fichier de log
  try {
    fs.appendFileSync(CONFIG.sync.logFile, logMessage + '\n');
  } catch (e) {
    // Ignorer les erreurs d'écriture de log
  }
}

// Lire le dernier ID synchronisé
function getLastSyncInfo() {
  try {
    if (fs.existsSync(CONFIG.sync.lastSyncFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.sync.lastSyncFile, 'utf8'));
      return data;
    }
  } catch (e) {
    log(`Erreur lecture fichier sync: ${e.message}`, 'WARN');
  }
  return { lastId: 0, lastTime: null };
}

// Sauvegarder le dernier ID synchronisé
function saveLastSyncInfo(id, time) {
  try {
    fs.writeFileSync(CONFIG.sync.lastSyncFile, JSON.stringify({
      lastId: id,
      lastTime: time,
      updatedAt: new Date().toISOString(),
    }, null, 2));
  } catch (e) {
    log(`Erreur sauvegarde fichier sync: ${e.message}`, 'ERROR');
  }
}

// Déterminer le type de pointage (IN ou OUT)
function determineAttendanceType(eventType, verifyMode) {
  // Dans ZKAccess:
  // - Event type 0 = Check In (Entrée)
  // - Event type 1 = Check Out (Sortie)
  // - Event type 2 = Break Out
  // - Event type 3 = Break In
  // - Event type 4 = OT In
  // - Event type 5 = OT Out

  if (eventType === 0 || eventType === 3 || eventType === 4) {
    return 'IN';
  } else if (eventType === 1 || eventType === 2 || eventType === 5) {
    return 'OUT';
  }

  // Par défaut, alterner selon l'heure (matin = IN, après-midi = OUT)
  // Cette logique peut être ajustée selon vos besoins
  return 'IN'; // Default to IN, PointaFlex will handle the logic
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNEXION À LA BASE DE DONNÉES ZKACCESS
// ═══════════════════════════════════════════════════════════════════════════════

let ADODB;
try {
  ADODB = require('node-adodb');
} catch (e) {
  log('Module node-adodb non trouvé. Installation...', 'WARN');
  const { execSync } = require('child_process');
  execSync('npm install node-adodb', { stdio: 'inherit' });
  ADODB = require('node-adodb');
}

// Créer la connexion à la base de données Access
function getDbConnection() {
  const connectionString = `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${CONFIG.zkaccess.dbPath};`;
  return ADODB.open(connectionString);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÉCUPÉRATION DES ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

async function getNewEvents(connection, lastId) {
  try {
    // Requête pour récupérer les nouveaux événements de pointage
    // Note: La structure de la table peut varier selon la version de ZKAccess
    // Tables courantes: acc_transaction, att_log, transaction_log

    const query = `
      SELECT
        id,
        pin AS userId,
        event_time AS eventTime,
        event_type AS eventType,
        verify_mode AS verifyMode,
        device_sn AS deviceSN
      FROM acc_transaction
      WHERE id > ${lastId}
        AND device_sn = '${CONFIG.zkaccess.deviceSerial}'
      ORDER BY id ASC
    `;

    log(`Exécution requête: SELECT FROM acc_transaction WHERE id > ${lastId}`, 'DEBUG');

    const events = await connection.query(query);
    return events;

  } catch (error) {
    // Si la table acc_transaction n'existe pas, essayer d'autres tables
    log(`Table acc_transaction non trouvée, essai avec att_log...`, 'WARN');

    try {
      const altQuery = `
        SELECT
          id,
          user_id AS userId,
          att_time AS eventTime,
          att_state AS eventType,
          verify_type AS verifyMode,
          device_sn AS deviceSN
        FROM att_log
        WHERE id > ${lastId}
          AND device_sn = '${CONFIG.zkaccess.deviceSerial}'
        ORDER BY id ASC
      `;

      const events = await connection.query(altQuery);
      return events;

    } catch (altError) {
      log(`Erreur accès base de données: ${altError.message}`, 'ERROR');
      throw altError;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVOI VERS POINTAFLEX
// ═══════════════════════════════════════════════════════════════════════════════

async function sendToPointaFlex(event) {
  try {
    const payload = {
      // Le matricule de l'employé sur le terminal
      terminalMatricule: String(event.userId),

      // Type de pointage: IN (entrée) ou OUT (sortie)
      type: determineAttendanceType(event.eventType, event.verifyMode),

      // Horodatage du pointage
      timestamp: new Date(event.eventTime).toISOString(),

      // Type d'appareil
      deviceType: 'FINGERPRINT',
    };

    log(`Envoi pointage: User=${event.userId}, Type=${payload.type}, Time=${payload.timestamp}`);

    const response = await axios.post(CONFIG.pointaflex.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': CONFIG.pointaflex.deviceId,
        'X-Tenant-ID': CONFIG.pointaflex.tenantId,
        'X-API-Key': CONFIG.pointaflex.apiKey,
      },
      timeout: 10000, // 10 secondes timeout
    });

    if (response.status === 200 || response.status === 201) {
      log(`✅ Pointage envoyé avec succès: User ${event.userId}`, 'SUCCESS');
      return true;
    } else {
      log(`⚠️ Réponse inattendue: ${response.status}`, 'WARN');
      return false;
    }

  } catch (error) {
    if (error.response) {
      // Erreur de l'API
      log(`❌ Erreur API: ${error.response.status} - ${JSON.stringify(error.response.data)}`, 'ERROR');
    } else if (error.request) {
      // Pas de réponse
      log(`❌ Pas de réponse du serveur. Vérifiez que PointaFlex est démarré.`, 'ERROR');
    } else {
      // Autre erreur
      log(`❌ Erreur: ${error.message}`, 'ERROR');
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUCLE DE SYNCHRONISATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

async function syncOnce() {
  let connection;

  try {
    // Récupérer le dernier ID synchronisé
    const syncInfo = getLastSyncInfo();
    let lastId = syncInfo.lastId;

    log(`Démarrage sync (dernier ID: ${lastId})...`);

    // Se connecter à la base de données
    connection = getDbConnection();

    // Récupérer les nouveaux événements
    const events = await getNewEvents(connection, lastId);

    if (events.length === 0) {
      log(`Aucun nouveau pointage à synchroniser.`);
      return;
    }

    log(`📥 ${events.length} nouveau(x) pointage(s) trouvé(s)`);

    // Envoyer chaque événement à PointaFlex
    let successCount = 0;
    let failCount = 0;
    let maxId = lastId;

    for (const event of events) {
      const success = await sendToPointaFlex(event);

      if (success) {
        successCount++;
        if (event.id > maxId) {
          maxId = event.id;
          saveLastSyncInfo(maxId, event.eventTime);
        }
      } else {
        failCount++;
        // En cas d'échec, on continue avec les autres mais on ne met pas à jour lastId
        // pour réessayer ce pointage à la prochaine sync
      }

      // Petite pause entre chaque envoi pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    log(`📊 Résultat: ${successCount} succès, ${failCount} échecs`);

  } catch (error) {
    log(`❌ Erreur synchronisation: ${error.message}`, 'ERROR');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DÉMARRAGE DU SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   SYNCHRONISATION ZKACCESS → POINTAFLEX');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  // Vérifier la configuration
  if (CONFIG.pointaflex.apiKey === 'VOTRE_CLE_API_ICI') {
    log('⚠️  ATTENTION: Vous devez configurer la clé API dans le fichier!', 'ERROR');
    log('   1. Allez dans PointaFlex > Terminaux', 'ERROR');
    log('   2. Cliquez sur votre terminal "pointeuse"', 'ERROR');
    log('   3. Cliquez sur "Générer clé API"', 'ERROR');
    log('   4. Copiez la clé et collez-la dans ce script (ligne apiKey)', 'ERROR');
    console.log('');
    process.exit(1);
  }

  // Vérifier que le fichier de base de données existe
  if (!fs.existsSync(CONFIG.zkaccess.dbPath)) {
    log(`⚠️  Base de données non trouvée: ${CONFIG.zkaccess.dbPath}`, 'ERROR');
    log('   Vérifiez le chemin dans la configuration.', 'ERROR');
    console.log('');
    process.exit(1);
  }

  log(`📍 Terminal: ${CONFIG.pointaflex.deviceId}`);
  log(`🔗 API URL: ${CONFIG.pointaflex.apiUrl}`);
  log(`📁 DB Path: ${CONFIG.zkaccess.dbPath}`);
  log(`⏱️  Intervalle: ${CONFIG.sync.intervalSeconds} secondes`);
  console.log('');
  log('🚀 Démarrage de la synchronisation...');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('');

  // Synchronisation initiale
  await syncOnce();

  // Boucle de synchronisation périodique
  setInterval(async () => {
    console.log('');
    log(`🔄 Synchronisation périodique...`);
    await syncOnce();
  }, CONFIG.sync.intervalSeconds * 1000);

  // Garder le script en cours d'exécution
  log('✅ Script en cours d\'exécution. Appuyez sur Ctrl+C pour arrêter.');
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('');
  log('🛑 Arrêt du script de synchronisation...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`❌ Erreur non gérée: ${error.message}`, 'ERROR');
  log(error.stack, 'ERROR');
});

// Lancer le script
main().catch((error) => {
  log(`❌ Erreur fatale: ${error.message}`, 'ERROR');
  process.exit(1);
});
