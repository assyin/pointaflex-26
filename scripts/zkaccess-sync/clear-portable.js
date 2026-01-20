/**
 * Supprime tous les pointages du terminal portable (192.168.16.176)
 */
const ZKTeco = require('zkteco-js');

async function clearTerminal() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  SUPPRESSION POINTAGES - TERMINAL PORTABLE');
  console.log('  IP: 192.168.16.176');
  console.log('══════════════════════════════════════════════════════════\n');

  // Timeout plus long pour la suppression
  const device = new ZKTeco('192.168.16.176', 4370, 30000, 30000);

  try {
    console.log('🔌 Connexion...');
    await device.createSocket();
    console.log('✅ Connecté\n');

    // Compter avant
    let countBefore = 0;
    try {
      const logsBefore = await device.getAttendances();
      countBefore = logsBefore?.data?.length || 0;
      console.log(`📊 Pointages actuels: ${countBefore}`);
    } catch (e) {
      console.log('⚠️  Impossible de compter les pointages');
    }

    if (countBefore === 0) {
      console.log('ℹ️  Terminal déjà vide');
      await device.disconnect();
      return;
    }

    // Supprimer
    console.log('🗑️  Suppression en cours (peut prendre 30s)...');

    try {
      await device.clearAttendanceLog();
      console.log('✅ Commande de suppression envoyée');
    } catch (e) {
      console.log('⚠️  Timeout lors de la suppression, mais elle peut avoir fonctionné');
    }

    // Attendre un peu
    console.log('⏳ Attente 5s...');
    await new Promise(r => setTimeout(r, 5000));

    // Reconnecter et vérifier
    console.log('🔌 Reconnexion pour vérification...');
    try {
      await device.disconnect();
    } catch (e) {}

    const device2 = new ZKTeco('192.168.16.176', 4370, 15000, 15000);
    try {
      await device2.createSocket();
      const logsAfter = await device2.getAttendances();
      const countAfter = logsAfter?.data?.length || 0;
      console.log(`\n📊 Pointages restants: ${countAfter}`);

      if (countAfter === 0) {
        console.log('\n✅ Terminal vidé avec succès!');
      } else if (countAfter < countBefore) {
        console.log(`\n⚠️  Partiellement vidé: ${countBefore - countAfter} supprimés`);
      } else {
        console.log('\n❌ La suppression n\'a pas fonctionné');
        console.log('   Essayez via le logiciel ZKAccess');
      }

      await device2.disconnect();
    } catch (e) {
      console.log('\n⚠️  Impossible de vérifier. Relancez le script.');
    }

  } catch (e) {
    console.error('❌ Erreur:', e.message);
    try { await device.disconnect(); } catch(x) {}
  }
}

clearTerminal();
