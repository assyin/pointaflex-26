# 🌐 CONFIGURATION RÉSEAU WSL → TERMINAL ZKTECO

## 📊 VOTRE SITUATION

```
Terminal ZKTeco              Windows                    WSL (Linux)
192.168.16.x          →    192.168.16.40         →    172.x.x.x
(réseau local)          (IP visible réseau)       (IP interne WSL)
                                                  Backend tourne ici!
```

**Problème:** Le terminal ne peut pas atteindre WSL directement.
**Solution:** Configurer Windows pour rediriger (port forwarding).

---

## ✅ ÉTAPE 1: Trouver l'IP de WSL

**Dans WSL (votre terminal Linux actuel):**

```bash
# Obtenir l'IP de WSL
hostname -I
```

Vous obtiendrez quelque chose comme: **`172.28.208.1`** (ou similaire)

**⚠️ IMPORTANT:** Notez cette IP! On va l'utiliser plusieurs fois.

**Exemple:**
```
$ hostname -I
172.28.208.1
```

→ **Votre IP WSL = 172.28.208.1** (exemple)

---

## ✅ ÉTAPE 2: Configurer le Port Forwarding

**Sur Windows, ouvrir PowerShell EN TANT QU'ADMINISTRATEUR:**

Clic droit sur "Windows PowerShell" → "Exécuter en tant qu'administrateur"

### Script complet à exécuter:

```powershell
# Remplacez 172.28.208.1 par VOTRE IP WSL obtenue à l'étape 1

# 1. Port 3000 (Backend PointaFlex)
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=192.168.16.40 connectport=3000 connectaddress=172.28.208.1

# 2. Port 8081 (ADMS Listener)
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=192.168.16.40 connectport=8081 connectaddress=172.28.208.1

# 3. Autoriser dans le firewall Windows
New-NetFirewallRule -DisplayName "PointaFlex Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "ADMS Listener" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow

# 4. Vérifier la configuration
netsh interface portproxy show v4tov4
```

**Résultat attendu:**
```
Listen on ipv4:             Connect to ipv4:

Address         Port        Address         Port
--------------- ----------  --------------- ----------
192.168.16.40   3000        172.28.208.1    3000
192.168.16.40   8081        172.28.208.1    8081
```

---

## ✅ ÉTAPE 3: Vérifier que le Backend écoute sur 0.0.0.0

**Dans WSL:**

```bash
# Vérifier que le backend écoute bien
netstat -tlnp | grep 3000
```

Vous devriez voir:
```
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN
```

**Si vous voyez `127.0.0.1:3000` au lieu de `0.0.0.0:3000`:**
→ Le backend n'écoute que sur localhost (j'ai déjà corrigé ça, redémarrez le backend)

---

## ✅ ÉTAPE 4: Tester la Configuration

### Test 1: Depuis Windows

**Sur Windows PowerShell (normal, pas admin):**

```powershell
# Tester que le port forwarding fonctionne
curl http://192.168.16.40:3000/api/v1/attendance/push
```

**Résultat attendu:**
- Pas "Connection refused" = ✅ Bon!
- Peut-être une erreur 400 ou 404 = ✅ Normal, le backend répond!

### Test 2: Depuis le réseau

**Sur un autre PC du même réseau (ou votre téléphone en WiFi):**

```bash
# Navigateur ou curl
http://192.168.16.40:3000/api/v1/attendance/push
```

Si vous voyez une réponse JSON = ✅ Parfait!

---

## ✅ ÉTAPE 5: Configuration du Terminal

**Sur le terminal ZKTeco IN01:**

### Si mode CloudAtt/HTTP disponible:

```
Mode Serveur: CloudAtt (ou HTTP)
Adresse du serveur: 192.168.16.40
Port du serveur: 3000
Permettre Serveur Proxy: NON
```

### Si seulement ADMS disponible:

```
Mode Serveur: ADMS
Adresse du serveur: 192.168.16.40
Port du serveur: 8081
Permettre Serveur Proxy: NON
```

**Puis:**
1. Sauvegarder
2. Redémarrer le terminal

---

## ✅ ÉTAPE 6: Lancer le Listener ADMS (si mode ADMS)

**Dans WSL:**

```bash
# Installer les dépendances
pip3 install requests

# Lancer le listener
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

---

## 🧪 ÉTAPE 7: Test Final

**1. Sur le terminal, faire un pointage** (doigt/badge)

**2. Vérifier les logs:**

**Si mode CloudAtt/HTTP:**
- Dans les logs du backend WSL, vous devriez voir:
  ```
  📥 [Push URL] Données reçues du terminal: { ... }
  ✅ [Push URL] Pointage enregistré avec succès
  ```

**Si mode ADMS:**
- Dans les logs du `adms_listener.py`:
  ```
  🔌 Nouvelle connexion depuis: (192.168.16.x, port)
  📥 Données reçues...
  ✅ Pointage envoyé: 1091 à 2025-11-27T...
  ```

**3. Vérifier en base de données:**

```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres \
  -c "SELECT \"timestamp\", type, method FROM \"Attendance\" ORDER BY \"timestamp\" DESC LIMIT 1;"
```

---

## 🔧 DÉPANNAGE

### Problème: "Connection refused" depuis Windows

**Vérifier que WSL est bien accessible:**

```powershell
# PowerShell Windows
# Remplacez 172.28.208.1 par votre IP WSL
Test-NetConnection -ComputerName 172.28.208.1 -Port 3000
```

Si ça échoue:
1. Vérifier que le backend tourne dans WSL
2. Vérifier qu'il écoute sur `0.0.0.0:3000`

### Problème: Port forwarding ne fonctionne pas

**Supprimer et recréer:**

```powershell
# PowerShell Admin
# Supprimer les règles existantes
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=192.168.16.40
netsh interface portproxy delete v4tov4 listenport=8081 listenaddress=192.168.16.40

# Recréer (avec la bonne IP WSL!)
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=192.168.16.40 connectport=3000 connectaddress=172.x.x.x
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=192.168.16.40 connectport=8081 connectaddress=172.x.x.x
```

### Problème: L'IP WSL change à chaque redémarrage

**Solution: Script automatique**

Créer un fichier `setup-wsl-forwarding.ps1`:

```powershell
# setup-wsl-forwarding.ps1
$wslIP = (wsl hostname -I).Trim()

# Supprimer les anciennes règles
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=192.168.16.40
netsh interface portproxy delete v4tov4 listenport=8081 listenaddress=192.168.16.40

# Créer les nouvelles règles
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=192.168.16.40 connectport=3000 connectaddress=$wslIP
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=192.168.16.40 connectport=8081 connectaddress=$wslIP

Write-Host "Port forwarding configuré pour WSL IP: $wslIP"
netsh interface portproxy show v4tov4
```

**Exécuter ce script à chaque démarrage Windows** (Tâche planifiée)

---

## 📝 RÉSUMÉ: CE QU'IL FAUT FAIRE MAINTENANT

### ✅ CHECKLIST:

- [ ] **1. Trouver l'IP WSL** (`hostname -I` dans WSL)
- [ ] **2. Configurer port forwarding** (PowerShell Admin)
- [ ] **3. Autoriser firewall** (PowerShell Admin)
- [ ] **4. Redémarrer le backend WSL** (si nécessaire)
- [ ] **5. Vérifier que 0.0.0.0:3000 écoute** (`netstat -tlnp | grep 3000`)
- [ ] **6. Tester depuis Windows** (`curl http://192.168.16.40:3000/...`)
- [ ] **7. Configurer le terminal** (192.168.16.40:3000 ou :8081)
- [ ] **8. Si ADMS, lancer le listener** (`python3 adms_listener.py`)
- [ ] **9. Test avec un pointage**
- [ ] **10. Vérifier en base de données**

---

## 🎯 ORDRE D'EXÉCUTION

**1. Dans WSL:**
```bash
hostname -I
# Noter l'IP: par exemple 172.28.208.1
```

**2. Dans PowerShell Admin (Windows):**
```powershell
# Remplacer 172.28.208.1 par votre IP WSL
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=192.168.16.40 connectport=3000 connectaddress=172.28.208.1
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=192.168.16.40 connectport=8081 connectaddress=172.28.208.1
New-NetFirewallRule -DisplayName "PointaFlex Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "ADMS Listener" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

**3. Dans WSL, vérifier le backend:**
```bash
netstat -tlnp | grep 3000
# Devrait afficher: 0.0.0.0:3000
```

**4. Tester depuis Windows:**
```powershell
curl http://192.168.16.40:3000/api/v1/attendance/push
```

**5. Configurer le terminal ZKTeco**

**6. Tester avec un pointage!**

---

**Commencez par l'ÉTAPE 1: Quelle est votre IP WSL?**

```bash
hostname -I
```
