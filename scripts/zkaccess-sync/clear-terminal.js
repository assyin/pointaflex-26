/**
 * Script pour effacer les pointages du terminal ZKTeco
 */

const ZK = require('node-zklib');

const CONFIG = {
  terminal: {
    ip: '192.168.16.176',
    port: 4370,
  },
};

async function clearAttendance() {
  let zkInstance = null;

  try {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('   EFFACEMENT DES POINTAGES - TERMINAL ZKTECO');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

    zkInstance = new ZK(CONFIG.terminal.ip, CONFIG.terminal.port, 10000, 4000);

    console.log(`📍 Connexion au terminal ${CONFIG.terminal.ip}:${CONFIG.terminal.port}...`);
    await zkInstance.createSocket();
    console.log('✅ Connecté');

    // Vérifier le nombre de pointages avant suppression
    const logsBefore = await zkInstance.getAttendances();
    console.log(`📥 Pointages actuels: ${logsBefore?.data?.length || 0}`);

    // Effacer les pointages
    console.log('🗑️  Suppression des pointages en cours...');
    await zkInstance.clearAttendanceLog();
    console.log('✅ Pointages effacés');

    // Vérifier après suppression (avec gestion erreur terminal vide)
    try {
      const logsAfter = await zkInstance.getAttendances();
      console.log(`📥 Pointages après suppression: ${logsAfter?.data?.length || 0}`);
    } catch (e) {
      console.log('📥 Pointages après suppression: 0 (terminal vide)');
    }

    try {
      await zkInstance.disconnect();
      console.log('✅ Déconnecté');
    } catch (e) {
      // Ignore disconnect errors
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('   TERMINÉ - Pointages effacés du terminal');
    console.log('═══════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    if (zkInstance) {
      try { await zkInstance.disconnect(); } catch (e) {}
    }
    process.exit(1);
  }
}

clearAttendance();
