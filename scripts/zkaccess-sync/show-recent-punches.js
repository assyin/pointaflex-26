/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AFFICHAGE DES DERNIERS POINTAGES AVEC ÉTAT
 * Affiche les N derniers pointages d'un terminal avec leur state
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ZKTeco = require('zkteco-js');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const TERMINALS = {
  CP: { name: 'CP (Centre Principal)', ip: '192.168.16.174', port: 4370 },
  CIT: { name: 'CIT & GAB', ip: '192.168.16.175', port: 4370 },
};

const STATE_MAP = {
  0: { type: 'IN',  desc: 'Arrivée',        color: '\x1b[32m', symbol: '↑' },  // Vert
  1: { type: 'OUT', desc: 'Départ',         color: '\x1b[31m', symbol: '↓' },  // Rouge
  2: { type: 'OUT', desc: 'Sortie pause',   color: '\x1b[33m', symbol: '⏸↓' }, // Jaune
  3: { type: 'IN',  desc: 'Retour pause',   color: '\x1b[33m', symbol: '⏸↑' }, // Jaune
  4: { type: 'IN',  desc: 'HS entrée',      color: '\x1b[36m', symbol: '⏰↑' }, // Cyan
  5: { type: 'OUT', desc: 'HS sortie',      color: '\x1b[36m', symbol: '⏰↓' }, // Cyan
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getStateInfo(state) {
  return STATE_MAP[state] || {
    type: 'UNK',
    desc: `Inconnu (${state})`,
    color: '\x1b[90m',
    symbol: '?',
  };
}

async function showRecentPunches(terminalKey, count = 20) {
  const terminal = TERMINALS[terminalKey];
  if (!terminal) {
    console.error(`Terminal inconnu: ${terminalKey}`);
    return;
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║  DERNIERS POINTAGES - ${terminal.name.padEnd(54)}║`);
  console.log(`║  IP: ${terminal.ip}:${terminal.port}                                                          ║`.slice(0, 80) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const device = new ZKTeco(terminal.ip, terminal.port, 10000, 10000);

  try {
    console.log('🔌 Connexion...');
    await device.createSocket();
    console.log('✅ Connecté');
    console.log('');

    // Récupérer les pointages
    console.log('📥 Récupération des pointages...');
    const logsData = await device.getAttendances();

    if (!logsData || !logsData.data || logsData.data.length === 0) {
      console.log('⚠️  Aucun pointage trouvé dans le terminal');
      await device.disconnect();
      return;
    }

    const logs = logsData.data;
    console.log(`📊 ${logs.length} pointages au total\n`);

    // Trier par date décroissante et prendre les N derniers
    logs.sort((a, b) => {
      const timeA = new Date(a.record_time || a.recordTime).getTime();
      const timeB = new Date(b.record_time || b.recordTime).getTime();
      return timeB - timeA;
    });

    const recentLogs = logs.slice(0, count);

    // Afficher l'en-tête du tableau
    console.log('┌──────┬─────────────────────────┬────────────┬───────┬──────────────────────┐');
    console.log('│  #   │      Date/Heure         │   User ID  │ State │     Description      │');
    console.log('├──────┼─────────────────────────┼────────────┼───────┼──────────────────────┤');

    // Statistiques
    let inCount = 0;
    let outCount = 0;
    let unknownCount = 0;

    // Afficher les pointages
    for (let i = 0; i < recentLogs.length; i++) {
      const log = recentLogs[i];
      const userId = (log.user_id || log.userId || 'N/A').toString().padEnd(10);
      const time = formatDate(log.record_time || log.recordTime);
      const state = log.state;
      const stateInfo = getStateInfo(state);

      // Compter
      if (stateInfo.type === 'IN') inCount++;
      else if (stateInfo.type === 'OUT') outCount++;
      else unknownCount++;

      // Couleur selon le state
      const stateStr = state !== undefined ? state.toString().padStart(2) : 'N/A';
      const descStr = `${stateInfo.symbol} ${stateInfo.desc}`.padEnd(20);

      // Afficher la ligne
      const num = (i + 1).toString().padStart(4);
      console.log(
        `│ ${num} │ ${time} │ ${userId} │ ${stateInfo.color}${BOLD}  ${stateStr}  ${RESET}│ ${stateInfo.color}${descStr}${RESET}│`
      );
    }

    console.log('└──────┴─────────────────────────┴────────────┴───────┴──────────────────────┘');
    console.log('');

    // Résumé
    console.log('📈 RÉSUMÉ DES ' + count + ' DERNIERS POINTAGES:');
    console.log(`   ${STATE_MAP[0].color}↑ IN (Arrivées):  ${inCount}${RESET}`);
    console.log(`   ${STATE_MAP[1].color}↓ OUT (Départs): ${outCount}${RESET}`);
    if (unknownCount > 0) {
      console.log(`   ❓ Inconnus:      ${unknownCount}`);
    }
    console.log('');

    // Verdict
    if (inCount > 0 && outCount > 0) {
      console.log('✅ TERMINAL BIEN CONFIGURÉ');
      console.log('   Les états IN (0) et OUT (1) sont présents');
      console.log('   Le champ STATE est correctement renvoyé');
    } else if (inCount === 0 && outCount === 0 && logs.length > 0) {
      console.log('❌ CONFIGURATION REQUISE');
      console.log('   Aucun état IN/OUT trouvé');
      console.log('   Activez "Cycle de commutation" dans ZKAccess');
    } else {
      console.log('⚠️  DONNÉES INSUFFISANTES');
      console.log('   Effectuez quelques pointages test (↑ puis ↓)');
    }
    console.log('');

    await device.disconnect();
    console.log('🔌 Déconnecté');

  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    try { await device.disconnect(); } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const terminalArg = args[0] || 'CP';
const countArg = parseInt(args[1]) || 20;

if (terminalArg === '--help' || terminalArg === '-h') {
  console.log(`
Usage: node show-recent-punches.js [TERMINAL] [COUNT]

Affiche les derniers pointages d'un terminal avec leurs états.

Arguments:
  TERMINAL  CP ou CIT (défaut: CP)
  COUNT     Nombre de pointages à afficher (défaut: 20)

Exemples:
  node show-recent-punches.js CP      # 20 derniers pointages de CP
  node show-recent-punches.js CIT 50  # 50 derniers pointages de CIT
  node show-recent-punches.js CP 10   # 10 derniers pointages de CP
`);
  process.exit(0);
}

if (!TERMINALS[terminalArg]) {
  console.error(`Terminal inconnu: ${terminalArg}`);
  console.log('Utilisez: CP ou CIT');
  process.exit(1);
}

showRecentPunches(terminalArg, countArg).catch(console.error);
