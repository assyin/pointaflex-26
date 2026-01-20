# 🚀 GUIDE: Configuration Mode PUSH pour Terminaux ZKTeco

## 📋 Prérequis

- ✅ Terminal ZKTeco avec firmware récent (> 2018)
- ✅ Terminal connecté au réseau (WiFi ou Ethernet)
- ✅ Backend PointaFlex accessible sur Internet (ou réseau local)
- ✅ URL publique ou IP fixe pour votre serveur

---

## 🌐 ÉTAPE 1: Préparer votre Backend

### 1.1 Vérifier que l'endpoint existe

Votre endpoint est déjà prêt:
```
POST https://votre-domaine.com/api/v1/attendance/push
```

### 1.2 Si vous testez en LOCAL (développement)

Pour que le terminal puisse atteindre votre serveur local, vous avez 3 options:

**Option A: Ngrok (Recommandé pour tests)**
```bash
# Installer ngrok
npm install -g ngrok

# Exposer votre backend
ngrok http 3000

# Vous obtenez une URL publique comme:
# https://abc123.ngrok.io
```

Votre URL Push sera: `https://abc123.ngrok.io/api/v1/attendance/push`

**Option B: Cloudflare Tunnel**
```bash
# Plus stable que ngrok
cloudflared tunnel --url http://localhost:3000
```

**Option C: Serveur public (Production)**
Déployez sur:
- DigitalOcean
- AWS EC2
- Heroku
- Render.com
- Railway.app

---

## 🔧 ÉTAPE 2: Configuration du Terminal ZKTeco

### Méthode 1: Via l'Interface Web (RECOMMANDÉ)

#### 2.1 Accéder à l'interface web

1. **Trouver l'IP du terminal:**
   - Sur le terminal: Menu → Système → Communication → IP
   - OU scanner le réseau: `nmap -sn 192.168.16.0/24`

2. **Accéder via navigateur:**
   ```
   http://192.168.16.174
   ```

3. **Login:**
   - Utilisateur: `administrator` ou `admin`
   - Mot de passe: `123456` (par défaut)

#### 2.2 Configurer le Push (selon le modèle)

**Pour modèles récents (interface moderne):**

```
Menu: Communication → Cloud Settings
├── Cloud Service: Enable ☑
├── Cloud Server Type: HTTP/HTTPS
├── Server URL: https://votre-domaine.com/api/v1/attendance/push
├── Port: 443 (HTTPS) ou 80 (HTTP)
├── Enable Push: Yes ☑
├── Push Mode: Real-time
└── Save
```

**Pour modèles plus anciens:**

```
Menu: Options → Cloud → Cloud Push
├── Enable Push: ON
├── Push URL: https://votre-domaine.com/api/v1/attendance/push
├── Push Protocol: HTTP
├── Push Interval: Immediate (0)
└── Apply
```

**Pour certains modèles BioTime:**

```
Menu: System → Network → Cloud Settings
├── Cloud Service: CloudAtt
├── Server Address: votre-domaine.com
├── Port: 443
├── Push Path: /api/v1/attendance/push
├── Enable Real-time: Yes
└── Save & Restart
```

#### 2.3 Tester la connexion

Sur le terminal:
```
Menu → Communication → Cloud → Test Connection
```

Si succès: ✅ "Connection OK"
Si échec: ❌ Vérifier firewall et URL

---

### Méthode 2: Via l'application ZKAccess

#### 2.1 Télécharger ZKAccess

- Windows: [ZKAccess 3.5](http://www.zkteco.com/en/download_detail/category/35.html)
- Alternative: ZKBio Access (version plus récente)

#### 2.2 Ajouter le terminal

1. Lancer ZKAccess
2. Device Management → Add Device
3. Saisir l'IP du terminal: `192.168.16.174`
4. Port: `4370`
5. Connect

#### 2.3 Configurer le Push

1. Clic droit sur le terminal → Device Parameters
2. Onglet "Communication"
3. Activer "Cloud Service"
4. Configurer:
   ```
   Cloud Type: HTTP Push
   Server URL: https://votre-domaine.com/api/v1/attendance/push
   Push Mode: Real-time
   ```
5. Download to Device
6. Restart Device

---

### Méthode 3: Via USB et configuration manuelle

#### 3.1 Créer le fichier de configuration

Créer un fichier `options.ini`:

```ini
[CloudAtt]
Enable=1
ServerAddress=votre-domaine.com
ServerPort=443
PushPath=/api/v1/attendance/push
Protocol=HTTPS
PushInterval=0
EnableSSL=1
```

#### 3.2 Copier sur clé USB

1. Formater la clé en FAT32
2. Copier `options.ini` à la racine
3. Insérer dans le terminal
4. Menu → System → Import → Options
5. Redémarrer le terminal

---

## 🧪 ÉTAPE 3: Tester la Configuration

### 3.1 Vérifier les logs backend

```bash
# Dans le terminal où tourne votre backend
# Vous devriez voir:
📥 [Push URL] Données reçues du terminal: { ... }
✅ [Push URL] Pointage enregistré avec succès
```

### 3.2 Faire un pointage test

1. Sur le terminal, pointer avec votre doigt/badge
2. Vérifier immédiatement les logs du backend
3. Vérifier dans PointaFlex frontend

### 3.3 Vérifier en base de données

```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres \
  -c "SELECT * FROM \"Attendance\" ORDER BY \"timestamp\" DESC LIMIT 5;"
```

---

## 🔍 DÉPANNAGE

### Problème: "Connection Failed" sur le terminal

**Causes possibles:**
1. URL incorrecte
2. Firewall bloque le port
3. Certificat SSL invalide (si HTTPS)
4. Serveur non accessible depuis l'IP du terminal

**Solutions:**
```bash
# 1. Tester depuis le terminal (si vous y avez accès SSH)
curl -X POST https://votre-domaine.com/api/v1/attendance/push \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 2. Vérifier que le backend répond
curl https://votre-domaine.com/api/v1/attendance/push

# 3. Utiliser HTTP au lieu de HTTPS (test uniquement)
http://votre-domaine.com/api/v1/attendance/push
```

### Problème: Terminal push mais backend ne reçoit rien

**Vérifications:**
1. Vérifier les logs Nginx/Apache (si reverse proxy)
2. Vérifier le format des données envoyées
3. Ajouter des logs supplémentaires:

```typescript
// Dans attendance.controller.ts
@Post('push')
async handlePushFromTerminal(@Body() body: any, @Headers() headers: any) {
  console.log('🔍 RAW BODY:', JSON.stringify(body, null, 2));
  console.log('🔍 HEADERS:', JSON.stringify(headers, null, 2));
  // ... reste du code
}
```

### Problème: Données reçues mais format incorrect

Le terminal peut envoyer différents formats selon le modèle:

**Format 1 (Standard):**
```json
{
  "pin": "1091",
  "time": "2025-11-27 10:30:00",
  "state": 1,
  "verifymode": 1
}
```

**Format 2 (BioTime):**
```json
{
  "sn": "DGBA212760069",
  "table": "attendance",
  "data": {
    "pin": "1091",
    "time": "2025-11-27 10:30:00",
    "status": "0",
    "verify": "1"
  }
}
```

**Format 3 (ADMS):**
```json
{
  "cardno": "1091",
  "checktime": "2025-11-27T10:30:00Z",
  "checktype": "I",
  "verifycode": "1"
}
```

Le code actuel gère ces 3 formats! Si problème, adaptez les champs dans le controller.

---

## 📊 MONITORING

### Créer un dashboard de monitoring

Ajoutez dans votre backend:

```typescript
// backend/src/modules/devices/devices.service.ts

async getDeviceStats(tenantId: string) {
  const devices = await this.prisma.attendanceDevice.findMany({
    where: { tenantId },
    include: {
      attendance: {
        take: 1,
        orderBy: { timestamp: 'desc' }
      }
    }
  });

  return devices.map(device => ({
    id: device.id,
    name: device.name,
    status: this.getDeviceStatus(device.lastSync),
    lastSync: device.lastSync,
    lastAttendance: device.attendance[0]?.timestamp,
    isOnline: this.isDeviceOnline(device.lastSync)
  }));
}

private getDeviceStatus(lastSync: Date | null): 'online' | 'offline' | 'warning' {
  if (!lastSync) return 'offline';

  const minutesSinceSync = (Date.now() - lastSync.getTime()) / 1000 / 60;

  if (minutesSinceSync < 5) return 'online';
  if (minutesSinceSync < 30) return 'warning';
  return 'offline';
}
```

---

## ✅ CHECKLIST FINALE

Avant de déployer en production:

- [ ] URL publique configurée et testée
- [ ] HTTPS activé (certificat SSL valide)
- [ ] Endpoint `/push` testé avec curl
- [ ] Terminal configuré avec la bonne URL
- [ ] Test de pointage réussi
- [ ] Données apparaissent dans PointaFlex
- [ ] Monitoring des terminaux en place
- [ ] Documentation remise au client
- [ ] Formation utilisateur effectuée

---

## 🎓 FORMATION CLIENT

### Ce que le client doit savoir:

1. **En cas de changement d'IP du serveur:**
   - Mettre à jour l'URL Push dans chaque terminal
   - Redémarrer les terminaux

2. **Ajout d'un nouveau terminal:**
   - Enregistrer le terminal dans PointaFlex (interface web)
   - Configurer le Push URL sur le nouveau terminal
   - Tester avec un pointage

3. **Vérifier que ça fonctionne:**
   - Pointage apparaît immédiatement (< 5 secondes)
   - Si délai > 30s, vérifier la connexion réseau

---

## 🚀 ÉTAPE SUIVANTE

Une fois le Push configuré:

1. **Synchroniser les utilisateurs:**
   ```typescript
   // Endpoint pour envoyer les employés vers le terminal
   POST /api/v1/devices/:deviceId/sync-users
   ```

2. **Monitoring en temps réel:**
   - Ajouter WebSocket pour notifs en temps réel
   - Dashboard avec statut des terminaux

3. **Multi-sites:**
   - Chaque site avec ses terminaux
   - Vue consolidée pour la direction

---

**Besoin d'aide pour configurer? Je peux vous guider étape par étape!**
