# 🔧 SOLUTION: IP WSL Dynamique

## ⚠️ LE PROBLÈME

**Question:** Est-ce que l'adresse `172.17.112.163` reste fixe ou va changer?

**Réponse:** ❌ **Elle va CHANGER!**

Avec WSL2, l'adresse IP change à **chaque redémarrage de Windows**.

---

## ✅ SOLUTION AUTOMATIQUE (Recommandée)

### Script PowerShell qui s'adapte automatiquement

J'ai créé le fichier: `setup-wsl-forwarding.ps1`

Ce script:
- ✅ Détecte automatiquement l'IP WSL actuelle
- ✅ Supprime les anciennes règles
- ✅ Crée les nouvelles règles avec la bonne IP
- ✅ Configure le firewall Windows
- ✅ Peut être exécuté à chaque démarrage

---

## 📋 ÉTAPES D'UTILISATION

### ÉTAPE 1: Copier le script sur Windows

**Dans WSL (Linux):**
```bash
# Le script est déjà dans votre projet
ls -la /home/assyin/PointaFlex/setup-wsl-forwarding.ps1
```

**Copier vers Windows:**
```bash
# Option 1: Via explorateur Windows
# Ouvrir l'explorateur: \\wsl$\Ubuntu\home\assyin\PointaFlex
# Copier setup-wsl-forwarding.ps1 sur le Bureau Windows

# Option 2: Via commande (si dossier Windows accessible)
cp setup-wsl-forwarding.ps1 /mnt/c/Users/[VotreNom]/Desktop/
```

---

### ÉTAPE 2: Exécuter le script (PowerShell Admin)

**Sur Windows:**

1. **Ouvrir PowerShell en tant qu'Administrateur:**
   - Clic droit sur le menu Démarrer
   - "Windows PowerShell (Admin)" ou "Terminal (Admin)"

2. **Aller vers le dossier où est le script:**
   ```powershell
   cd C:\Users\[VotreNom]\Desktop
   ```

3. **Autoriser l'exécution de scripts (première fois uniquement):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Répondre "O" (Oui) ou "Y" (Yes)

4. **Exécuter le script:**
   ```powershell
   .\setup-wsl-forwarding.ps1
   ```

---

### ÉTAPE 3: Résultat attendu

Vous devriez voir:
```
================================
  Configuration Port Forwarding WSL
================================

[1/4] Récupération de l'IP WSL...
   ✅ IP WSL détectée: 172.17.112.163

[2/4] Récupération de l'IP Windows...
   ✅ IP Windows: 192.168.16.40

[3/4] Suppression des anciennes règles...
   ✅ Anciennes règles supprimées

[4/4] Création des nouvelles règles...
   ✅ Port 3000 (Backend) configuré
   ✅ Port 8081 (ADMS Listener) configuré

[5/5] Configuration du Firewall...
   ✅ Règle Firewall Backend créée
   ✅ Règle Firewall ADMS créée

================================
  CONFIGURATION TERMINÉE ✅
================================

📋 Configuration actuelle du Port Forwarding:

Listen on ipv4:             Connect to ipv4:

Address         Port        Address         Port
--------------- ----------  --------------- ----------
192.168.16.40   3000        172.17.112.163  3000
192.168.16.40   8081        172.17.112.163  8081
```

---

## 🔄 AUTOMATISER AU DÉMARRAGE (Important!)

Pour que ça fonctionne après chaque redémarrage Windows, vous devez:

### Option A: Tâche Planifiée Windows (Recommandé)

1. **Ouvrir "Planificateur de tâches":**
   - Win + R → `taskschd.msc` → Entrée

2. **Créer une nouvelle tâche:**
   - Actions → "Créer une tâche..."
   - **Général:**
     - Nom: `WSL Port Forwarding`
     - ☑ Exécuter avec les privilèges les plus élevés
   - **Déclencheurs:**
     - Nouveau → "À l'ouverture de session"
     - Ou "Au démarrage du système"
   - **Actions:**
     - Nouveau → "Démarrer un programme"
     - Programme: `powershell.exe`
     - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\[VotreNom]\Desktop\setup-wsl-forwarding.ps1"`
   - **Conditions:**
     - Décocher "Démarrer uniquement si l'ordinateur est relié au secteur"

3. **Tester:**
   - Clic droit sur la tâche → "Exécuter"
   - Vérifier qu'elle fonctionne

### Option B: Raccourci dans le dossier Démarrage

1. **Créer un fichier .bat:**
   Créer `start-wsl-forwarding.bat`:
   ```batch
   @echo off
   powershell.exe -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-ExecutionPolicy Bypass -File C:\Users\[VotreNom]\Desktop\setup-wsl-forwarding.ps1'"
   ```

2. **Placer dans le dossier Démarrage:**
   - Win + R → `shell:startup` → Entrée
   - Copier le fichier .bat dans ce dossier

---

## 🧪 VÉRIFICATION APRÈS EXÉCUTION

### Test 1: Port Forwarding actif?

**PowerShell (normal, pas admin):**
```powershell
netsh interface portproxy show v4tov4
```

Vous devriez voir:
```
Address         Port        Address         Port
--------------- ----------  --------------- ----------
192.168.16.40   3000        172.x.x.x       3000
192.168.16.40   8081        172.x.x.x       8081
```

### Test 2: Backend accessible depuis Windows?

**PowerShell:**
```powershell
curl http://192.168.16.40:3000/api/docs
```

Si vous voyez du HTML ou "Cannot GET" = ✅ Ça marche!

### Test 3: Accessible depuis le réseau?

**Sur un autre PC du même réseau (ou téléphone en WiFi):**
```
http://192.168.16.40:3000/api/docs
```

Si page Swagger s'affiche = ✅ Parfait!

---

## ❌ SOLUTION ALTERNATIVE: IP WSL Statique (Avancé)

Si vous voulez une IP WSL fixe, c'est plus complexe:

### Créer `.wslconfig` sur Windows:

**Fichier:** `C:\Users\[VotreNom]\.wslconfig`

```ini
[wsl2]
networkingMode=bridged
vmSwitch=WSLBridge
dhcp=false
ipv6=false
```

**Puis dans WSL, configurer IP statique:**

`/etc/wsl.conf`:
```ini
[network]
generateResolvConf = false

[boot]
systemd=true
```

`/etc/systemd/network/eth0.network`:
```ini
[Match]
Name=eth0

[Network]
Address=172.17.112.163/24
Gateway=172.17.112.1
DNS=8.8.8.8
```

⚠️ **Attention:** Cette méthode est complexe et peut causer d'autres problèmes réseau.

**→ Je recommande plutôt le script automatique!**

---

## 🎯 PROCHAINES ÉTAPES (MAINTENANT)

### 1. Exécuter le script PowerShell

```powershell
# PowerShell Admin
cd C:\Users\[VotreNom]\Desktop
.\setup-wsl-forwarding.ps1
```

### 2. Vérifier que ça marche

```powershell
# PowerShell normal
curl http://192.168.16.40:3000/api/docs
```

### 3. Dans WSL, lancer le listener ADMS

```bash
cd /home/assyin/PointaFlex
python3 adms_listener.py
```

Vous devriez voir:
```
🎧 ADMS Protocol Listener pour ZKTeco IN01
================================================================
  • Port d'écoute: 8081
  • Backend: http://localhost:3000/api/v1/attendance/push
⏳ En attente de connexions des terminaux...
```

### 4. Configurer le terminal IN01

**Sur l'écran du terminal:**
```
Configuration Serveur Cloud
├── Mode Serveur: ADMS (garder)
├── Adresse du serveur: 192.168.16.40
├── Port du serveur: 8081
└── Permettre Serveur Proxy: NON
```

Sauvegarder et redémarrer.

### 5. Test final

1. Faire un pointage sur le terminal
2. Vérifier les logs du listener ADMS:
   ```
   🔌 Nouvelle connexion depuis: (192.168.16.x, port)
   📥 Données reçues...
   ✅ Pointage envoyé
   ```
3. Vérifier dans PointaFlex frontend
4. Vérifier en base de données:
   ```bash
   PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com \
     -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres \
     -c "SELECT \"timestamp\", type FROM \"Attendance\" ORDER BY \"timestamp\" DESC LIMIT 1;"
   ```

---

## 📞 RÉSUMÉ ULTRA-RAPIDE

**Problème:** IP WSL change à chaque redémarrage

**Solution:**
1. ✅ Script PowerShell créé: `setup-wsl-forwarding.ps1`
2. ✅ Exécuter en PowerShell Admin
3. ✅ Ajouter en Tâche Planifiée Windows
4. ✅ Plus de problème d'IP!

**Maintenant:**
- Copier le script sur Windows (Desktop)
- Exécuter en PowerShell Admin
- Lancer `python3 adms_listener.py` dans WSL
- Configurer le terminal avec `192.168.16.40:8081`
- Tester un pointage!

---

**Commencez par copier le script sur Windows et l'exécuter en PowerShell Admin!**
