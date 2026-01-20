/**
 * SCRIPT DE DIAGNOSTIC - Verifier si le terminal supporte le champ STATE (IN/OUT)
 */

const { execSync } = require('child_process');

// Installation de la librairie si necessaire
let ZK;
try {
  ZK = require('node-zklib');
} catch (e) {
  console.log('Installation de node-zklib...');
  execSync('npm install node-zklib', { stdio: 'inherit' });
  ZK = require('node-zklib');
}

const TERMINAL_IP = '192.168.16.174';  // Terminal CP
const TERMINAL_PORT = 4370;

async function checkTerminalState() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   DIAGNOSTIC TERMINAL ZKTECO - DETECTION CHAMP STATE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let zkInstance = null;

  try {
    zkInstance = new ZK(TERMINAL_IP, TERMINAL_PORT, 10000, 4000);
    console.log(`Connexion au terminal ${TERMINAL_IP}:${TERMINAL_PORT}...`);
    await zkInstance.createSocket();
    console.log('✅ Connecte au terminal\n');

    // Recuperer les infos du terminal
    console.log('📋 INFORMATIONS DU TERMINAL:');
    console.log('─────────────────────────────');
    try {
      const info = await zkInstance.getInfo();
      console.log('Info:', JSON.stringify(info, null, 2));
    } catch (e) {
      console.log('Info non disponible');
    }

    // Recuperer les 5 derniers pointages avec TOUS les champs
    console.log('\n📊 5 DERNIERS POINTAGES (TOUS LES CHAMPS):');
    console.log('─────────────────────────────────────────────');

    const logsData = await zkInstance.getAttendances();

    if (logsData && logsData.data && logsData.data.length > 0) {
      const lastFive = logsData.data.slice(-5);

      lastFive.forEach((punch, i) => {
        console.log(`\n[Pointage ${i + 1}]`);
        console.log('Tous les champs:', JSON.stringify(punch, null, 2));

        // Verifier specifiquement le champ state
        console.log('\n🔍 Analyse des champs importants:');
        console.log(`   - state: ${punch.state !== undefined ? punch.state : '❌ NON PRESENT'}`);
        console.log(`   - status: ${punch.status !== undefined ? punch.status : '❌ NON PRESENT'}`);
        console.log(`   - type: ${punch.type !== undefined ? punch.type : '❌ NON PRESENT'}`);
        console.log(`   - inOutState: ${punch.inOutState !== undefined ? punch.inOutState : '❌ NON PRESENT'}`);
        console.log(`   - verifyType: ${punch.verifyType !== undefined ? punch.verifyType : '❌ NON PRESENT'}`);
      });

      // Resume
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('   RESULTAT DU DIAGNOSTIC');
      console.log('═══════════════════════════════════════════════════════════════');

      const sample = lastFive[0];
      const hasState = sample.state !== undefined;
      const hasStatus = sample.status !== undefined;
      const hasType = sample.type !== undefined;
      const hasInOutState = sample.inOutState !== undefined;

      if (hasState || hasStatus || hasType || hasInOutState) {
        console.log('\n✅ BONNE NOUVELLE! Le terminal SUPPORTE le champ IN/OUT!');
        console.log('\nChamps disponibles:');
        if (hasState) console.log(`   - state: OUI (valeur exemple: ${sample.state})`);
        if (hasStatus) console.log(`   - status: OUI (valeur exemple: ${sample.status})`);
        if (hasType) console.log(`   - type: OUI (valeur exemple: ${sample.type})`);
        if (hasInOutState) console.log(`   - inOutState: OUI (valeur exemple: ${sample.inOutState})`);

        console.log('\n📌 INTERPRETATION STANDARD ZKTECO:');
        console.log('   State 0 = Check-In (ENTREE)');
        console.log('   State 1 = Check-Out (SORTIE)');
        console.log('   State 2 = Break-Out (Pause sortie)');
        console.log('   State 3 = Break-In (Pause retour)');
        console.log('   State 4 = OT-In (Heures sup entree)');
        console.log('   State 5 = OT-Out (Heures sup sortie)');
      } else {
        console.log('\n⚠️ Le terminal ne renvoie PAS de champ state/status.');
        console.log('\nOptions:');
        console.log('   1. Verifier la configuration du terminal (activer les touches de fonction F1/F2)');
        console.log('   2. Le terminal peut necessiter une mise a jour firmware');
        console.log('   3. Utiliser un terminal plus recent qui supporte cette fonctionnalite');
      }

    } else {
      console.log('⚠️ Aucun pointage trouve dans le terminal');
    }

    await zkInstance.disconnect();
    console.log('\n✅ Deconnecte du terminal');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (zkInstance) {
      try { await zkInstance.disconnect(); } catch (e) {}
    }
  }
}

checkTerminalState();
