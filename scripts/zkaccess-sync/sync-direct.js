/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYNCHRONISATION DIRECTE - TERMINAL ZKTECO → POINTAFLEX
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
  pointaflex: {
    apiUrl: 'http://172.17.112.163:3000/api/v1/attendance/webhook/fast',
    deviceId: 'A6F5211460142',
    tenantId: '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
    apiKey: 'pk_b24ffd32d09d019b6672d8d6c98a1ed36355fa8e48f3f70440e1692d8cc3d0f2',
  },
  sync: {
    intervalSeconds: 30,
    lastSyncFile: './last_sync_direct.json',
    logFile: './sync_direct.log',
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
  return { lastTime: null, lastUserSn: 0 };
}

function saveLastSyncInfo(time, userSn) {
  try {
    fs.writeFileSync(CONFIG.sync.lastSyncFile, JSON.stringify({
      lastTime: time,
      lastUserSn: userSn,
      updatedAt: new Date().toISOString(),
    }, null, 2));
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTALLATION DE LA LIBRAIRIE
// ═══════════════════════════════════════════════════════════════════════════════

let ZK;
try {
  ZK = require('node-zklib');
} catch (e) {
  log('Installation de node-zklib...', 'INFO');
  try {
    execSync('npm install node-zklib', { stdio: 'inherit' });
    ZK = require('node-zklib');
  } catch (e2) {
    log(`Erreur installation: ${e2.message}`, 'ERROR');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNEXION AU TERMINAL
// ═══════════════════════════════════════════════════════════════════════════════

async function syncOnce() {
  let zkInstance = null;

  try {
    const syncInfo = getLastSyncInfo();
    const lastUserSn = syncInfo.lastUserSn || 0;
    const lastTime = syncInfo.lastTime ? new Date(syncInfo.lastTime) : null;

    const minDate = new Date();
    minDate.setDate(minDate.getDate() - CONFIG.sync.daysBack);
    const filterDate = lastTime && lastTime > minDate ? lastTime : minDate;

    log(`Démarrage sync (lastUserSn: ${lastUserSn}, depuis: ${filterDate.toISOString().split('T')[0]})...`);

    // Connexion au terminal
    zkInstance = new ZK(CONFIG.terminal.ip, CONFIG.terminal.port, 10000, 4000);
    log(`Connexion au terminal ${CONFIG.terminal.ip}:${CONFIG.terminal.port}...`);
    await zkInstance.createSocket();
    log('✅ Connecté au terminal', 'SUCCESS');

    // Récupérer les utilisateurs
    log('Récupération des utilisateurs...');
    const usersData = await zkInstance.getUsers();
    const users = {};
    if (usersData && usersData.data) {
      usersData.data.forEach(u => {
        users[u.userId] = u.name || '';
      });
    }
    log(`👥 ${Object.keys(users).length} utilisateurs`);

    // Récupérer les pointages
    log('Récupération des pointages...');
    let logsData;
    try {
      logsData = await zkInstance.getAttendances();
    } catch (e) {
      log(`⚠️ Terminal vide ou erreur de lecture. Attente de nouveaux pointages...`);
      await zkInstance.disconnect().catch(() => {});
      return;
    }

    if (!logsData || !logsData.data || logsData.data.length === 0) {
      log('⚠️ Aucun pointage dans le terminal.');
      await zkInstance.disconnect().catch(() => {});
      return;
    }

    log(`📥 ${logsData.data.length} pointages dans le terminal`);

    // DEBUG: Afficher les 5 derniers pointages pour diagnostic
    const lastFivePunches = logsData.data.slice(-5);
    log(`🔍 DEBUG - 5 derniers pointages du terminal:`);
    lastFivePunches.forEach((p, i) => {
      const userId = p.deviceUserId || p.odId || p.uid || p.userId;
      log(`   [${i+1}] userSn=${p.userSn}, User=${userId}, Time=${p.recordTime}`);
    });
    log(`🔍 DEBUG - lastUserSn: ${lastUserSn}, filterDate: ${filterDate.toISOString()}`);

    // ═══════════════════════════════════════════════════════════════════════════════
    // GROUPER TOUS LES POINTAGES pour la détection automatique IN/OUT
    // ═══════════════════════════════════════════════════════════════════════════════
    const punchesByUserDay = {};

    for (const att of logsData.data) {
      if (!att.recordTime) continue;
      const userId = String(att.deviceUserId || att.odId || att.uid || att.userId);
      const attTime = new Date(att.recordTime);
      const dayKey = `${userId}_${attTime.toISOString().split('T')[0]}`;

      if (!punchesByUserDay[dayKey]) {
        punchesByUserDay[dayKey] = [];
      }
      punchesByUserDay[dayKey].push(att);
    }

    // Trier chaque groupe par heure
    for (const key of Object.keys(punchesByUserDay)) {
      punchesByUserDay[key].sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));
    }

    // Filtrer par userSn pour ne traiter que les NOUVEAUX pointages
    const newLogs = logsData.data.filter(att => {
      if (!att.recordTime) return false;
      const attUserSn = att.userSn || 0;
      const attTime = new Date(att.recordTime);

      // Si lastUserSn = 0, c'est la première sync - prendre TOUS les pointages récents
      if (lastUserSn === 0) {
        return attTime >= filterDate;
      }

      // Sinon, utiliser userSn (plus fiable que le timestamp)
      return attUserSn > lastUserSn;
    });

    if (newLogs.length === 0) {
      // Vérifier si des pointages récents existent dans le terminal mais ont déjà été sync via terminal push
      const terminalMaxUserSn = Math.max(...logsData.data.map(a => a.userSn || 0));
      if (terminalMaxUserSn > lastUserSn) {
        log(`📡 ${terminalMaxUserSn - lastUserSn} pointage(s) déjà synchronisé(s) via terminal push (userSn ${lastUserSn + 1} → ${terminalMaxUserSn})`);
        saveLastSyncInfo(new Date().toISOString(), terminalMaxUserSn);
      } else {
        log('Aucun nouveau pointage à synchroniser.');
      }
      await zkInstance.disconnect();
      return;
    }

    // Trier par userSn pour garantir l'ordre
    newLogs.sort((a, b) => (a.userSn || 0) - (b.userSn || 0));

    log(`📤 ${newLogs.length} nouveau(x) pointage(s) à envoyer`);

    // Envoyer à PointaFlex
    let successCount = 0;
    let maxTime = filterDate;
    let maxUserSn = lastUserSn;

    // Cache pour stocker le nombre de pointages par utilisateur/jour dans PointaFlex
    const pointaflexPunchCount = {};

    for (const att of newLogs) {
      const userId = String(att.deviceUserId || att.odId || att.uid || att.userId);
      const userName = users[userId] || '';
      const attTime = new Date(att.recordTime);
      const dayStr = attTime.toISOString().split('T')[0];
      const cacheKey = `${userId}_${dayStr}`;

      // DEBUG: Afficher toutes les propriétés du pointage
      log(`DEBUG: Pointage brut: ${JSON.stringify(att)}`, 'DEBUG');

      // ═══════════════════════════════════════════════════════════════════════════════
      // DÉTECTION AUTOMATIQUE IN/OUT basée sur PointaFlex
      // ═══════════════════════════════════════════════════════════════════════════════
      let forceType = null;

      if (pointaflexPunchCount[cacheKey] === undefined) {
        try {
          const countResponse = await axios.get(
            `${CONFIG.pointaflex.apiUrl.replace('/webhook/fast', '')}/count`,
            {
              params: {
                employeeId: userId,
                date: dayStr,
              },
              headers: {
                'X-API-Key': CONFIG.pointaflex.apiKey,
                'X-Tenant-Id': CONFIG.pointaflex.tenantId,
              },
              timeout: 10000,
            }
          );
          pointaflexPunchCount[cacheKey] = countResponse.data.count || 0;
          log(`📊 PointaFlex: ${pointaflexPunchCount[cacheKey]} pointage(s) existant(s) pour ${userId} le ${dayStr}`);
        } catch (e) {
          log(`⚠️ Impossible de récupérer le count PointaFlex: ${e.message}`, 'WARN');
          pointaflexPunchCount[cacheKey] = 0;
        }
      }

      // Déterminer IN/OUT basé sur le nombre de pointages existants
      const existingCount = pointaflexPunchCount[cacheKey];
      forceType = existingCount % 2 === 0 ? 'IN' : 'OUT';

      // Incrémenter le cache pour le prochain pointage
      pointaflexPunchCount[cacheKey]++;

      log(`Envoi: User=${userId} (${userName}), Existants=${existingCount}, Type=${forceType}, Time=${attTime.toISOString()}`);

      try {
        const response = await axios.post(
          CONFIG.pointaflex.apiUrl,
          {
            employeeId: userId,
            timestamp: attTime.toISOString(),
            type: forceType,
            method: 'FINGERPRINT',
            rawData: {
              userSn: att.userSn,
              deviceUserId: userId,
              recordTime: att.recordTime,
              ip: CONFIG.terminal.ip,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': CONFIG.pointaflex.apiKey,
              'X-Tenant-Id': CONFIG.pointaflex.tenantId,
              'X-Device-Id': CONFIG.pointaflex.deviceId,
            },
            timeout: 30000,
          }
        );

        if (response.status === 200 || response.status === 201) {
          log(`✅ Envoyé: userSn=${att.userSn}, ${userId}`, 'SUCCESS');
          successCount++;
        }
      } catch (e) {
        const errorMsg = e.response?.data?.message || e.message;
        log(`❌ Erreur envoi ${userId}: ${errorMsg}`, 'ERROR');
      }

      if (attTime > maxTime) maxTime = attTime;
      if ((att.userSn || 0) > maxUserSn) maxUserSn = att.userSn;
    }

    // Sauvegarder l'état
    saveLastSyncInfo(maxTime.toISOString(), maxUserSn);
    log(`💾 Sauvegardé: lastUserSn=${maxUserSn}`);
    log(`📊 Résultat: ${successCount}/${newLogs.length} envoyés`);

    await zkInstance.disconnect();
    log('Déconnecté du terminal');

  } catch (error) {
    log(`❌ Erreur sync: ${error.message}`, 'ERROR');
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
      } catch (e) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUCLE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('   SYNCHRONISATION DIRECTE - ZKTECO → POINTAFLEX');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  log(`📍 Terminal: ${CONFIG.terminal.ip}:${CONFIG.terminal.port}`);
  log(`🔗 API: ${CONFIG.pointaflex.apiUrl}`);
  log(`⏱️  Intervalle: ${CONFIG.sync.intervalSeconds}s`);

  log('\n🚀 Démarrage...');
  console.log('───────────────────────────────────────────────────────────────────');

  // Première sync immédiate
  await syncOnce();
  log('✅ Script actif. Ctrl+C pour arrêter.\n');

  // Boucle de synchronisation
  setInterval(async () => {
    log('🔄 Synchronisation...');
    await syncOnce();
  }, CONFIG.sync.intervalSeconds * 1000);
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  log('\n🛑 Arrêt...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  log(`⚠️ Promise rejetée (ignorée): ${reason}`, 'WARN');
});

main().catch(e => {
  log(`❌ Erreur fatale: ${e.message}`, 'ERROR');
  process.exit(1);
});
