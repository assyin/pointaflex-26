/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYNCHRONISATION TERMINAL ZKTECO → POINTAFLEX
 * VERSION FINALE - UTILISATION NATIVE DU CHAMP STATE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ce script utilise la librairie zkteco-js qui récupère le champ state.
 * Le type IN/OUT est déterminé directement par le terminal, pas par déduction.
 *
 * Mapping STATE → TYPE (standard ZKTeco):
 * - state 0 = IN  (Check-In)
 * - state 1 = OUT (Check-Out)
 * - state 2 = OUT (Break-Out)
 * - state 3 = IN  (Break-In)
 * - state 4 = IN  (OT-In)
 * - state 5 = OUT (OT-Out)
 *
 * Date: 19/01/2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ZKTeco = require('zkteco-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  terminal: {
    name: process.env.TERMINAL_NAME || 'CP',
    ip: process.env.TERMINAL_IP || '192.168.16.174',
    port: parseInt(process.env.TERMINAL_PORT) || 4370,
  },
  api: {
    baseUrl: process.env.API_URL || 'http://127.0.0.1:3000/api/v1',
    webhookEndpoint: '/attendance/webhook/state', // NOUVEAU endpoint avec STATE
    apiKey: process.env.API_KEY || '',
    tenantId: process.env.TENANT_ID || '90fab0cc-8539-4566-8da7-8742e9b6937b',
    deviceId: process.env.DEVICE_ID || '',
  },
  sync: {
    intervalSeconds: parseInt(process.env.SYNC_INTERVAL) || 30,
    stateFile: `./last_sync_state_${process.env.TERMINAL_NAME || 'terminal'}.json`,
    logFile: `./sync_state_${process.env.TERMINAL_NAME || 'terminal'}.log`,
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING STATE → TYPE (VÉRITÉ DU TERMINAL)
// ═══════════════════════════════════════════════════════════════════════════════

const STATE_TO_TYPE = {
  0: 'IN',   // Check-In
  1: 'OUT',  // Check-Out
  2: 'OUT',  // Break-Out
  3: 'IN',   // Break-In
  4: 'IN',   // OT-In
  5: 'OUT',  // OT-Out
};

const STATE_CATEGORY = {
  0: 'CHECK_IN',
  1: 'CHECK_OUT',
  2: 'BREAK_OUT',
  3: 'BREAK_IN',
  4: 'OT_IN',
  5: 'OT_OUT',
};

/**
 * Convertit le state du terminal en type IN/OUT
 * @param {number} state - State brut du terminal (0-5)
 * @returns {{ type: string, category: string }}
 */
function stateToType(state) {
  if (STATE_TO_TYPE.hasOwnProperty(state)) {
    return {
      type: STATE_TO_TYPE[state],
      category: STATE_CATEGORY[state] || 'UNKNOWN',
    };
  }
  // Fallback: parité (pair=IN, impair=OUT)
  console.warn(`⚠️ State inconnu: ${state}, utilisation règle de parité`);
  return {
    type: state % 2 === 0 ? 'IN' : 'OUT',
    category: 'UNKNOWN',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${CONFIG.terminal.name}] [${level}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(CONFIG.sync.logFile, logMessage + '\n');
  } catch (e) {
    // Ignore log write errors
  }
}

function getLastSync() {
  try {
    if (fs.existsSync(CONFIG.sync.stateFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.sync.stateFile, 'utf8'));
      return data;
    }
  } catch (e) {
    log(`Erreur lecture état: ${e.message}`, 'WARN');
  }
  return { lastSn: 0 };
}

function saveLastSync(sn, stats = {}) {
  try {
    fs.writeFileSync(CONFIG.sync.stateFile, JSON.stringify({
      lastSn: sn,
      updatedAt: new Date().toISOString(),
      ...stats,
    }, null, 2));
  } catch (e) {
    log(`Erreur sauvegarde état: ${e.message}`, 'WARN');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNCHRONISATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

async function syncOnce() {
  const device = new ZKTeco(CONFIG.terminal.ip, CONFIG.terminal.port, 5000, 5000);
  const stats = { success: 0, duplicates: 0, errors: 0 };

  try {
    const syncState = getLastSync();
    log(`🔄 Démarrage sync (dernier sn: ${syncState.lastSn})`);

    // Connexion au terminal
    await device.createSocket();
    log('✅ Connecté au terminal');

    // Récupération des pointages
    const logsData = await device.getAttendances();

    if (!logsData || !logsData.data || logsData.data.length === 0) {
      log('📭 Aucun pointage dans le terminal');
      await device.disconnect();
      return;
    }

    // Filtrer les nouveaux pointages (+ filtre date si START_DATE défini)
    const startDateFilter = process.env.START_DATE ? new Date(process.env.START_DATE) : null;
    const newPunches = logsData.data.filter(p => {
      if (p.sn <= syncState.lastSn) return false;
      if (startDateFilter && new Date(p.record_time) < startDateFilter) return false;
      return true;
    });

    if (newPunches.length === 0) {
      log('✓ Aucun nouveau pointage');
      await device.disconnect();
      return;
    }

    log(`📤 ${newPunches.length} nouveau(x) pointage(s) à envoyer`);

    // Trier par sn
    newPunches.sort((a, b) => a.sn - b.sn);

    let maxSn = syncState.lastSn;

    for (const punch of newPunches) {
      // CONVERSION STATE → TYPE (la clé de la solution!)
      const { type, category } = stateToType(punch.state);

      log(`→ Envoi: sn=${punch.sn}, User=${punch.user_id}, State=${punch.state} → ${type} (${category})`);

      try {
        const payload = {
          employeeId: punch.user_id,
          timestamp: new Date(punch.record_time).toISOString(),
          type: type,                    // TYPE VENANT DU TERMINAL
          terminalState: punch.state,    // STATE BRUT CONSERVÉ
          method: 'FINGERPRINT',
          source: 'TERMINAL',
          rawData: {
            sn: punch.sn,
            user_id: punch.user_id,
            record_time: punch.record_time,
            state: punch.state,
            stateCategory: category,
            terminal: CONFIG.terminal.name,
            ip: CONFIG.terminal.ip,
            syncedAt: new Date().toISOString(),
          }
        };

        const response = await axios.post(
          `${CONFIG.api.baseUrl}${CONFIG.api.webhookEndpoint}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': CONFIG.api.apiKey,
              'X-Tenant-Id': CONFIG.api.tenantId,
              'X-Device-Id': CONFIG.api.deviceId || CONFIG.terminal.name,
            },
            timeout: 30000,
          }
        );

        if (response.data.status === 'CREATED') {
          log(`  ✅ Créé: ${response.data.id} (${response.data.type})`, 'SUCCESS');
          stats.success++;
        } else if (response.data.status === 'DUPLICATE') {
          log(`  ⚠️ Doublon: ${response.data.existingId}`, 'WARN');
          stats.duplicates++;
        } else {
          log(`  ❓ Réponse: ${JSON.stringify(response.data)}`, 'WARN');
        }

      } catch (e) {
        const errorMsg = e.response?.data?.error || e.response?.data?.message || e.message;
        log(`  ❌ Erreur: ${errorMsg}`, 'ERROR');
        stats.errors++;
      }

      if (punch.sn > maxSn) maxSn = punch.sn;
    }

    // Sauvegarder l'état
    saveLastSync(maxSn, stats);
    log(`📊 Résultat: ${stats.success} créés, ${stats.duplicates} doublons, ${stats.errors} erreurs`);
    log(`   lastSn mis à jour: ${maxSn}`);

    await device.disconnect();
    log('🔌 Déconnecté du terminal');

  } catch (error) {
    log(`❌ Erreur sync: ${error.message}`, 'ERROR');
    try { await device.disconnect(); } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POINT D'ENTRÉE
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('   SYNC TERMINAL → POINTAFLEX');
  console.log('   VERSION FINALE - STATE NATIF DU TERMINAL');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  log(`📍 Terminal: ${CONFIG.terminal.name} (${CONFIG.terminal.ip}:${CONFIG.terminal.port})`);
  log(`🔗 API: ${CONFIG.api.baseUrl}${CONFIG.api.webhookEndpoint}`);
  log(`⏱️  Intervalle: ${CONFIG.sync.intervalSeconds}s`);
  log(`📁 État: ${CONFIG.sync.stateFile}`);

  // Mode: si --once, exécuter une seule fois
  if (process.argv.includes('--once')) {
    log('Mode: Exécution unique (--once)');
    await syncOnce();
    process.exit(0);
  }

  // Mode continu
  log('Mode: Boucle continue');
  await syncOnce();

  setInterval(syncOnce, CONFIG.sync.intervalSeconds * 1000);
}

process.on('SIGINT', () => {
  log('🛑 Arrêt demandé (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Arrêt demandé (SIGTERM)');
  process.exit(0);
});

// Démarrer
main().catch(e => {
  log(`❌ Erreur fatale: ${e.message}`, 'ERROR');
  console.error(e);
  process.exit(1);
});
