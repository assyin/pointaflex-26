# Guide ZKAccess → PointaFlex : Configuration Webhook

## Votre Terminal

| Paramètre | Valeur |
|-----------|--------|
| **Nom** | pointeuse |
| **N° Série** | A6F5211460142 |
| **Modèle** | K40 |
| **Firmware** | Ver 8.0.4.2-2 |
| **Connexion** | TCP/IP |
| **Utilisateurs** | 7 enregistrés |

---

## Étape 1 : Vérifier la Connexion du Terminal

### 1.1 Confirmer que le terminal est bien connecté

✅ **Déjà fait** - Votre terminal "pointeuse" affiche une coche verte (✓) dans la colonne "Ac." ce qui indique qu'il est actif et connecté.

### 1.2 Synchroniser les données

1. Sélectionnez votre terminal **"pointeuse"** (ligne 17) en cochant la case
2. Cliquez sur le bouton **"SYNC"** dans la barre d'outils
3. Attendez que la synchronisation soit terminée

---

## Étape 2 : Configurer la Récupération Automatique des Événements

### 2.1 Activer le monitoring temps réel

1. Cliquez sur l'onglet **"Contrôle d'accès"** dans le menu principal
2. Sélectionnez **"Surveillance temps réel"** ou **"Real-time Monitoring"**
3. Cochez votre terminal **"pointeuse"** dans la liste
4. Cliquez sur **"Démarrer la surveillance"**

### 2.2 Configuration du Push automatique (si disponible)

1. Allez dans **"Système"** → **"Paramètres système"**
2. Cherchez l'option **"Push Service"** ou **"Webhook"**
3. Si disponible, configurez :

```
URL du webhook : http://VOTRE_IP_SERVEUR:3000/api/v1/attendance/webhook
Méthode        : POST
Format         : JSON
```

---

## Étape 3 : Créer un Script de Synchronisation (Solution Recommandée)

ZKAccess ne supporte pas nativement les webhooks vers des systèmes tiers. La solution est de créer un **script de synchronisation** qui :
1. Lit les événements depuis la base de données ZKAccess
2. Les envoie vers l'API PointaFlex

### 3.1 Localiser la Base de Données ZKAccess

La base de données ZKAccess est généralement située dans :
```
C:\ZKAccess\3.5\Access.mdb    (Access Database)
ou
C:\Program Files\ZKTeco\ZKAccess3.5\zkaccess.db   (SQLite)
```

### 3.2 Script Node.js de Synchronisation

Créez un fichier `sync-zkaccess-pointaflex.js` :

```javascript
/**
 * Script de synchronisation ZKAccess → PointaFlex
 *
 * Ce script lit les événements de pointage depuis ZKAccess
 * et les envoie vers l'API PointaFlex
 */

const axios = require('axios');

// ========================================
// CONFIGURATION - À MODIFIER
// ========================================

const CONFIG = {
  // PointaFlex API
  pointaflexUrl: 'http://localhost:3000/api/v1/attendance/webhook',
  deviceId: 'ZKTECO-POINTEUSE-001',  // ID du terminal dans PointaFlex
  tenantId: 'VOTRE_TENANT_ID',       // Votre ID tenant
  apiKey: 'pk_VOTRE_CLE_API',        // Clé API générée dans PointaFlex

  // ZKAccess
  zkAccessDbPath: 'C:\\ZKAccess\\3.5\\Access.mdb',

  // Intervalle de synchronisation (en millisecondes)
  syncInterval: 30000,  // 30 secondes

  // Fichier pour stocker le dernier ID synchronisé
  lastSyncFile: './last_sync_id.txt'
};

// ========================================
// FONCTIONS
// ========================================

const fs = require('fs');

// Lire le dernier ID synchronisé
function getLastSyncId() {
  try {
    if (fs.existsSync(CONFIG.lastSyncFile)) {
      return parseInt(fs.readFileSync(CONFIG.lastSyncFile, 'utf8')) || 0;
    }
  } catch (e) {}
  return 0;
}

// Sauvegarder le dernier ID synchronisé
function saveLastSyncId(id) {
  fs.writeFileSync(CONFIG.lastSyncFile, id.toString());
}

// Envoyer un pointage vers PointaFlex
async function sendToPointaFlex(event) {
  try {
    const response = await axios.post(CONFIG.pointaflexUrl, {
      terminalMatricule: event.userId.toString(),
      type: event.eventType === 0 ? 'IN' : 'OUT',  // 0=IN, 1=OUT dans ZKAccess
      timestamp: event.eventTime,
      deviceType: 'FINGERPRINT'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': CONFIG.deviceId,
        'X-Tenant-ID': CONFIG.tenantId,
        'X-API-Key': CONFIG.apiKey
      }
    });

    console.log(`✅ Pointage envoyé: User ${event.userId} - ${event.eventType === 0 ? 'IN' : 'OUT'} - ${event.eventTime}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur envoi pointage:`, error.response?.data || error.message);
    return false;
  }
}

// ========================================
// OPTION A : Lecture via ODBC (Base Access)
// ========================================

async function syncFromAccessDB() {
  const ADODB = require('node-adodb');

  const connection = ADODB.open(
    `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${CONFIG.zkAccessDbPath};`
  );

  const lastId = getLastSyncId();

  try {
    // Récupérer les nouveaux événements
    const events = await connection.query(`
      SELECT ID, UserID, EventTime, EventType, DeviceSN
      FROM Events
      WHERE ID > ${lastId}
      AND DeviceSN = 'A6F5211460142'
      ORDER BY ID ASC
    `);

    console.log(`📥 ${events.length} nouveaux événements trouvés`);

    for (const event of events) {
      const success = await sendToPointaFlex({
        userId: event.UserID,
        eventTime: event.EventTime,
        eventType: event.EventType
      });

      if (success) {
        saveLastSyncId(event.ID);
      }
    }
  } catch (error) {
    console.error('Erreur lecture base ZKAccess:', error);
  }
}

// ========================================
// OPTION B : Via l'API ZKTeco SDK
// ========================================

async function syncViaSDK() {
  const ZKLib = require('zklib');

  const zkInstance = new ZKLib({
    ip: '192.168.1.XXX',  // IP de votre terminal
    port: 4370,
    inport: 5200,
    timeout: 5000
  });

  try {
    await zkInstance.createSocket();
    console.log('✅ Connecté au terminal ZKTeco');

    const logs = await zkInstance.getAttendance();
    console.log(`📥 ${logs.length} pointages récupérés`);

    const lastId = getLastSyncId();

    for (const log of logs) {
      if (log.id > lastId) {
        const success = await sendToPointaFlex({
          userId: log.id,
          eventTime: log.timestamp,
          eventType: 0  // ZKLib ne différencie pas toujours IN/OUT
        });

        if (success) {
          saveLastSyncId(log.id);
        }
      }
    }

    await zkInstance.disconnect();
  } catch (error) {
    console.error('Erreur SDK ZKTeco:', error);
  }
}

// ========================================
// OPTION C : Surveillance fichier log ZKAccess
// ========================================

const chokidar = require('chokidar');

function watchLogFile() {
  const logPath = 'C:\\ZKAccess\\3.5\\Logs\\events.log';

  console.log(`👀 Surveillance du fichier: ${logPath}`);

  chokidar.watch(logPath).on('change', async (path) => {
    console.log('📝 Fichier modifié, lecture des nouveaux événements...');
    // Parser le fichier et envoyer les nouveaux événements
  });
}

// ========================================
// BOUCLE PRINCIPALE
// ========================================

async function main() {
  console.log('🚀 Démarrage synchronisation ZKAccess → PointaFlex');
  console.log(`📍 Terminal: ${CONFIG.deviceId}`);
  console.log(`🔗 URL: ${CONFIG.pointaflexUrl}`);
  console.log(`⏱️  Intervalle: ${CONFIG.syncInterval / 1000}s`);
  console.log('─'.repeat(50));

  // Synchronisation initiale
  await syncFromAccessDB();  // ou syncViaSDK()

  // Boucle de synchronisation périodique
  setInterval(async () => {
    console.log(`\n🔄 Synchronisation ${new Date().toLocaleTimeString()}`);
    await syncFromAccessDB();  // ou syncViaSDK()
  }, CONFIG.syncInterval);
}

main().catch(console.error);
```

### 3.3 Installation et Lancement

1. **Créer le dossier du projet** :
```cmd
mkdir C:\PointaFlex-Sync
cd C:\PointaFlex-Sync
```

2. **Initialiser le projet Node.js** :
```cmd
npm init -y
npm install axios node-adodb
```

3. **Copier le script** dans `C:\PointaFlex-Sync\sync.js`

4. **Modifier la configuration** dans le script :
   - `tenantId` : Votre ID tenant PointaFlex
   - `apiKey` : La clé API générée dans PointaFlex
   - `zkAccessDbPath` : Chemin vers la base ZKAccess

5. **Lancer le script** :
```cmd
node sync.js
```

---

## Étape 4 : Ajouter le Terminal dans PointaFlex

### 4.1 Créer le terminal

1. Ouvrez PointaFlex : `http://localhost:3001/terminals`
2. Cliquez sur **"+ Nouveau Terminal"**
3. Remplissez :

| Champ | Valeur |
|-------|--------|
| Nom du terminal | ZKTeco Pointeuse Principale |
| ID Terminal | ZKTECO-POINTEUSE-001 |
| Type | Empreinte digitale |
| Adresse IP | 192.168.1.XXX |
| [✓] Générer clé API | Coché |

4. **IMPORTANT** : Copiez la clé API générée !

### 4.2 Configurer la clé API dans le script

Mettez à jour le fichier `sync.js` avec :
```javascript
apiKey: 'pk_xxxxxxxxxxxxxxxxxxxxx',  // Votre clé API copiée
```

---

## Étape 5 : Créer le Mapping des Matricules

### 5.1 Récupérer les ID utilisateurs depuis ZKAccess

Dans ZKAccess :
1. Cliquez sur l'onglet **"Le personnel"**
2. Notez les **ID** et **Noms** des employés

### 5.2 Créer le mapping dans PointaFlex

1. Allez dans `/employees/temporary-matricules`
2. Pour chaque employé, créez un mapping :

| ID ZKAccess | Matricule PointaFlex |
|-------------|---------------------|
| 1           | EMP-001             |
| 2           | EMP-002             |
| ...         | ...                 |

---

## Étape 6 : Lancer en Service Windows (Production)

### 6.1 Installer comme Service Windows

1. Installez `node-windows` :
```cmd
npm install -g node-windows
npm link node-windows
```

2. Créez `install-service.js` :
```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'PointaFlex ZKAccess Sync',
  description: 'Synchronisation ZKAccess vers PointaFlex',
  script: 'C:\\PointaFlex-Sync\\sync.js',
  nodeOptions: []
});

svc.on('install', () => {
  svc.start();
  console.log('Service installé et démarré!');
});

svc.install();
```

3. Exécutez :
```cmd
node install-service.js
```

Le script tournera maintenant en arrière-plan automatiquement.

---

## Résumé Architecture

```
┌─────────────────┐
│  Terminal K40   │
│  A6F5211460142  │
│  192.168.1.xxx  │
└────────┬────────┘
         │ Port 4370
         ▼
┌─────────────────┐
│    ZKAccess     │
│  (Base Access)  │
│  C:\ZKAccess\   │
└────────┬────────┘
         │ Lecture DB
         ▼
┌─────────────────┐
│  Script Node.js │
│  sync.js        │
│  (Service Win)  │
└────────┬────────┘
         │ HTTP POST
         │ Headers: X-API-Key
         ▼
┌─────────────────┐
│   PointaFlex    │
│   Backend API   │
│  localhost:3000 │
└─────────────────┘
```

---

## Dépannage

### Erreur "Clé API invalide"
→ Vérifiez que la clé n'a pas expiré dans PointaFlex

### Erreur "Terminal non trouvé"
→ Vérifiez que l'ID terminal dans le script correspond à celui créé dans PointaFlex

### Erreur "Employé non trouvé"
→ Créez le mapping matricule dans `/employees/temporary-matricules`

### Les pointages n'apparaissent pas
→ Vérifiez les logs du script et les logs d'audit dans PointaFlex

---

*Guide créé pour ZKAccess 3.5 + PointaFlex*
