/**
 * SCRIPT DE SYNCHRONISATION ZKACCESS → POINTAFLEX (Version 2)
 * Utilise mdb-reader au lieu de node-adodb pour éviter les problèmes cscript
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  pointaflex: {
    apiUrl: 'http://localhost:3000/api/v1/attendance/webhook',
    deviceId: 'A6F5211460142',
    tenantId: '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
    apiKey: 'pk_b24ffd32d09d019b6672d8d6c98a1ed36355fa8e48f3f70440e1692d8cc3d0f2',
  },
  zkaccess: {
    dbPath: 'C:\\Program Files (x86)\\ZKTeco\\ZKAccess3.5\\Access.mdb',
    deviceSerial: 'A6F5211460142',
  },
  sync: {
    intervalSeconds: 30,
    lastSyncFile: './last_sync_id.json',
    logFile: './sync.log',
    // Ne synchroniser que les pointages des X derniers jours (0 = tous)
    daysBack: 7,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, level = 'INFO') {
  const timestamp = new Date().toLocaleString('fr-FR');
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(CONFIG.sync.logFile, logMessage + '\n');
  } catch (e) {}
}

function getLastSyncInfo() {
  try {
    if (fs.existsSync(CONFIG.sync.lastSyncFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.sync.lastSyncFile, 'utf8'));
    }
  } catch (e) {
    log(`Erreur lecture fichier sync: ${e.message}`, 'WARN');
  }
  return { lastId: 0, lastTime: null };
}

function saveLastSyncInfo(id, time) {
  try {
    fs.writeFileSync(CONFIG.sync.lastSyncFile, JSON.stringify({
      lastId: id,
      lastTime: time,
      updatedAt: new Date().toISOString(),
    }, null, 2));
  } catch (e) {
    log(`Erreur sauvegarde: ${e.message}`, 'ERROR');
  }
}

function determineAttendanceType(eventType) {
  if (eventType === 0 || eventType === 3 || eventType === 4) {
    return 'IN';
  } else if (eventType === 1 || eventType === 2 || eventType === 5) {
    return 'OUT';
  }
  return 'IN';
}

// ═══════════════════════════════════════════════════════════════════════════════
// LECTURE BASE DE DONNÉES AVEC MDB-READER
// ═══════════════════════════════════════════════════════════════════════════════

let MDBReader;
try {
  MDBReader = require('mdb-reader').default;
} catch (e) {
  log('Installation de mdb-reader...', 'INFO');
  const { execSync } = require('child_process');
  execSync('npm install mdb-reader', { stdio: 'inherit' });
  MDBReader = require('mdb-reader').default;
}

// Cache pour le mapping USERID -> Badgenumber
let userMapping = {};

function loadUserMapping(reader) {
  try {
    const tables = reader.getTableNames();
    if (!tables.includes('USERINFO')) {
      log('Table USERINFO non trouvée', 'WARN');
      return {};
    }

    const userTable = reader.getTable('USERINFO');
    const users = userTable.getData();
    const columns = userTable.getColumnNames();
    log(`USERINFO colonnes: ${columns.join(', ')}`, 'DEBUG');

    const mapping = {};
    users.forEach(user => {
      // USERID est l'ID interne, Badgenumber est l'ID affiché sur le terminal
      const internalId = user.USERID || user.UserID || user.userid;
      const badgeNumber = user.Badgenumber || user.BadgeNumber || user.BADGENUMBER || user.PIN || user.pin;
      const name = user.Name || user.name || user.NAME || '';

      if (internalId && badgeNumber) {
        mapping[String(internalId)] = {
          badgeNumber: String(badgeNumber),
          name: name
        };
      }
    });

    log(`Mapping utilisateurs chargé: ${Object.keys(mapping).length} utilisateurs`, 'INFO');
    // Log quelques exemples
    const examples = Object.entries(mapping).slice(0, 3);
    examples.forEach(([id, info]) => {
      log(`  ID interne ${id} → Badge ${info.badgeNumber} (${info.name})`, 'DEBUG');
    });

    return mapping;
  } catch (error) {
    log(`Erreur chargement USERINFO: ${error.message}`, 'ERROR');
    return {};
  }
}

async function getNewEvents(lastId) {
  try {
    const buffer = fs.readFileSync(CONFIG.zkaccess.dbPath);
    const reader = new MDBReader(buffer);

    // Charger le mapping utilisateurs
    userMapping = loadUserMapping(reader);

    // Lister les tables disponibles
    const tables = reader.getTableNames();
    log(`Tables trouvées: ${tables.join(', ')}`, 'DEBUG');

    // Chercher la table des transactions
    let tableName = null;
    const possibleTables = ['acc_transaction', 'att_log', 'transaction', 'CHECKINOUT', 'checkinout', 'CheckInOut'];

    for (const t of possibleTables) {
      if (tables.includes(t)) {
        tableName = t;
        break;
      }
    }

    // Si pas trouvé, chercher une table contenant 'transaction' ou 'check' ou 'att'
    if (!tableName) {
      tableName = tables.find(t =>
        t.toLowerCase().includes('transaction') ||
        t.toLowerCase().includes('check') ||
        t.toLowerCase().includes('att_log') ||
        t.toLowerCase().includes('punch')
      );
    }

    if (!tableName) {
      log(`Tables disponibles: ${tables.join(', ')}`, 'ERROR');
      throw new Error('Table de pointage non trouvée');
    }

    log(`Utilisation de la table: ${tableName}`, 'INFO');

    const table = reader.getTable(tableName);
    const data = table.getData();

    // Afficher les colonnes pour debug
    const columns = table.getColumnNames();
    log(`Colonnes: ${columns.join(', ')}`, 'DEBUG');

    // Calculer la date limite si daysBack est configuré
    let minDate = null;
    if (CONFIG.sync.daysBack > 0) {
      minDate = new Date();
      minDate.setDate(minDate.getDate() - CONFIG.sync.daysBack);
      log(`Filtrage: pointages depuis ${minDate.toISOString().split('T')[0]}`, 'DEBUG');
    }

    // Filtrer les événements après lastId, par date ET par terminal
    const events = data
      .filter(row => {
        const id = row.id || row.ID || row.LogId || row.LOGID || 0;
        if (id <= lastId) return false;

        // Filtrer par terminal (serial number)
        const deviceSN = row.sn || row.SN || row.device_sn || row.DeviceSN || '';
        if (deviceSN && deviceSN !== CONFIG.zkaccess.deviceSerial) {
          return false; // Ignorer les pointages d'autres terminaux
        }

        // Filtrer par date si configuré
        if (minDate) {
          const eventTime = row.event_time || row.EventTime || row.att_time || row.CHECKTIME || row.CheckTime || row.punch_time;
          if (eventTime && new Date(eventTime) < minDate) return false;
        }

        return true;
      })
      .map(row => {
        const internalUserId = String(row.USERID || row.UserID || row.userid || '');

        // Convertir l'ID interne en badge number (ID affiché sur le terminal)
        let userId = internalUserId;
        if (userMapping[internalUserId]) {
          userId = userMapping[internalUserId].badgeNumber;
          log(`Mapping: ID interne ${internalUserId} → Badge ${userId} (${userMapping[internalUserId].name})`, 'DEBUG');
        }

        return {
          id: row.id || row.ID || row.LogId || row.LOGID || 0,
          internalUserId: internalUserId,
          userId: userId,
          eventTime: row.event_time || row.EventTime || row.att_time || row.CHECKTIME || row.CheckTime || row.punch_time || new Date(),
          eventType: row.event_type || row.EventType || row.att_state || row.CHECKTYPE || row.CheckType || 0,
          deviceSN: row.device_sn || row.DeviceSN || row.sn || row.SN || CONFIG.zkaccess.deviceSerial,
        };
      })
      .sort((a, b) => a.id - b.id);

    return events;

  } catch (error) {
    log(`Erreur lecture DB: ${error.message}`, 'ERROR');
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVOI VERS POINTAFLEX
// ═══════════════════════════════════════════════════════════════════════════════

async function sendToPointaFlex(event) {
  try {
    const payload = {
      employeeId: String(event.userId),
      type: determineAttendanceType(event.eventType),
      timestamp: new Date(event.eventTime).toISOString(),
      method: 'FINGERPRINT',
    };

    log(`Envoi: User=${event.userId}, Type=${payload.type}, Time=${payload.timestamp}`);

    const response = await axios.post(CONFIG.pointaflex.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': CONFIG.pointaflex.deviceId,
        'X-Tenant-ID': CONFIG.pointaflex.tenantId,
        'X-API-Key': CONFIG.pointaflex.apiKey,
      },
      timeout: 60000, // 60 secondes timeout
    });

    if (response.status === 200 || response.status === 201) {
      log(`✅ Pointage envoyé: User ${event.userId}`, 'SUCCESS');
      return true;
    }
    return false;

  } catch (error) {
    if (error.response) {
      log(`❌ Erreur API: ${error.response.status} - ${JSON.stringify(error.response.data)}`, 'ERROR');
    } else if (error.request) {
      log(`❌ Pas de réponse du serveur`, 'ERROR');
    } else {
      log(`❌ Erreur: ${error.message}`, 'ERROR');
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNCHRONISATION
// ═══════════════════════════════════════════════════════════════════════════════

async function syncOnce() {
  try {
    const syncInfo = getLastSyncInfo();
    let lastId = syncInfo.lastId;

    log(`Démarrage sync (dernier ID: ${lastId})...`);

    const events = await getNewEvents(lastId);

    if (events.length === 0) {
      log(`Aucun nouveau pointage pour le terminal ${CONFIG.zkaccess.deviceSerial}.`);
      return;
    }

    log(`📥 ${events.length} nouveau(x) pointage(s) du terminal ${CONFIG.zkaccess.deviceSerial}`);

    let successCount = 0;
    let maxId = lastId;

    for (const event of events) {
      const success = await sendToPointaFlex(event);
      if (success) {
        successCount++;
        if (event.id > maxId) {
          maxId = event.id;
          saveLastSyncInfo(maxId, event.eventTime);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    log(`📊 Résultat: ${successCount}/${events.length} envoyés`);

  } catch (error) {
    log(`❌ Erreur: ${error.message}`, 'ERROR');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DÉMARRAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   SYNCHRONISATION ZKACCESS → POINTAFLEX (v2)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  if (!fs.existsSync(CONFIG.zkaccess.dbPath)) {
    log(`❌ Base de données non trouvée: ${CONFIG.zkaccess.dbPath}`, 'ERROR');
    process.exit(1);
  }

  log(`📍 Terminal: ${CONFIG.pointaflex.deviceId}`);
  log(`🔗 API URL: ${CONFIG.pointaflex.apiUrl}`);
  log(`📁 DB Path: ${CONFIG.zkaccess.dbPath}`);
  log(`⏱️  Intervalle: ${CONFIG.sync.intervalSeconds} secondes`);
  console.log('');
  log('🚀 Démarrage...');
  console.log('───────────────────────────────────────────────────────────────────');

  await syncOnce();

  setInterval(async () => {
    console.log('');
    log(`🔄 Synchronisation périodique...`);
    await syncOnce();
  }, CONFIG.sync.intervalSeconds * 1000);

  log('✅ Script actif. Ctrl+C pour arrêter.');
}

process.on('SIGINT', () => {
  console.log('');
  log('🛑 Arrêt...');
  process.exit(0);
});

main().catch((error) => {
  log(`❌ Erreur fatale: ${error.message}`, 'ERROR');
  process.exit(1);
});
