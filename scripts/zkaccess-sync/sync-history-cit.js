/**
 * SYNC HISTORIQUE TERMINAL CIT - 192.168.16.175
 * Récupère les pointages d'une date spécifique
 *
 * Usage: node sync-history-cit.js [DATE]
 * Exemple: node sync-history-cit.js 2026-01-16
 */

const ZKTeco = require('zkteco-js');
const axios = require('axios');

const CONFIG = {
  terminal: {
    name: 'CIT',
    ip: '192.168.16.175',
    port: 4370,
    deviceId: 'EJB8241100244'
  },
  api: {
    baseUrl: 'http://127.0.0.1:3000/api/v1',
    webhookEndpoint: '/attendance/webhook/state',
    tenantId: '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
  },
  connectionTimeout: 120000,  // 2 minutes pour gros volumes
  inactivityTimeout: 120000,
  maxRetries: 3,
};

const STATE_TO_TYPE = { 0:'IN', 1:'OUT', 2:'OUT', 3:'IN', 4:'IN', 5:'OUT' };
const stateToType = (s) => STATE_TO_TYPE[s] || (s % 2 === 0 ? 'IN' : 'OUT');

// Vérifier si une date correspond à la date cible
function isTargetDate(recordDate, targetDate) {
  const d = new Date(recordDate);
  return d.getFullYear() === targetDate.getFullYear()
    && d.getMonth() === targetDate.getMonth()
    && d.getDate() === targetDate.getDate();
}

// Fonction pour récupérer les logs avec retry
async function getAttendancesWithRetry(device, retries = CONFIG.maxRetries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   Tentative ${attempt}/${retries}...`);
      const logsData = await device.getAttendances();

      if (!logsData || logsData === null) {
        console.log('   ⚠️ Réponse null reçue');
        if (attempt < retries) {
          console.log('   ⏳ Attente 5s avant retry...');
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        return null;
      }

      return logsData;
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
      if (attempt < retries) {
        console.log('   ⏳ Attente 5s avant retry...');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  return null;
}

async function main() {
  // Récupérer la date depuis les arguments ou utiliser 16/01/2026 par défaut
  const dateArg = process.argv[2] || '2026-01-16';
  const targetDate = new Date(dateArg);

  if (isNaN(targetDate.getTime())) {
    console.error('❌ Date invalide. Format attendu: YYYY-MM-DD');
    process.exit(1);
  }

  const dateStr = targetDate.toLocaleDateString('fr-FR');

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  SYNC HISTORIQUE TERMINAL CIT - ${dateStr}`);
  console.log('══════════════════════════════════════════════════════════\n');
  console.log(`📍 Terminal: ${CONFIG.terminal.ip}`);
  console.log(`📅 Date cible: ${dateStr}\n`);

  const device = new ZKTeco(CONFIG.terminal.ip, CONFIG.terminal.port, CONFIG.connectionTimeout, CONFIG.inactivityTimeout);

  try {
    console.log('🔌 Connexion au terminal CIT...');
    await device.createSocket();
    console.log('✅ Connecté\n');

    console.log('📥 Récupération de tous les pointages (timeout: 2min)...');
    const logsData = await getAttendancesWithRetry(device);

    if (!logsData || !logsData.data || !Array.isArray(logsData.data)) {
      console.log('❌ Impossible de récupérer les pointages');
      console.log('💡 Le terminal a peut-être trop de logs ou est occupé.');
      try { await device.disconnect(); } catch(x) {}
      return;
    }

    console.log(`✅ ${logsData.data.length} pointages totaux récupérés\n`);

    // Filtrer par date cible
    const targetLogs = logsData.data.filter(p => isTargetDate(p.record_time || p.recordTime, targetDate));
    console.log(`📊 ${targetLogs.length} pointages pour le ${dateStr}\n`);

    if (!targetLogs.length) {
      console.log('⚠️ Aucun pointage trouvé pour cette date dans le terminal.');
      console.log('   Les logs ont peut-être été effacés du terminal.');
      try { await device.disconnect(); } catch(x) {}
      return;
    }

    // Trier par heure
    targetLogs.sort((a,b) => new Date(a.record_time||a.recordTime) - new Date(b.record_time||b.recordTime));

    // Afficher le tableau
    console.log('┌────────────┬────────────┬───────┬──────┐');
    console.log('│   Heure    │   User     │ State │ Type │');
    console.log('├────────────┼────────────┼───────┼──────┤');
    for (const p of targetLogs) {
      const time = new Date(p.record_time||p.recordTime).toLocaleTimeString('fr-FR');
      const user = (p.user_id||p.userId).toString().padEnd(10);
      const type = stateToType(p.state);
      console.log(`│ ${time} │ ${user} │   ${p.state}   │ ${type.padEnd(4)} │`);
    }
    console.log('└────────────┴────────────┴───────┴──────┘\n');

    console.log('📤 Envoi vers PointaFlex...\n');
    let created=0, dup=0, err=0;

    for (let i=0; i<targetLogs.length; i++) {
      const p = targetLogs[i];
      const userId = (p.user_id||p.userId).toString();
      process.stdout.write(`  [${i+1}/${targetLogs.length}] ${userId.padEnd(10)} → `);

      try {
        const res = await axios.post(`${CONFIG.api.baseUrl}${CONFIG.api.webhookEndpoint}`, {
          employeeId: userId,
          timestamp: new Date(p.record_time||p.recordTime).toISOString(),
          type: stateToType(p.state),
          terminalState: p.state,
          method: 'FINGERPRINT',
          source: 'TERMINAL',
        }, {
          headers: {
            'Content-Type':'application/json',
            'X-Tenant-Id': CONFIG.api.tenantId,
            'X-Device-Id': CONFIG.terminal.deviceId
          },
          timeout: 60000,
        });

        if (res.data.status==='CREATED') { created++; console.log(`✅ ${res.data.anomaly||'OK'}`); }
        else if (res.data.status==='DEBOUNCE_BLOCKED') { dup++; console.log('🔄 Anti-rebond'); }
        else if (res.data.status==='DUPLICATE') { dup++; console.log('🔄 Doublon'); }
        else console.log(`⚠️ ${res.data.status}`);
      } catch (e) {
        err++;
        const errMsg = e.response?.data?.message || e.response?.data?.error || e.message;
        console.log(`❌ ${errMsg.substring(0,50)}`);
      }
    }

    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`📊 RÉSULTAT SYNC ${dateStr}:`);
    console.log(`   ✅ Créés: ${created}`);
    console.log(`   🔄 Doublons: ${dup}`);
    console.log(`   ❌ Erreurs: ${err}`);
    console.log(`══════════════════════════════════════════════════════════\n`);

    try { await device.disconnect(); } catch(x) {}

  } catch (e) {
    console.error('❌ Erreur:', e.message);
    console.log('\n💡 Si le problème persiste:');
    console.log('   1. Vérifiez que le terminal CIT est accessible (ping 192.168.16.175)');
    console.log('   2. Redémarrez le terminal');
    try { await device.disconnect(); } catch(x) {}
  }
}

main();
