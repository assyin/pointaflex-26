/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VÉRIFICATION CONFIGURATION TERMINAL ZKTECO
 * Test du champ STATE pour confirmer que le terminal est bien configuré
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ZKTeco = require('zkteco-js');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const TERMINALS = {
  CP: {
    name: 'CP (Centre Principal)',
    ip: '192.168.16.174',
    port: 4370,
  },
  CIT: {
    name: 'CIT & GAB',
    ip: '192.168.16.175',
    port: 4370,
  },
};

// Mapping STATE → Description
const STATE_MAP = {
  0: { type: 'IN',  desc: 'Check-In (Arrivée)', symbol: '↑' },
  1: { type: 'OUT', desc: 'Check-Out (Départ)', symbol: '↓' },
  2: { type: 'OUT', desc: 'Break-Out (Sortie pause)', symbol: '⏸↓' },
  3: { type: 'IN',  desc: 'Break-In (Retour pause)', symbol: '⏸↑' },
  4: { type: 'IN',  desc: 'OT-In (Heures sup entrée)', symbol: '⏰↑' },
  5: { type: 'OUT', desc: 'OT-Out (Heures sup sortie)', symbol: '⏰↓' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function printHeader() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    VÉRIFICATION CONFIGURATION TERMINAUX                        ║');
  console.log('║                         Test du champ STATE                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
}

function printTerminalHeader(terminal) {
  console.log('┌───────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│  Terminal: ${terminal.name.padEnd(65)}│`);
  console.log(`│  IP: ${terminal.ip}:${terminal.port}                                                          │`.slice(0, 80) + '│');
  console.log('└───────────────────────────────────────────────────────────────────────────────┘');
}

function analyzeStateField(logs) {
  const analysis = {
    total: logs.length,
    withState: 0,
    withoutState: 0,
    stateValues: {},
    stateDistribution: {},
    hasValidConfig: false,
    samples: [],
  };

  for (const log of logs) {
    // Vérifier si le champ state existe et est défini
    if (log.state !== undefined && log.state !== null) {
      analysis.withState++;

      const stateVal = log.state;
      if (!analysis.stateValues[stateVal]) {
        analysis.stateValues[stateVal] = 0;
      }
      analysis.stateValues[stateVal]++;

      // Collecter des échantillons (max 5)
      if (analysis.samples.length < 5) {
        analysis.samples.push({
          userId: log.user_id || log.userId,
          time: log.record_time || log.recordTime,
          state: log.state,
          stateInfo: STATE_MAP[log.state] || { type: 'UNKNOWN', desc: 'Inconnu', symbol: '?' },
        });
      }
    } else {
      analysis.withoutState++;
    }
  }

  // Calculer distribution
  for (const [state, count] of Object.entries(analysis.stateValues)) {
    const info = STATE_MAP[state] || { type: 'UNKNOWN', desc: 'Inconnu' };
    analysis.stateDistribution[state] = {
      count,
      percentage: ((count / analysis.total) * 100).toFixed(1),
      type: info.type,
      desc: info.desc,
    };
  }

  // Déterminer si la config est valide
  // Valide si: au moins un log a un state ET on a des états 0 et 1
  analysis.hasValidConfig = analysis.withState > 0 &&
    (analysis.stateValues[0] > 0 || analysis.stateValues[1] > 0);

  return analysis;
}

function printAnalysis(analysis) {
  console.log('');
  console.log('  📊 ANALYSE DES POINTAGES');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Total pointages trouvés: ${analysis.total}`);
  console.log(`  Avec champ STATE:        ${analysis.withState} (${((analysis.withState/analysis.total)*100).toFixed(1)}%)`);
  console.log(`  Sans champ STATE:        ${analysis.withoutState}`);
  console.log('');

  if (analysis.withState > 0) {
    console.log('  📈 DISTRIBUTION DES ÉTATS');
    console.log('  ─────────────────────────────────────────');

    for (const [state, info] of Object.entries(analysis.stateDistribution)) {
      const stateInfo = STATE_MAP[state] || { symbol: '?', desc: 'Inconnu' };
      console.log(`  State ${state} ${stateInfo.symbol} : ${info.count} pointages (${info.percentage}%) - ${info.desc}`);
    }
    console.log('');

    console.log('  📋 ÉCHANTILLONS (derniers pointages)');
    console.log('  ─────────────────────────────────────────');
    for (const sample of analysis.samples) {
      const time = new Date(sample.time).toLocaleString('fr-FR');
      console.log(`  ${sample.stateInfo.symbol} User: ${sample.userId}, State: ${sample.state} (${sample.stateInfo.type}), Time: ${time}`);
    }
    console.log('');
  }

  // Verdict final
  console.log('  ═══════════════════════════════════════════');
  if (analysis.hasValidConfig) {
    console.log('  ✅ CONFIGURATION VALIDE');
    console.log('  Le terminal retourne correctement le champ STATE');
    console.log('  Les touches Arrivée/Départ sont fonctionnelles');
  } else if (analysis.withState === 0 && analysis.total > 0) {
    console.log('  ❌ CONFIGURATION INVALIDE');
    console.log('  Le terminal ne retourne PAS le champ STATE');
    console.log('  ');
    console.log('  Actions requises:');
    console.log('  1. Ouvrir ZKAccess sur le PC Windows');
    console.log('  2. Aller dans Système → Terminal → Gestion');
    console.log('  3. Sélectionner ce terminal et cliquer "Paramètres"');
    console.log('  4. Onglet "Déf.Touche de raccourci"');
    console.log('  5. Activer "Cycle de commutation" et cocher tous les jours');
    console.log('  6. Synchroniser le terminal');
  } else if (analysis.total === 0) {
    console.log('  ⚠️  AUCUN POINTAGE TROUVÉ');
    console.log('  Le terminal est vide ou n\'a pas de logs récents');
    console.log('  Effectuez un test: appuyez sur ↑ puis ↓ sur le terminal');
  }
  console.log('  ═══════════════════════════════════════════');
  console.log('');
}

async function checkTerminal(terminalKey) {
  const terminal = TERMINALS[terminalKey];
  if (!terminal) {
    console.error(`Terminal inconnu: ${terminalKey}`);
    return null;
  }

  printTerminalHeader(terminal);

  const device = new ZKTeco(terminal.ip, terminal.port, 10000, 10000);

  try {
    console.log('  🔌 Connexion en cours...');
    await device.createSocket();
    console.log('  ✅ Connecté au terminal');

    // Récupérer infos terminal
    console.log('  📡 Récupération des informations...');

    let deviceInfo = {};
    try {
      deviceInfo = await device.getInfo();
      console.log(`  📟 Modèle: ${deviceInfo.model || 'N/A'}`);
      console.log(`  🔢 S/N: ${deviceInfo.serialNumber || 'N/A'}`);
    } catch (e) {
      console.log('  ⚠️  Impossible de lire les infos terminal');
    }

    // Récupérer les pointages
    console.log('  📥 Récupération des pointages...');
    const logsData = await device.getAttendances();

    if (!logsData || !logsData.data) {
      console.log('  ⚠️  Aucune donnée de pointage');
      await device.disconnect();
      return { terminal: terminalKey, success: false, error: 'Pas de données' };
    }

    const logs = logsData.data;
    console.log(`  📊 ${logs.length} pointages trouvés`);

    // Analyser le champ STATE
    const analysis = analyzeStateField(logs);
    printAnalysis(analysis);

    await device.disconnect();
    console.log('  🔌 Déconnecté\n');

    return {
      terminal: terminalKey,
      name: terminal.name,
      ip: terminal.ip,
      success: true,
      hasValidConfig: analysis.hasValidConfig,
      totalLogs: analysis.total,
      logsWithState: analysis.withState,
      stateDistribution: analysis.stateDistribution,
    };

  } catch (error) {
    console.log(`  ❌ Erreur: ${error.message}`);
    console.log('');
    console.log('  Causes possibles:');
    console.log('  - Terminal éteint ou non accessible');
    console.log('  - Mauvaise adresse IP');
    console.log('  - Pare-feu bloquant le port 4370');
    console.log('  - Terminal occupé par une autre connexion');
    console.log('');

    try { await device.disconnect(); } catch (e) {}

    return {
      terminal: terminalKey,
      name: terminal.name,
      ip: terminal.ip,
      success: false,
      error: error.message,
    };
  }
}

async function checkAllTerminals() {
  printHeader();

  const results = [];

  for (const terminalKey of Object.keys(TERMINALS)) {
    const result = await checkTerminal(terminalKey);
    results.push(result);

    // Pause entre les terminaux
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Résumé final
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              RÉSUMÉ FINAL                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  let allValid = true;

  for (const result of results) {
    if (!result) continue;

    const status = result.success
      ? (result.hasValidConfig ? '✅ PRÊT' : '⚠️  À CONFIGURER')
      : '❌ ERREUR';

    console.log(`  ${result.terminal.padEnd(5)} (${result.ip}): ${status}`);

    if (result.success && result.hasValidConfig) {
      console.log(`        └─ ${result.logsWithState}/${result.totalLogs} pointages avec STATE`);
    } else if (result.success && !result.hasValidConfig) {
      console.log(`        └─ Configuration "Cycle de commutation" requise`);
      allValid = false;
    } else {
      console.log(`        └─ ${result.error}`);
      allValid = false;
    }
  }

  console.log('');
  if (allValid) {
    console.log('  🎉 TOUS LES TERMINAUX SONT CORRECTEMENT CONFIGURÉS');
    console.log('  Vous pouvez lancer la synchronisation avec sync-terminal-state.js');
  } else {
    console.log('  ⚠️  CERTAINS TERMINAUX NÉCESSITENT UNE ACTION');
    console.log('  Consultez les détails ci-dessus pour chaque terminal');
  }
  console.log('');

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

if (args.length === 0) {
  // Vérifier tous les terminaux
  checkAllTerminals().catch(console.error);
} else if (args[0] === 'CP' || args[0] === 'CIT') {
  // Vérifier un terminal spécifique
  checkTerminal(args[0]).catch(console.error);
} else if (args[0] === '--help' || args[0] === '-h') {
  console.log(`
Usage: node check-terminal-config.js [TERMINAL]

Vérifie si les terminaux ZKTeco sont configurés pour retourner le champ STATE.

Arguments:
  (aucun)   Vérifie tous les terminaux (CP et CIT)
  CP        Vérifie uniquement le terminal CP (192.168.16.174)
  CIT       Vérifie uniquement le terminal CIT (192.168.16.175)
  --help    Affiche cette aide

Exemples:
  node check-terminal-config.js          # Vérifie tous
  node check-terminal-config.js CP       # Vérifie CP uniquement
  node check-terminal-config.js CIT      # Vérifie CIT uniquement
`);
} else {
  console.error(`Terminal inconnu: ${args[0]}`);
  console.log('Utilisez: CP, CIT, ou aucun argument pour tous');
  process.exit(1);
}
