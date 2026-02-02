/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYNCHRONISATION MULTI-TERMINAUX ZKTECO → POINTAFLEX
 * CP + CIT en un seul script avec STATE natif
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ZKTeco = require('zkteco-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const TERMINALS = [
  {
    name: 'CP',
    ip: '192.168.16.174',
    port: 4370,
    deviceId: 'EJB8241100241',
  },
  {
    name: 'CIT',
    ip: '192.168.16.175',
    port: 4370,
    deviceId: 'EJB8241100244',
  },
];

const API = {
  baseUrl: process.env.API_URL || 'http://127.0.0.1:3000/api/v1',
  webhookEndpoint: '/attendance/webhook/state',
  tenantId: process.env.TENANT_ID || '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
};

const SYNC_INTERVAL_SECONDS = parseInt(process.env.SYNC_INTERVAL) || 30;
const START_DATE = process.env.START_DATE ? new Date(process.env.START_DATE) : null;
const STATE_DIR = path.resolve(__dirname);

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING STATE → TYPE
// ═══════════════════════════════════════════════════════════════════════════════

const STATE_TO_TYPE = { 0: 'IN', 1: 'OUT', 2: 'OUT', 3: 'IN', 4: 'IN', 5: 'OUT' };
const STATE_CATEGORY = { 0: 'CHECK_IN', 1: 'CHECK_OUT', 2: 'BREAK_OUT', 3: 'BREAK_IN', 4: 'OT_IN', 5: 'OT_OUT' };

function stateToType(state) {
  if (STATE_TO_TYPE.hasOwnProperty(state)) {
    return { type: STATE_TO_TYPE[state], category: STATE_CATEGORY[state] || 'UNKNOWN' };
  }
  return { type: state % 2 === 0 ? 'IN' : 'OUT', category: 'UNKNOWN' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_FILE = path.join(STATE_DIR, 'sync_all.log');

function log(message, level = 'INFO') {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (e) {}
}

function getStateFile(terminalName) {
  return path.join(STATE_DIR, `last_sync_state_${terminalName}.json`);
}

function getLastSync(terminalName) {
  try {
    const file = getStateFile(terminalName);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {}
  return { lastSn: 0 };
}

function saveLastSync(terminalName, sn, stats = {}) {
  try {
    fs.writeFileSync(getStateFile(terminalName), JSON.stringify({
      lastSn: sn,
      updatedAt: new Date().toISOString(),
      ...stats,
    }, null, 2));
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC D'UN TERMINAL
// ═══════════════════════════════════════════════════════════════════════════════

async function syncTerminal(terminal) {
  const device = new ZKTeco(terminal.ip, terminal.port, 10000, 10000);
  const stats = { success: 0, duplicates: 0, errors: 0 };

  try {
    const syncState = getLastSync(terminal.name);
    log(`[${terminal.name}] Sync (dernier sn: ${syncState.lastSn}) — ${terminal.ip}`);

    await device.createSocket();

    const logsData = await device.getAttendances();
    if (!logsData || !logsData.data || logsData.data.length === 0) {
      log(`[${terminal.name}] Aucun pointage`);
      await device.disconnect();
      return stats;
    }

    const newPunches = logsData.data.filter(p => {
      if (p.sn <= syncState.lastSn) return false;
      if (START_DATE && new Date(p.record_time) < START_DATE) return false;
      return true;
    });

    if (newPunches.length === 0) {
      log(`[${terminal.name}] Aucun nouveau pointage`);
      await device.disconnect();
      return stats;
    }

    log(`[${terminal.name}] ${newPunches.length} nouveau(x) pointage(s)`);
    newPunches.sort((a, b) => a.sn - b.sn);

    let maxSn = syncState.lastSn;

    for (const punch of newPunches) {
      const { type, category } = stateToType(punch.state);

      try {
        const response = await axios.post(
          `${API.baseUrl}${API.webhookEndpoint}`,
          {
            employeeId: punch.user_id,
            timestamp: new Date(punch.record_time).toISOString(),
            type,
            terminalState: punch.state,
            method: 'FINGERPRINT',
            source: 'TERMINAL',
            rawData: {
              sn: punch.sn,
              user_id: punch.user_id,
              record_time: punch.record_time,
              state: punch.state,
              stateCategory: category,
              terminal: terminal.name,
              ip: terminal.ip,
              syncedAt: new Date().toISOString(),
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-Id': API.tenantId,
              'X-Device-Id': terminal.deviceId,
            },
            timeout: 30000,
          }
        );

        if (response.data.status === 'CREATED') {
          const anomaly = response.data.anomaly ? ` [${response.data.anomaly}]` : '';
          log(`[${terminal.name}] ✅ ${punch.user_id} ${type} (state=${punch.state})${anomaly}`);
          stats.success++;
        } else if (response.data.status === 'DUPLICATE' || response.data.status === 'DEBOUNCE_BLOCKED') {
          stats.duplicates++;
        } else {
          log(`[${terminal.name}] ❓ ${JSON.stringify(response.data)}`, 'WARN');
        }
      } catch (e) {
        const errorMsg = e.response?.data?.error || e.response?.data?.message || e.message;
        log(`[${terminal.name}] ❌ ${punch.user_id}: ${errorMsg}`, 'ERROR');
        stats.errors++;
      }

      if (punch.sn > maxSn) maxSn = punch.sn;
    }

    saveLastSync(terminal.name, maxSn, stats);
    log(`[${terminal.name}] Résultat: ${stats.success} créés, ${stats.duplicates} doublons, ${stats.errors} erreurs`);

    await device.disconnect();
  } catch (error) {
    log(`[${terminal.name}] ❌ ${error.message}`, 'ERROR');
    try { await device.disconnect(); } catch (e) {}
  }

  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC DE TOUS LES TERMINAUX
// ═══════════════════════════════════════════════════════════════════════════════

let isSyncing = false;

async function syncAll() {
  if (isSyncing) {
    log('⏳ Sync précédent encore en cours, skip', 'WARN');
    return;
  }
  isSyncing = true;

  const totalStats = { success: 0, duplicates: 0, errors: 0 };

  for (const terminal of TERMINALS) {
    try {
      const stats = await syncTerminal(terminal);
      totalStats.success += stats.success;
      totalStats.duplicates += stats.duplicates;
      totalStats.errors += stats.errors;
    } catch (e) {
      log(`[${terminal.name}] Erreur fatale: ${e.message}`, 'ERROR');
    }
  }

  if (totalStats.success > 0 || totalStats.errors > 0) {
    log(`📊 Total: ${totalStats.success} créés, ${totalStats.duplicates} doublons, ${totalStats.errors} erreurs`);
  }

  isSyncing = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POINT D'ENTRÉE
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   SYNC MULTI-TERMINAUX → POINTAFLEX (STATE NATIF)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  for (const t of TERMINALS) {
    log(`📍 ${t.name}: ${t.ip}:${t.port} (device: ${t.deviceId})`);
  }
  log(`🔗 API: ${API.baseUrl}${API.webhookEndpoint}`);
  log(`🏢 Tenant: ${API.tenantId}`);
  log(`⏱️  Intervalle: ${SYNC_INTERVAL_SECONDS}s`);
  if (START_DATE) log(`📅 Filtre date: >= ${START_DATE.toISOString()}`);

  if (process.argv.includes('--once')) {
    log('Mode: Exécution unique (--once)');
    await syncAll();
    process.exit(0);
  }

  log('Mode: Boucle continue');
  await syncAll();
  setInterval(syncAll, SYNC_INTERVAL_SECONDS * 1000);
}

process.on('SIGINT', () => { log('🛑 Arrêt (SIGINT)'); process.exit(0); });
process.on('SIGTERM', () => { log('🛑 Arrêt (SIGTERM)'); process.exit(0); });

main().catch(e => {
  log(`❌ Erreur fatale: ${e.message}`, 'ERROR');
  console.error(e);
  process.exit(1);
});
