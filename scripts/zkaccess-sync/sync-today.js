/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYNCHRONISATION POINTAGES DU JOUR UNIQUEMENT
 * Récupère et envoie les pointages d'aujourd'hui des terminaux vers PointaFlex
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ZKTeco = require('zkteco-js');
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  terminals: [
    { name: 'CP', ip: '192.168.16.174', port: 4370, deviceId: 'EJB8241100241' },
    { name: 'CIT', ip: '192.168.16.175', port: 4370, deviceId: 'EJB8241100244' },
  ],
  api: {
    baseUrl: process.env.API_URL || 'http://127.0.0.1:3000/api/v1',
    webhookEndpoint: '/attendance/webhook/state',
    tenantId: process.env.TENANT_ID || '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
  },
};

// Mapping STATE → TYPE
const STATE_TO_TYPE = {
  0: { type: 'IN',  category: 'CHECK_IN' },
  1: { type: 'OUT', category: 'CHECK_OUT' },
  2: { type: 'OUT', category: 'BREAK_OUT' },
  3: { type: 'IN',  category: 'BREAK_IN' },
  4: { type: 'IN',  category: 'OT_IN' },
  5: { type: 'OUT', category: 'OT_OUT' },
};

function stateToType(state) {
  const mapping = STATE_TO_TYPE[state];
  if (mapping) return mapping;
  return { type: state % 2 === 0 ? 'IN' : 'OUT', category: 'UNKNOWN' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

function isToday(dateStr) {
  const punchDate = new Date(dateStr);
  const today = new Date();

  return punchDate.getFullYear() === today.getFullYear() &&
         punchDate.getMonth() === today.getMonth() &&
         punchDate.getDate() === today.getDate();
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function log(terminal, message, level = 'INFO') {
  const timestamp = new Date().toLocaleTimeString('fr-FR');
  const prefix = level === 'ERROR' ? '❌' : level === 'SUCCESS' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] [${terminal}] ${prefix} ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNCHRONISATION
// ═══════════════════════════════════════════════════════════════════════════════

async function syncTodayFromTerminal(terminal) {
  console.log('');
  console.log('┌' + '─'.repeat(70) + '┐');
  console.log(`│  ${terminal.name} (${terminal.ip})`.padEnd(71) + '│');
  console.log('└' + '─'.repeat(70) + '┘');

  const device = new ZKTeco(terminal.ip, terminal.port, 10000, 10000);

  try {
    log(terminal.name, 'Connexion...');
    await device.createSocket();
    log(terminal.name, 'Connecté', 'SUCCESS');

    log(terminal.name, 'Récupération des pointages...');
    const logsData = await device.getAttendances();

    if (!logsData || !logsData.data || logsData.data.length === 0) {
      log(terminal.name, 'Aucun pointage dans le terminal', 'ERROR');
      await device.disconnect();
      return { terminal: terminal.name, total: 0, today: 0, sent: 0, errors: 0 };
    }

    const allLogs = logsData.data;
    log(terminal.name, `${allLogs.length} pointages au total`);

    // Filtrer les pointages d'aujourd'hui
    const todayLogs = allLogs.filter(p => isToday(p.record_time || p.recordTime));
    log(terminal.name, `${todayLogs.length} pointages AUJOURD'HUI`);

    if (todayLogs.length === 0) {
      log(terminal.name, 'Aucun pointage aujourd\'hui');
      await device.disconnect();
      return { terminal: terminal.name, total: allLogs.length, today: 0, sent: 0, errors: 0 };
    }

    // Trier par heure
    todayLogs.sort((a, b) => {
      const timeA = new Date(a.record_time || a.recordTime).getTime();
      const timeB = new Date(b.record_time || b.recordTime).getTime();
      return timeA - timeB;
    });

    // Afficher les pointages trouvés
    console.log('');
    console.log('  📋 Pointages du jour:');
    console.log('  ' + '─'.repeat(60));

    for (const punch of todayLogs) {
      const time = formatTime(punch.record_time || punch.recordTime);
      const userId = (punch.user_id || punch.userId).toString().padEnd(8);
      const state = punch.state;
      const typeInfo = stateToType(state);
      const arrow = typeInfo.type === 'IN' ? '↑' : '↓';
      console.log(`  ${arrow} ${time} | User: ${userId} | State: ${state} → ${typeInfo.type}`);
    }
    console.log('');

    // Envoyer au backend
    log(terminal.name, `Envoi de ${todayLogs.length} pointages vers PointaFlex...`);
    console.log('  ⏳ Patience, ~6s par pointage...\n');

    let sentCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let processedCount = 0;

    for (const punch of todayLogs) {
      processedCount++;
      const typeInfo = stateToType(punch.state);
      const punchTime = new Date(punch.record_time || punch.recordTime);
      const userId = (punch.user_id || punch.userId).toString();

      // Afficher progression
      process.stdout.write(`\r  [${processedCount}/${todayLogs.length}] User ${userId.padEnd(6)} → `);

      try {
        const response = await axios.post(
          `${CONFIG.api.baseUrl}${CONFIG.api.webhookEndpoint}`,
          {
            employeeId: (punch.user_id || punch.userId).toString(),
            timestamp: punchTime.toISOString(),
            type: typeInfo.type,
            terminalState: punch.state,
            method: 'FINGERPRINT',
            source: 'TERMINAL',
            rawData: {
              sn: punch.sn,
              terminal: terminal.name,
              ip: terminal.ip,
              stateCategory: typeInfo.category,
              syncDate: new Date().toISOString(),
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-Id': CONFIG.api.tenantId,
              'X-Device-Id': terminal.deviceId,
            },
            timeout: 60000,  // 60s timeout car le backend peut être lent
          }
        );

        if (response.data.status === 'CREATED') {
          sentCount++;
          process.stdout.write(`✅ Créé\n`);
        } else if (response.data.status === 'DUPLICATE') {
          duplicateCount++;
          process.stdout.write(`🔄 Doublon\n`);
        } else {
          process.stdout.write(`⚠️ ${response.data.status}\n`);
        }
      } catch (error) {
        const errMsg = error.response?.data?.error || error.message;
        process.stdout.write(`❌ ${errMsg.substring(0, 40)}\n`);
        errorCount++;
      }
    }

    console.log('');
    log(terminal.name, `Résultat: ${sentCount} créés, ${duplicateCount} doublons, ${errorCount} erreurs`);

    await device.disconnect();
    log(terminal.name, 'Déconnecté');

    return {
      terminal: terminal.name,
      total: allLogs.length,
      today: todayLogs.length,
      sent: sentCount,
      duplicates: duplicateCount,
      errors: errorCount,
    };

  } catch (error) {
    log(terminal.name, `Erreur: ${error.message}`, 'ERROR');
    try { await device.disconnect(); } catch (e) {}
    return {
      terminal: terminal.name,
      total: 0,
      today: 0,
      sent: 0,
      errors: 1,
      errorMessage: error.message,
    };
  }
}

async function main() {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  console.log('');
  console.log('╔' + '═'.repeat(70) + '╗');
  console.log('║' + '  SYNCHRONISATION DES POINTAGES DU JOUR'.padEnd(70) + '║');
  console.log('║' + `  ${today}`.padEnd(70) + '║');
  console.log('╚' + '═'.repeat(70) + '╝');

  const results = [];

  // Synchroniser chaque terminal
  for (const terminal of CONFIG.terminals) {
    const result = await syncTodayFromTerminal(terminal);
    results.push(result);
  }

  // Résumé final
  console.log('');
  console.log('╔' + '═'.repeat(70) + '╗');
  console.log('║' + '  RÉSUMÉ FINAL'.padEnd(70) + '║');
  console.log('╚' + '═'.repeat(70) + '╝');
  console.log('');

  let totalToday = 0;
  let totalSent = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;

  for (const r of results) {
    const status = r.errors === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${r.terminal}:`);
    console.log(`     - Pointages aujourd'hui: ${r.today}`);
    console.log(`     - Créés: ${r.sent}`);
    console.log(`     - Doublons ignorés: ${r.duplicates || 0}`);
    if (r.errors > 0) {
      console.log(`     - Erreurs: ${r.errors}`);
    }
    console.log('');

    totalToday += r.today || 0;
    totalSent += r.sent || 0;
    totalDuplicates += r.duplicates || 0;
    totalErrors += r.errors || 0;
  }

  console.log('  ─'.repeat(35));
  console.log(`  📊 TOTAL: ${totalToday} pointages du jour`);
  console.log(`  ✅ Créés: ${totalSent}`);
  console.log(`  🔄 Doublons: ${totalDuplicates}`);
  if (totalErrors > 0) {
    console.log(`  ❌ Erreurs: ${totalErrors}`);
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXÉCUTION
// ═══════════════════════════════════════════════════════════════════════════════

main().catch(error => {
  console.error('Erreur fatale:', error.message);
  process.exit(1);
});
