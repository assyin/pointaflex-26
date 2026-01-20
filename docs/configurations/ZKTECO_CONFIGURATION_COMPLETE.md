# 🔧 Guide Complet de Configuration Terminal ZKTeco IN01

## 📱 Informations sur Votre Terminal

- **Modèle**: ZKTeco IN01
- **Numéro de série**: EJ5624110O244
- **Adresse MAC**: 00:17:61:11:26:44
- **Algorithme**: ZKFinger VX10.0
- **Plateforme**: ZMM200_TFT
- **Fabricant**: ZKTECO CO., LTD.

---

## 🎯 Objectif

Connecter votre terminal biométrique ZKTeco IN01 à votre système PointaFlex pour que les pointages apparaissent automatiquement dans l'interface web.

---

## 🚀 Méthode 1: Configuration Directe HTTP Push (Recommandée)

### Étape 1: Connecter le Terminal au Réseau

#### Sur le Terminal ZKTeco:

1. **Accéder au menu administrateur**:
   - Appuyez sur **MENU** ou maintenez **ESC** 3 secondes
   - Entrez le mot de passe admin (par défaut: `0000` ou `123456`)

2. **Configuration réseau**:
   - Naviguez: `Menu → Comm → TCP/IP` ou `Menu → Réseau`
   - Configurez:
     ```
     Adresse IP: 192.168.1.150 (choisissez une IP libre)
     Masque: 255.255.255.0
     Passerelle: 192.168.1.1 (IP de votre routeur)
     DNS: 8.8.8.8
     ```
   - **Enregistrez** et notez l'IP attribuée

3. **Testez la connexion**:
   - Depuis votre ordinateur, tapez: `ping 192.168.1.150`
   - Vous devriez recevoir des réponses

### Étape 2: Trouver l'IP de Votre Serveur Backend

#### Sur Windows:

Ouvrez **PowerShell** et tapez:
```powershell
ipconfig
```

Cherchez votre IP (WiFi ou Ethernet):
```
Carte réseau sans fil Wi-Fi:
   Adresse IPv4: 192.168.1.100  ← Utilisez cette IP
```

### Étape 3: Configurer HTTP Push sur le Terminal

#### Option A: Via le Logiciel ZKAccess (Plus Simple)

1. **Téléchargez** [ZKAccess](https://www.zkteco.com/en/download_apps) depuis le site officiel

2. **Installez** et lancez ZKAccess

3. **Ajoutez le terminal**:
   - Device Management → Add Device
   - IP: `192.168.1.150`
   - Port: `4370`
   - Password: (mot de passe admin du terminal)

4. **Configurez le Push**:
   - Device Settings → Network → HTTP Push
   - Activez HTTP Push
   - URL: `http://192.168.1.100:3000/api/v1/attendance/webhook`
   - Method: `POST`
   - Content-Type: `application/json`

5. **Ajoutez les Headers personnalisés**:
   ```
   X-Device-ID: TERMINAL-PRINC-001
   X-Tenant-ID: 90fab0cc-8539-4566-8da7-8742e9b6937b
   ```

#### Option B: Directement sur le Terminal (Si supporté)

1. Sur le terminal, allez dans:
   - `Menu → Comm → Cloud Server` ou `HTTP Push`

2. Configurez:
   ```
   Enable Cloud: ON
   Server URL: http://192.168.1.100:3000/api/v1/attendance/webhook
   Port: 3000
   Protocol: HTTP
   ```

3. Enregistrez et redémarrez le terminal

### Étape 4: Ouvrir le Port dans le Firewall

#### Sur Windows (PowerShell en Administrateur):

```powershell
New-NetFirewallRule -DisplayName "PointaFlex Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

Ou via l'interface:
1. **Pare-feu Windows** → Paramètres avancés
2. **Règles de trafic entrant** → Nouvelle règle
3. Type: **Port TCP 3000**
4. Action: **Autoriser**

### Étape 5: Configurer le Mapping des Données

Le terminal doit envoyer les données dans ce format JSON:

```json
{
  "employeeId": "EMP001",
  "timestamp": "2025-11-22T14:30:00Z",
  "type": "IN",
  "method": "FINGERPRINT",
  "rawData": {
    "confidence": 95
  }
}
```

**Configuration dans ZKAccess:**
- Template de données → JSON personnalisé
- Mapper:
  - `Pin` → `employeeId` (matricule de l'employé)
  - `Time` → `timestamp`
  - `VerifyMode` → `method`:
    - 0 = PIN_CODE
    - 1 = FINGERPRINT
    - 4 = FACE_RECOGNITION
    - 15 = RFID_BADGE

---

## 🔄 Méthode 2: Script Bridge Python (Alternative)

Si votre terminal ne supporte pas HTTP Push, utilisez le script bridge fourni.

### Installation:

```bash
# 1. Installer les dépendances
pip install pyzk requests

# 2. Modifier les paramètres dans zkteco_bridge.py:
TERMINAL_IP = "192.168.1.150"  # IP de votre terminal
BACKEND_URL = "http://localhost:3000/api/v1/attendance/webhook"

# 3. Lancer le script
python3 /home/assyin/PointaFlex/zkteco_bridge.py
```

Le script va:
- ✅ Se connecter au terminal toutes les 10 secondes
- ✅ Récupérer les nouveaux pointages
- ✅ Les envoyer automatiquement au backend PointaFlex

**Pour lancer au démarrage:**
```bash
# Créer un service systemd
sudo nano /etc/systemd/system/zkteco-bridge.service
```

Contenu:
```ini
[Unit]
Description=ZKTeco Bridge pour PointaFlex
After=network.target

[Service]
Type=simple
User=assyin
WorkingDirectory=/home/assyin/PointaFlex
ExecStart=/usr/bin/python3 /home/assyin/PointaFlex/zkteco_bridge.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activer:
```bash
sudo systemctl enable zkteco-bridge
sudo systemctl start zkteco-bridge
sudo systemctl status zkteco-bridge
```

---

## 🧪 Tests de Validation

### Test 1: Vérifier la Connexion Réseau

```bash
# Depuis votre ordinateur
ping 192.168.1.150
```

✅ Résultat attendu: Réponses reçues

### Test 2: Vérifier le Backend est Accessible

```bash
# Depuis le réseau local
curl http://192.168.1.100:3000/api/v1/attendance/webhook
```

✅ Résultat attendu: Erreur 401 ou 400 (normal, pas d'erreur de connexion)

### Test 3: Pointer sur le Terminal

1. Placez votre doigt sur le lecteur d'empreintes
2. Attendez le bip de confirmation
3. Vérifiez les logs du backend (doit afficher la réception du webhook)
4. Allez sur `http://localhost:3001/attendance`
5. Le pointage doit apparaître dans les 30 secondes

### Test 4: Vérifier dans la Base de Données

```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres -c "SELECT id, timestamp, type, method FROM \"Attendance\" ORDER BY timestamp DESC LIMIT 3;"
```

---

## 📋 Enregistrer les Employés dans le Terminal

### Via ZKAccess:

1. **User Management** → Add User
2. Remplissez:
   - **User ID**: `1` (ce sera mappé avec `employeeId`)
   - **Name**: Nom de l'employé
   - **Card Number**: (si badge RFID)
3. **Enroll Fingerprint**:
   - Demandez à l'employé de placer son doigt
   - Enregistrez 2-3 empreintes pour fiabilité

### Directement sur le Terminal:

1. `Menu → User → New User`
2. Entrez l'ID utilisateur (ex: `1`)
3. Nom de l'utilisateur
4. `Enroll Finger` → Suivez les instructions
5. Enregistrez

**IMPORTANT**: Le User ID doit correspondre au **matricule** de l'employé dans PointaFlex.

---

## 🔧 Dépannage

### Problème 1: Le terminal ne se connecte pas au réseau

✅ **Solutions**:
- Vérifiez le câble Ethernet (si filaire)
- Vérifiez le mot de passe WiFi
- Réinitialisez les paramètres réseau du terminal
- Vérifiez que le routeur n'a pas de restriction MAC

### Problème 2: Le webhook n'arrive pas au backend

✅ **Solutions**:
- Vérifiez que le backend est démarré: `http://localhost:3000`
- Vérifiez le firewall Windows
- Utilisez l'IP Windows (pas `localhost`) dans la config du terminal
- Vérifiez les logs du backend pour voir les erreurs

### Problème 3: Erreur "Device not found"

✅ **Solutions**:
- Vérifiez que le `X-Device-ID` est correct: `TERMINAL-PRINC-001`
- Vérifiez dans la base de données que le terminal existe
- Créez le terminal dans l'interface PointaFlex si nécessaire

### Problème 4: Erreur "Employee not found"

✅ **Solutions**:
- Vérifiez que l'employé existe dans PointaFlex
- Le User ID du terminal doit correspondre au **matricule** PointaFlex
- Créez l'employé d'abord dans PointaFlex

### Problème 5: Le pointage n'apparaît pas dans l'interface

✅ **Solutions**:
- Attendez 30 secondes (actualisation automatique)
- Cliquez sur "Actualiser"
- Vérifiez la date sélectionnée (doit inclure aujourd'hui)
- Vérifiez que vous êtes connecté

---

## 📊 Monitoring

### Logs Backend (Terminal WSL):

```bash
cd /home/assyin/PointaFlex/backend
npm run start:dev
```

Vous verrez:
```
✅ Webhook reçu de TERMINAL-PRINC-001
✅ Pointage créé pour EMP001
```

### Logs du Script Bridge:

```bash
python3 /home/assyin/PointaFlex/zkteco_bridge.py
```

Vous verrez:
```
✅ Connecté au terminal: ZKTeco IN01
📥 1 nouveau pointage détecté
✅ Pointage envoyé: 1 à 2025-11-22 14:30:00
```

---

## 🎯 Checklist de Configuration

- [ ] Terminal connecté au réseau (IP: 192.168.1.150)
- [ ] Ping du terminal fonctionne depuis l'ordinateur
- [ ] Backend accessible depuis le réseau (http://192.168.1.100:3000)
- [ ] Firewall Windows autorise le port 3000
- [ ] HTTP Push configuré avec la bonne URL
- [ ] Headers personnalisés ajoutés (X-Device-ID, X-Tenant-ID)
- [ ] Employés enregistrés dans le terminal
- [ ] User ID du terminal = Matricule PointaFlex
- [ ] Test de pointage réussi
- [ ] Pointage visible dans l'interface web

---

## 📞 Support

### Ressources ZKTeco:
- Manuel: https://www.zkteco.com/en/support_download
- SDK: https://www.zkteco.com/en/download_detail/id/154.html
- Forums: https://support.zkteco.com

### En cas de problème:
1. Vérifiez les logs backend
2. Testez avec curl (voir WEBHOOK_REALTIME_GUIDE.md)
3. Vérifiez la configuration réseau
4. Contactez le support ZKTeco pour des problèmes matériels

---

**Dernière mise à jour**: 22 novembre 2025
**Version PointaFlex**: 1.0.0
**Testé avec**: ZKTeco IN01, ZKFinger VX10.0
