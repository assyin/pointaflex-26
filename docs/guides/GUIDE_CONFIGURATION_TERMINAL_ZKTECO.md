# 🖐️ Guide de Configuration Terminal ZKTeco pour PointaFlex

## 📋 Table des matières
1. [Informations du Terminal](#informations-du-terminal)
2. [Prérequis](#prérequis)
3. [Méthodes de Connexion](#méthodes-de-connexion)
4. [Configuration dans PointaFlex](#configuration-dans-pointaflex)
5. [Méthode 1: Bridge Python (Recommandée)](#méthode-1-bridge-python-recommandée)
6. [Méthode 2: Webhook HTTP](#méthode-2-webhook-http)
7. [Enregistrement des Employés](#enregistrement-des-employés)
8. [Tests et Validation](#tests-et-validation)
9. [Troubleshooting](#troubleshooting)

---

## 🔍 Informations du Terminal

D'après les photos du terminal **ZKTeco IN01** :

### Spécifications Matérielles
- **Modèle**: ZKTeco IN01
- **Numéro de série**: EJB824110244
- **Adresse MAC**: 00:17:61:11:26:44
- **Fabricant**: ZKTECO CO., LTD.

### Spécifications Logicielles
- **Version progiciels**: Ver 8.0.4.6-20220618
- **Bio Service**: Ver 2.1.12-20191203
- **Push Service**: Ver 2.0.33S-20220623
- **Standalone Service**: Ver 2.1.6-20211012
- **Dev Service**: Ver 2.0.1-20170210
- **System Version**: Ver 21.9.28-20161214

### Fonctionnalités
- **Algorithme d'empreinte digitale**: ZKFinger VX10.0
- **Plateforme**: ZMM200_TFT
- **Version MCU**: 14
- **Type de capteur**: Empreinte digitale + Code PIN

---

## 📦 Prérequis

### 1. Réseau
- Le terminal doit être connecté au réseau local (Ethernet ou WiFi)
- Le serveur PointaFlex doit être accessible depuis le réseau du terminal
- Port **4370** ouvert (port par défaut ZKTeco)
- Port **3000** ouvert (API PointaFlex)

### 2. Logiciels requis (pour Bridge Python)
```bash
# Python 3.7+ installé
python3 --version

# Installation des dépendances
pip install pyzk requests
```

### 3. Informations à préparer
- ✅ Adresse IP du terminal ZKTeco
- ✅ ID du Tenant (entreprise) dans PointaFlex
- ✅ Liste des employés avec leurs matricules

---

## 🔌 Méthodes de Connexion

### Comparaison des méthodes

| Méthode | Avantages | Inconvénients | Recommandé |
|---------|-----------|---------------|------------|
| **Bridge Python** | ✅ Temps réel<br>✅ Fiable<br>✅ Support complet SDK | ⚠️ Serveur Python requis | ⭐⭐⭐⭐⭐ |
| **Webhook HTTP** | ✅ Simple<br>✅ Standard | ⚠️ Configuration terminal requise<br>⚠️ Dépend du firmware | ⭐⭐⭐ |
| **Push Service** | ✅ Intégré ZKTeco | ⚠️ Moins flexible<br>⚠️ Firmware spécifique | ⭐⭐ |

---

## 📱 Configuration dans PointaFlex

### Étape 1: Ajouter le Terminal

1. **Accédez à la page Terminaux**
   ```
   http://localhost:3001/terminals
   ```

2. **Cliquez sur "Nouveau Terminal"**

3. **Remplissez les informations**:
   ```
   Nom du terminal:    Terminal RH Entrée Principale
   ID Terminal:        IN01-RH-001
   Type:               Empreinte digitale (FINGERPRINT)
   Adresse IP:         192.168.1.150  (à modifier selon votre réseau)
   ```

4. **Cliquez sur "Créer"**

### Étape 2: Noter les informations système

Après création, vous aurez besoin de:
- **Device ID**: Généré automatiquement (ex: `IN01-RH-001`)
- **Tenant ID**: Disponible dans les paramètres (ex: `90fab0cc-8539-4566-8da7-8742e9b6937b`)

---

## 🐍 Méthode 1: Bridge Python (Recommandée)

Le Bridge Python se connecte directement au terminal via le SDK ZKTeco et envoie les pointages en temps réel vers PointaFlex.

### Installation

```bash
# 1. Installer Python et pip
sudo apt-get update
sudo apt-get install python3 python3-pip -y

# 2. Installer les dépendances
pip3 install pyzk requests

# 3. Vérifier l'installation
python3 -c "import zk; print('✅ PyZK installé')"
```

### Configuration du Bridge

Le fichier `zkteco_bridge.py` se trouve à la racine du projet PointaFlex.

**Modifier les paramètres** (lignes 13-18):

```python
# Configuration
TERMINAL_IP = "192.168.1.150"      # ⚠️ MODIFIER: IP de votre terminal ZKTeco
TERMINAL_PORT = 4370                # Port par défaut (ne pas modifier)
BACKEND_URL = "http://localhost:3000/api/v1/attendance/webhook"
DEVICE_ID = "IN01-RH-001"          # ⚠️ MODIFIER: ID du terminal dans PointaFlex
TENANT_ID = "90fab0cc-8539-4566-8da7-8742e9b6937b"  # ⚠️ MODIFIER: ID de votre entreprise
CHECK_INTERVAL = 10                 # Vérifier toutes les 10 secondes
```

### Démarrage du Bridge

```bash
# Test manuel
cd /home/assyin/PointaFlex
python3 zkteco_bridge.py

# Vous devriez voir:
# 🔄 Connexion au terminal ZKTeco à 192.168.1.150:4370...
# ✅ Connecté au terminal: IN01
# 📊 Version firmware: Ver 8.0.4.6
# 👥 Utilisateurs enregistrés: 25
# 🚀 Début de la synchronisation (intervalle: 10s)
```

### Démarrage automatique (Service Systemd)

Créer un service pour démarrer automatiquement le bridge:

```bash
# 1. Créer le fichier service
sudo nano /etc/systemd/system/zkteco-bridge.service
```

**Contenu du fichier**:
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

```bash
# 2. Activer et démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable zkteco-bridge
sudo systemctl start zkteco-bridge

# 3. Vérifier le statut
sudo systemctl status zkteco-bridge

# 4. Voir les logs
sudo journalctl -u zkteco-bridge -f
```

---

## 🌐 Méthode 2: Webhook HTTP

Cette méthode nécessite que le terminal ZKTeco envoie directement les pointages via HTTP.

### Configuration du Terminal ZKTeco

⚠️ **Attention**: Cette configuration se fait via le logiciel ZKAccess ou via le menu du terminal.

#### Option A: Via le Logiciel ZKAccess

1. **Installer ZKAccess** sur un PC Windows
2. **Se connecter au terminal**:
   - IP: 192.168.1.150
   - Port: 4370
   - Mot de passe: (par défaut vide ou "0000")

3. **Configurer le Push Service**:
   ```
   Menu > Communication > Push Service

   - Enable Push: ✅ Oui
   - Push URL: http://[IP_SERVER]:3000/api/v1/attendance/webhook
   - Push Method: POST
   - Content-Type: application/json
   - Headers personnalisés:
     X-Device-ID: IN01-RH-001
     X-Tenant-ID: 90fab0cc-8539-4566-8da7-8742e9b6937b
   ```

#### Option B: Via le Menu du Terminal

1. **Accéder au menu administrateur**:
   - Appuyez sur `MENU` sur le terminal
   - Code admin: (par défaut `0` ou demandez à l'administrateur)

2. **Navigation**:
   ```
   MENU > Comm. > Network > Advanced
   ```

3. **Configurer le serveur**:
   ```
   Push Server IP: [IP de votre serveur PointaFlex]
   Push Server Port: 3000
   Push Interval: 10 (secondes)
   ```

### Format des données envoyées

Le terminal doit envoyer les données au format:

```json
{
  "employeeId": "E12345",
  "timestamp": "2025-01-25T08:30:00Z",
  "type": "IN",
  "method": "FINGERPRINT",
  "rawData": {
    "confidence": 95,
    "deviceSN": "EJB824110244",
    "verifyMode": 1
  }
}
```

### Headers requis

```
Content-Type: application/json
X-Device-ID: IN01-RH-001
X-Tenant-ID: 90fab0cc-8539-4566-8da7-8742e9b6937b
```

---

## 👥 Enregistrement des Employés

Les employés doivent être enregistrés à la fois dans PointaFlex ET dans le terminal ZKTeco.

### Dans PointaFlex

Les employés sont déjà enregistrés dans le système. Notez leur **matricule** (employeeId).

### Dans le Terminal ZKTeco

#### Méthode 1: Via le Terminal directement

1. **Menu Administrateur**:
   ```
   MENU > User > New User
   ```

2. **Entrer les informations**:
   - **User ID**: Utiliser le MÊME matricule que dans PointaFlex (ex: E12345)
   - **Nom**: Nom de l'employé
   - **Password**: (optionnel) Code PIN

3. **Enregistrer l'empreinte**:
   - Sélectionner "Enroll Finger"
   - Placer le doigt 3 fois pour enregistrement
   - Le terminal confirmera l'enregistrement

#### Méthode 2: Via le Logiciel ZKAccess

Plus pratique pour enregistrer plusieurs employés:

1. Ouvrir ZKAccess
2. Se connecter au terminal
3. Aller dans "Gestion des Utilisateurs"
4. Importer la liste des employés (CSV possible)
5. Demander à chaque employé d'enregistrer son empreinte

### ⚠️ Important: Correspondance des IDs

```
PointaFlex Matricule = ZKTeco User ID
```

**Exemple**:
- Employé: Ahmed Bennani
- Matricule PointaFlex: `E00123`
- User ID ZKTeco: `E00123` ← **DOIT ÊTRE IDENTIQUE**

---

## 🧪 Tests et Validation

### Test 1: Connexion au Terminal

```bash
# Tester la connexion réseau
ping 192.168.1.150

# Tester le port ZKTeco
nc -zv 192.168.1.150 4370
# Devrait afficher: Connection to 192.168.1.150 4370 port [tcp/*] succeeded!
```

### Test 2: Bridge Python

```bash
# Démarrer le bridge en mode test
python3 zkteco_bridge.py

# Faire un pointage sur le terminal
# Vous devriez voir:
# 📥 1 nouveau(x) pointage(s) détecté(s)
# ✅ Pointage envoyé: E00123 à 2025-01-25 08:30:15
```

### Test 3: Vérification dans PointaFlex

1. **Accéder à la page Pointages**:
   ```
   http://localhost:3001/attendance
   ```

2. **Vérifier qu'un nouveau pointage apparaît**:
   - Employé: Ahmed Bennani
   - Heure: 08:30:15
   - Type: Entrée
   - Méthode: Empreinte digitale

### Test 4: Webhook (depuis l'interface)

Dans la page Terminaux de PointaFlex:

1. Cliquer sur "Config Webhook"
2. Cliquer sur "Tester le Webhook"
3. Vérifier le message de succès

---

## 🔧 Troubleshooting

### Problème 1: "Connexion refusée" au terminal

**Symptômes**:
```
❌ Erreur de connexion: [Errno 111] Connection refused
```

**Solutions**:
1. ✅ Vérifier que l'IP est correcte:
   ```bash
   # Sur le terminal: MENU > System > Network
   # Noter l'adresse IP affichée
   ```

2. ✅ Vérifier que le terminal est allumé et connecté

3. ✅ Tester le ping:
   ```bash
   ping 192.168.1.150
   ```

4. ✅ Vérifier le firewall:
   ```bash
   sudo ufw allow 4370
   ```

### Problème 2: "Pointage envoyé mais pas visible dans PointaFlex"

**Solutions**:

1. ✅ Vérifier que le backend est démarré:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

2. ✅ Vérifier le Tenant ID et Device ID dans le bridge

3. ✅ Vérifier que l'employé existe dans PointaFlex avec le bon matricule

4. ✅ Consulter les logs backend:
   ```bash
   cd backend
   npm run start:dev
   # Observer les logs pour voir si le webhook est reçu
   ```

### Problème 3: "Employé non trouvé"

**Symptômes**:
```
❌ Erreur 404: Employee not found
```

**Solutions**:

1. ✅ Vérifier que le User ID du terminal = Matricule PointaFlex:
   ```sql
   -- Vérifier dans la base de données
   SELECT matricule, firstName, lastName
   FROM "Employee"
   WHERE "tenantId" = '90fab0cc-8539-4566-8da7-8742e9b6937b';
   ```

2. ✅ Sur le terminal ZKTeco, vérifier l'User ID:
   ```
   MENU > User > [Sélectionner utilisateur] > User ID
   ```

### Problème 4: Le Bridge se déconnecte fréquemment

**Solutions**:

1. ✅ Augmenter le timeout dans le bridge:
   ```python
   zk = ZK(TERMINAL_IP, port=TERMINAL_PORT, timeout=10)  # Augmenter à 10s
   ```

2. ✅ Vérifier la stabilité du réseau

3. ✅ Mettre à jour le firmware du terminal ZKTeco

### Problème 5: "Unauthorized 401"

**Symptômes**:
```
❌ Erreur 401: Unauthorized
```

**Solutions**:

1. ✅ Vérifier que les headers sont présents:
   ```python
   headers = {
       "X-Device-ID": DEVICE_ID,
       "X-Tenant-ID": TENANT_ID,
   }
   ```

2. ✅ Vérifier que le terminal est enregistré dans PointaFlex

---

## 📊 Monitoring et Maintenance

### Vérifier le statut du Bridge

```bash
# Statut du service
sudo systemctl status zkteco-bridge

# Logs en temps réel
sudo journalctl -u zkteco-bridge -f

# Redémarrer le service
sudo systemctl restart zkteco-bridge
```

### Vérifier le statut du Terminal dans PointaFlex

1. Accéder à http://localhost:3001/terminals
2. Le statut devrait afficher:
   - 🟢 **En ligne**: Si synchronisation dans les 5 dernières minutes
   - 🟡 **Lente**: Si synchronisation entre 5-30 minutes
   - 🔴 **Hors ligne**: Si aucune synchronisation > 30 minutes

### Synchronisation manuelle

Dans l'interface PointaFlex:
1. Aller sur la page Terminaux
2. Cliquer sur le bouton "Sync" pour le terminal
3. Le système tentera une synchronisation immédiate

---

## 📝 Checklist de Configuration

- [ ] Terminal ZKTeco allumé et connecté au réseau
- [ ] IP du terminal notée et accessible (ping OK)
- [ ] Terminal ajouté dans PointaFlex (page Terminaux)
- [ ] Bridge Python installé et configuré
- [ ] Service systemd créé et démarré
- [ ] Employés enregistrés dans le terminal avec les bons User IDs
- [ ] Test de pointage réussi
- [ ] Pointage visible dans l'interface PointaFlex
- [ ] Monitoring activé

---

## 🆘 Support

### Logs utiles

```bash
# Logs du Bridge
sudo journalctl -u zkteco-bridge -f

# Logs du Backend PointaFlex
cd backend
npm run start:dev

# Tester la connexion manuellement
python3 -c "from zk import ZK; zk = ZK('192.168.1.150', port=4370); conn = zk.connect(); print(conn.get_device_name())"
```

### Contacts

- Documentation ZKTeco: https://www.zkteco.com
- Support PointaFlex: [Votre contact support]

---

## ✅ Résumé des URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3001/terminals | Gestion des terminaux |
| API Webhook | http://localhost:3000/api/v1/attendance/webhook | Endpoint de réception |
| Pointages | http://localhost:3001/attendance | Voir les pointages |

---

**Date de création**: 2025-01-25
**Version**: 1.0
**Compatible avec**: ZKTeco IN01 / Firmware 8.0.4.6+
