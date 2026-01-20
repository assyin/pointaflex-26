# 🎯 GUIDE: Configuration Push pour VOTRE version ZKAccess

## 📸 Basé sur votre capture d'écran

Vous utilisez **ZKAccess** (interface en français) avec plusieurs terminaux connectés:
- Pointeuse Principale (IP: 192.168.16.x)
- Pointeur CIT & GAB
- Garage 1, 2, 3
- Etc.

---

## 🔍 MÉTHODE 1: Via ZKAccess (Si l'option existe)

### Étape 1: Accéder aux paramètres du terminal

1. **Sélectionner le terminal** (exemple: "Pointeuse Principale")
   - Clic gauche pour sélectionner la ligne

2. **Accéder aux paramètres:**
   - **Option A:** Double-clic sur le terminal
   - **Option B:** Clic droit → Chercher "Paramètres" / "Configuration" / "Device Settings"
   - **Option C:** Menu en haut → "Équipement" → "Paramètres du terminal"

### Étape 2: Chercher l'onglet Communication/Cloud

Dans la fenêtre de paramètres, cherchez:
- Onglet "**Communication**"
- Onglet "**Cloud**" ou "**Cloud Att**"
- Onglet "**Réseau**" ou "**Network**"
- Section "**Push Settings**"

### Si vous NE VOYEZ PAS ces options:

❌ **Cette version du logiciel ne supporte peut-être pas la configuration Cloud**

→ **Passez à la MÉTHODE 2 (recommandé)**

---

## ✅ MÉTHODE 2: Via l'Interface Web du Terminal (RECOMMANDÉ)

### Pourquoi cette méthode?
- ✅ Fonctionne sur TOUS les terminaux ZKTeco
- ✅ Plus de contrôle
- ✅ Configuration directe dans le terminal
- ✅ Pas de dépendance au logiciel PC

### Étape 1: Trouver l'IP de votre terminal

Dans votre capture d'écran, je vois:
- **Pointeuse Principale:** 192.168.16.x (colonne "Adresse IP")
- **Notation:** Regardez la colonne complète pour avoir l'IP exacte

```bash
# Exemple d'IPs visibles:
- 192.168.16.x (Pointeur CIT & GAB)
- 192.168.16.x (Pointeuse Principale)
- 192.168.1.1 (TOMBEUR PRINCIPAL)
- 192.168.1.42 (pointeuse)
```

### Étape 2: Accéder à l'interface web

1. **Ouvrir un navigateur** (Chrome, Firefox, Edge)

2. **Taper l'adresse:**
   ```
   http://192.168.16.x
   ```
   Remplacez `.x` par votre IP complète (visible dans le tableau)

3. **Login:**
   - **Utilisateur:** `administrator` (ou `admin`)
   - **Mot de passe:** `123456` (par défaut)

   Si ça ne marche pas, essayez:
   - `admin` / `admin`
   - `admin` / (vide)
   - Le mot de passe configuré par votre entreprise

### Étape 3: Configurer le Push dans l'interface web

L'interface web varie selon le modèle, mais cherchez:

**Option A: Menu "Communication" ou "Network"**
```
Communication → Cloud Settings
├── Enable Cloud Service: ☑ Yes
├── Server URL: https://votre-domaine.com/api/v1/attendance/push
├── Port: 443 (ou 80)
└── Push Mode: Real-time
```

**Option B: Menu "System" → "Cloud"**
```
System → CloudAtt Settings
├── CloudAtt: Enable
├── Server Address: votre-domaine.com
├── Path: /api/v1/attendance/push
└── Protocol: HTTP (ou HTTPS)
```

**Option C: Menu "Options"**
```
Options → Advanced → Cloud Push
├── Enable Push: ON
├── Push URL: http://votre-domaine.com/api/v1/attendance/push
└── Interval: Immediate
```

### Étape 4: Sauvegarder et redémarrer

1. Cliquer sur **"Save"** ou **"Apply"**
2. Redémarrer le terminal (Menu → System → Restart)
3. Attendre 1-2 minutes

---

## 🚫 SI VOUS NE POUVEZ PAS ACCÉDER À L'INTERFACE WEB

### Causes possibles:

1. **Port HTTP désactivé sur le terminal**
   - Solution: Activer dans ZKAccess → Paramètres → Communication → Enable HTTP

2. **Firewall bloque l'accès**
   - Solution: Désactiver temporairement le firewall Windows
   - Ou ajouter une exception pour 192.168.16.x

3. **Interface web désactivée sur ce modèle**
   - Certains vieux modèles n'ont pas d'interface web
   - → Passez à la MÉTHODE 3

---

## 🔧 MÉTHODE 3: Configuration via ZKAccess (Upload Settings)

Si votre logiciel ZKAccess permet l'upload de configuration:

### Étape 1: Créer un fichier de configuration

Créez un fichier `cloud_config.txt`:

```ini
[CloudAtt]
Enable=1
ServerAddress=votre-domaine.com
ServerPort=443
PushPath=/api/v1/attendance/push
Protocol=HTTPS
PushInterval=0
RealTime=1
```

### Étape 2: Upload via ZKAccess

1. Dans ZKAccess, sélectionner le terminal
2. Menu → "Équipement" → "Upload Configuration"
3. Sélectionner votre fichier `cloud_config.txt`
4. Appliquer

---

## 📱 MÉTHODE 4: Configuration sur le Terminal physique

Si vous avez accès physique au terminal:

### Sur l'écran du terminal:

1. **Accéder au menu admin:**
   ```
   Menu → (code admin) → OK
   Code par défaut: 9999 ou 123456
   ```

2. **Navigation:**
   ```
   Menu → Système → Communication → Cloud
   ou
   Menu → Options → Comm → Cloud Server
   ```

3. **Configurer:**
   ```
   Cloud Service: ON
   Server URL: votre-domaine.com/api/v1/attendance/push
   Port: 443
   Push: Enable
   ```

4. **Sauvegarder:**
   - OK → Restart

---

## 🧪 VÉRIFICATION: Est-ce que le Push fonctionne?

### Test 1: Depuis le terminal

Si l'interface web du terminal a une option "Test Connection":
```
Communication → Cloud Settings → Test Connection
```

Si succès: ✅ "Connection OK"
Si échec: ❌ Vérifier l'URL et le réseau

### Test 2: Faire un pointage réel

1. Pointer avec votre doigt/badge sur le terminal
2. Vérifier immédiatement les logs de votre backend:
   ```bash
   # Dans votre terminal WSL/Linux où tourne le backend
   # Vous devriez voir:
   📥 [Push URL] Données reçues du terminal: { ... }
   ✅ [Push URL] Pointage enregistré avec succès
   ```

3. Vérifier dans PointaFlex frontend
   - Recharger la page Attendance
   - Le nouveau pointage doit apparaître

### Test 3: Vérifier en base de données

```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres \
  -c "SELECT \"timestamp\", type, method FROM \"Attendance\" ORDER BY \"timestamp\" DESC LIMIT 3;"
```

---

## 🔍 IDENTIFIER LE MODÈLE DE VOS TERMINAUX

Dans votre capture d'écran, je vois la colonne "**Modèle de ...**":
- IN01
- MA300
- K40 ProID
- inBIO260
- F16
- F15

### Compatibilité Push par modèle:

| Modèle | Push Natif | Interface Web | Configuration |
|--------|-----------|---------------|---------------|
| **IN01** | ✅ Oui | ✅ Oui | Méthode 2 recommandée |
| **MA300** | ✅ Oui | ✅ Oui | Méthode 2 recommandée |
| **K40 ProID** | ✅ Oui | ✅ Oui | Méthode 2 + Cloud Att |
| **inBIO260** | ⚠️ Limité | ✅ Oui | Interface web uniquement |
| **F16** | ✅ Oui | ✅ Oui | Méthode 2 recommandée |

---

## ⚡ ACTION IMMÉDIATE RECOMMANDÉE

### Option 1: Via Interface Web (PLUS RAPIDE)

1. **Identifier l'IP exacte:**
   - Dans votre ZKAccess, cliquer sur "Pointeuse Principale"
   - Noter l'IP complète (colonne "Adresse IP")

2. **Ouvrir dans le navigateur:**
   ```
   http://[IP_DU_TERMINAL]
   ```

3. **Prendre une capture d'écran:**
   - De l'interface web qui s'affiche
   - Je pourrai vous guider précisément

4. **Si vous voyez un menu, cherchez:**
   - "Communication" ou "Cloud" ou "Network"
   - Options liées à "Push" ou "Server"

### Option 2: Configuration manuelle sur terminal

Si vous êtes physiquement devant le terminal:
1. Appuyer sur Menu
2. Entrer code admin (9999 ou 123456)
3. Chercher Communication → Cloud
4. Activer + configurer URL

---

## 🆘 ALTERNATIVE: Si RIEN ne marche

### Solution de secours: Microservice local

Si vraiment aucune configuration Push n'est possible (terminaux trop anciens):

**Déployer un petit service sur une machine locale:**

```bash
# Service léger qui tourne en arrière-plan
# Récupère les données toutes les 10s
# Les envoie à votre cloud
```

📄 Voir: `backend/scripts/device-connector/` (à créer si nécessaire)

**Avantages:**
- Fonctionne avec TOUS les terminaux
- Configuration une seule fois
- Service Windows peut démarrer automatiquement

**Inconvénient:**
- Nécessite un PC/serveur local allumé 24/7

---

## 📞 PROCHAINE ÉTAPE

**Faites ceci maintenant:**

1. **Identifier l'IP exacte de "Pointeuse Principale":**
   - Dans le tableau, colonne "Adresse IP"
   - Prendre note: `192.168.16.___`

2. **Tester l'accès web:**
   ```bash
   # Depuis votre navigateur
   http://192.168.16.[VOTRE_IP]
   ```

3. **Prendre une capture d'écran:**
   - De ce qui s'affiche
   - Ou me dire si "Connection refused" / "Page introuvable"

4. **Ensuite, je vous guiderai** exactement où configurer le Push dans VOTRE interface spécifique

---

**Quelle est l'IP exacte visible dans votre tableau pour "Pointeuse Principale"?**
**Et pouvez-vous accéder à http://[cette_IP] dans votre navigateur?**
