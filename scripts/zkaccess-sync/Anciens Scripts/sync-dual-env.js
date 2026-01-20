/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYNCHRONISATION DOUBLE - TERMINAL ZKTECO → POINTAFLEX (DEV & PROD)
 * Envoie les pointages aux deux environnements simultanément
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  terminal: {
    ip: '192.168.16.176',
    port: 4370,
  },
  // Environnement DEV (port 3000)
  dev: {
    apiUrl: 'http://localhost:3000/api/v1/attendance/webhook/fast',
    deviceId: 'A6F5211460142',
    tenantId: '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
    apiKey: 'pk_b24ffd32d09d019b6672d8d6c98a1ed36355fa8e48f3f70440e1692d8cc3d0f2',
    name: 'DEV',
  },
  // Environnement PROD (port 4000)
  prod: {
    apiUrl: 'http://localhost:4000/api/v1/attendance/webhook/fast',
    deviceId: 'A6F5211460142',
    tenantId: '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
    apiKey: 'pk_b24ffd32d09d019b6672d8d6c98a1ed36355fa8e48f3f70440e1692d8cc3d0f2',
    name: 'PROD',
  },
  sync: {
    intervalSeconds: 30,
    lastSyncFile: './last_sync_dual.json',
    logFile: './sync_dual.log',
    daysBack: 7,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
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
  } catch (e) {}
  return { lastSyncTime: null, lastRecordTime: null };
}

function saveLastSyncInfo(info) {
  try {
    fs.writeFileSync(CONFIG.sync.lastSyncFile, JSON.stringify(info, null, 2));
  } catch (e) {
    log(`Erreur sauvegarde sync info: ${e.message}`, 'ERROR');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÉCUPÉRATION DES POINTAGES
// ═══════════════════════════════════════════════════════════════════════════════

function getAttendanceRecords() {
  try {
    const cmd = `zkaccess -c ${CONFIG.terminal.ip} -s getatt -o json 2>/dev/null || echo "[]"`;
    const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });

    try {
      const records = JSON.parse(output.trim() || '[]');
      return Array.isArray(records) ? records : [];
    } catch (e) {
      log(`Erreur parsing JSON: ${e.message}`, 'ERROR');
      return [];
    }
  } catch (e) {
    log(`Erreur récupération pointages: ${e.message}`, 'ERROR');
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVOI VERS UN ENVIRONNEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function sendToEnvironment(envConfig, records) {
  let success = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const payload = {
        deviceId: envConfig.deviceId,
        tenantId: envConfig.tenantId,
        records: [{
          badge: record.user_id || record.uid,
          timestamp: record.timestamp || record.datetime,
          type: record.state || 0,
        }],
      };

      await axios.post(envConfig.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': envConfig.apiKey,
        },
        timeout: 10000,
      });

      success++;
    } catch (e) {
      failed++;
    }
  }

  return { success, failed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNCHRONISATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

async function syncBothEnvironments() {
  log('═══════════════════════════════════════════════════════════════');
  log('Démarrage synchronisation DUAL (DEV + PROD)');

  // Récupérer les pointages
  const records = getAttendanceRecords();

  if (records.length === 0) {
    log('Aucun nouveau pointage à synchroniser');
    return;
  }

  log(`${records.length} pointages récupérés du terminal`);

  // Filtrer les nouveaux enregistrements
  const lastSync = getLastSyncInfo();
  const lastTime = lastSync.lastRecordTime ? new Date(lastSync.lastRecordTime) : new Date(0);

  const newRecords = records.filter(r => {
    const recordTime = new Date(r.timestamp || r.datetime);
    return recordTime > lastTime;
  });

  if (newRecords.length === 0) {
    log('Aucun nouveau pointage depuis la dernière sync');
    return;
  }

  log(`${newRecords.length} nouveaux pointages à envoyer`);

  // Envoyer vers DEV
  log(`📤 Envoi vers DEV (${CONFIG.dev.apiUrl})...`);
  const devResult = await sendToEnvironment(CONFIG.dev, newRecords);
  log(`   DEV: ✅ ${devResult.success} | ❌ ${devResult.failed}`);

  // Envoyer vers PROD
  log(`📤 Envoi vers PROD (${CONFIG.prod.apiUrl})...`);
  const prodResult = await sendToEnvironment(CONFIG.prod, newRecords);
  log(`   PROD: ✅ ${prodResult.success} | ❌ ${prodResult.failed}`);

  // Sauvegarder le dernier timestamp
  if (newRecords.length > 0) {
    const latestRecord = newRecords.reduce((latest, r) => {
      const t = new Date(r.timestamp || r.datetime);
      return t > new Date(latest.timestamp || latest.datetime) ? r : latest;
    });

    saveLastSyncInfo({
      lastSyncTime: new Date().toISOString(),
      lastRecordTime: latestRecord.timestamp || latestRecord.datetime,
      devResult,
      prodResult,
    });
  }

  log('Synchronisation terminée');
  log('═══════════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUCLE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║     SYNC DUAL - POINTAGES VERS DEV & PROD                    ║');
  log('╠══════════════════════════════════════════════════════════════╣');
  log(`║  Terminal: ${CONFIG.terminal.ip}:${CONFIG.terminal.port}                        ║`);
  log(`║  DEV:  ${CONFIG.dev.apiUrl}      ║`);
  log(`║  PROD: ${CONFIG.prod.apiUrl}      ║`);
  log(`║  Intervalle: ${CONFIG.sync.intervalSeconds} secondes                             ║`);
  log('╚══════════════════════════════════════════════════════════════╝');

  // Boucle infinie
  while (true) {
    try {
      await syncBothEnvironments();
    } catch (e) {
      log(`Erreur sync: ${e.message}`, 'ERROR');
    }

    // Attendre avant la prochaine sync
    await new Promise(resolve => setTimeout(resolve, CONFIG.sync.intervalSeconds * 1000));
  }
}

// Démarrer
main().catch(e => {
  log(`Erreur fatale: ${e.message}`, 'FATAL');
  process.exit(1);
});
