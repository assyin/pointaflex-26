/**
 * Vérifie le contenu du terminal portable
 */
const ZKTeco = require('zkteco-js');

async function check() {
  console.log('\n🔍 Vérification terminal portable (192.168.16.176)...\n');

  const device = new ZKTeco('192.168.16.176', 4370, 20000, 20000);

  try {
    await device.createSocket();
    console.log('✅ Connecté');

    const logs = await device.getAttendances();
    const count = logs?.data?.length || 0;

    console.log(`📊 Pointages dans le terminal: ${count}`);

    if (count > 0 && count <= 20) {
      console.log('\n📋 Liste:');
      for (const p of logs.data) {
        const time = new Date(p.record_time || p.recordTime).toLocaleString('fr-FR');
        console.log(`   - User ${p.user_id || p.userId}, State ${p.state}, ${time}`);
      }
    }

    await device.disconnect();
  } catch (e) {
    console.log('❌ Erreur:', e.message);
  }

  process.exit(0);
}

check();
