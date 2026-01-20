/**
 * SYNC TERMINAL PORTABLE - TEST (192.168.16.176)
 */

const ZKTeco = require('zkteco-js');
const axios = require('axios');

const CONFIG = {
  terminal: { name: 'PORTABLE', ip: '192.168.16.176', port: 4370, deviceId: 'A6F5211460142' },
  api: {
    baseUrl: 'http://127.0.0.1:3000/api/v1',
    webhookEndpoint: '/attendance/webhook/state',
    tenantId: '340a6c2a-160e-4f4b-917e-6eea8fd5ff2d',
  },
};

const STATE_TO_TYPE = { 0:'IN', 1:'OUT', 2:'OUT', 3:'IN', 4:'IN', 5:'OUT' };
const stateToType = (s) => STATE_TO_TYPE[s] || (s % 2 === 0 ? 'IN' : 'OUT');

function isToday(d) {
  const p = new Date(d), t = new Date();
  return p.getFullYear()===t.getFullYear() && p.getMonth()===t.getMonth() && p.getDate()===t.getDate();
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  SYNC TERMINAL PORTABLE (TEST) - 192.168.16.176');
  console.log('══════════════════════════════════════════════════════════\n');

  const device = new ZKTeco(CONFIG.terminal.ip, CONFIG.terminal.port, 10000, 10000);

  try {
    console.log('🔌 Connexion...');
    await device.createSocket();
    console.log('✅ Connecté\n');

    const logsData = await device.getAttendances();
    if (!logsData?.data?.length) { console.log('❌ Aucun pointage'); await device.disconnect(); return; }

    const todayLogs = logsData.data.filter(p => isToday(p.record_time || p.recordTime));
    console.log(`📊 ${todayLogs.length} pointages aujourd'hui\n`);

    if (!todayLogs.length) { await device.disconnect(); return; }

    todayLogs.sort((a,b) => new Date(a.record_time||a.recordTime) - new Date(b.record_time||b.recordTime));

    console.log('┌────────────┬────────────┬───────┬──────┐');
    console.log('│   Heure    │   User     │ State │ Type │');
    console.log('├────────────┼────────────┼───────┼──────┤');
    for (const p of todayLogs) {
      const time = new Date(p.record_time||p.recordTime).toLocaleTimeString('fr-FR');
      const user = (p.user_id||p.userId).toString().padEnd(10);
      const type = stateToType(p.state);
      console.log(`│ ${time} │ ${user} │   ${p.state}   │ ${type.padEnd(4)} │`);
    }
    console.log('└────────────┴────────────┴───────┴──────┘\n');

    console.log('📤 Envoi vers PointaFlex...\n');
    let created=0, dup=0, err=0;

    for (let i=0; i<todayLogs.length; i++) {
      const p = todayLogs[i];
      const userId = (p.user_id||p.userId).toString();
      process.stdout.write(`  [${i+1}/${todayLogs.length}] ${userId.padEnd(10)} → `);

      try {
        const res = await axios.post(`${CONFIG.api.baseUrl}${CONFIG.api.webhookEndpoint}`, {
          employeeId: userId,
          timestamp: new Date(p.record_time||p.recordTime).toISOString(),
          type: stateToType(p.state),
          terminalState: p.state,
          method: 'FINGERPRINT',
          source: 'TERMINAL',
        }, {
          headers: { 'Content-Type':'application/json', 'X-Tenant-Id':CONFIG.api.tenantId, 'X-Device-Id':CONFIG.terminal.deviceId },
          timeout: 60000,
        });

        if (res.data.status==='CREATED') { created++; console.log(`✅ ${res.data.anomaly||'OK'}`); }
        else if (res.data.status==='DUPLICATE') { dup++; console.log('🔄 Doublon'); }
        else console.log(`⚠️ ${res.data.status}`);
      } catch (e) { err++; console.log(`❌ ${(e.response?.data?.error||e.message).substring(0,40)}`); }
    }

    console.log(`\n📊 Résultat: ${created} créés, ${dup} doublons, ${err} erreurs\n`);
    await device.disconnect();
  } catch (e) { console.error('❌', e.message); try{await device.disconnect();}catch(x){} }
}

main();
