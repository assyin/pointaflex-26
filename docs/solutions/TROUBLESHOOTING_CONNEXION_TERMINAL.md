# 🔧 Résolution Problème de Connexion Terminal ZKTeco

## 🚨 Problème Actuel

Les terminaux sont **découverts** sur le réseau mais **ne sont pas accessibles** via le port 4370.

```
✅ Terminal visible dans la découverte réseau
❌ Port 4370 non accessible
❌ Ping échoue
```

## 🔍 Diagnostic

D'après l'image, vous avez 2 terminaux :
- **Principale** : 192.168.16.174:4370 (229 utilisateurs)
- **Pointeuse Cl** : 192.168.16.175:4370 (386 utilisateurs)

## 💡 Solutions (dans l'ordre de probabilité)

### Solution 1: Vérifier que vous êtes sur le MÊME réseau 🌐

Le problème le plus courant est que **votre PC WSL** et les **terminaux** ne sont pas sur le même réseau.

#### Test:
```bash
# Vérifier votre IP locale
ip addr show | grep "inet " | grep -v 127.0.0.1
```

**Résultat attendu** : Votre IP doit commencer par `192.168.16.xxx`

Si votre IP est différente (ex: `172.x.x.x` ou `10.x.x.x`), vous êtes sur un réseau différent.

#### ✅ Solution A: Utiliser le réseau Windows directement

Puisque l'outil de découverte fonctionne sur Windows, essayons d'y installer Python :

**Sur Windows** (pas WSL):
```cmd
# 1. Télécharger Python pour Windows
https://www.python.org/downloads/windows/

# 2. Installer avec "Add to PATH" coché

# 3. Installer les dépendances
pip install pyzk requests

# 4. Lancer le script depuis Windows
cd C:\Users\[VotreNom]\PointaFlex
python zkteco_bridge.py
```

#### ✅ Solution B: Configurer WSL en mode Bridge

```bash
# Dans PowerShell (Admin)
wsl --shutdown

# Puis démarrer WSL à nouveau
```

### Solution 2: Configurer le Terminal pour accepter les connexions externes ⚙️

Les terminaux ZKTeco ont souvent des restrictions de sécurité.

#### Via le Menu du Terminal:

1. **Accéder au menu**:
   ```
   MENU > Comm > Network > Advanced
   ```

2. **Activer les options**:
   - Enable TCP/IP : ✅ ON
   - TCP Port : 4370
   - RS232/485 : Désactivé (si vous utilisez Ethernet)

3. **Firewall du terminal**:
   ```
   MENU > System > Advanced > Firewall
   ```
   - Firewall : ❌ OFF (ou configurez les IPs autorisées)

4. **Redémarrer le terminal**:
   ```
   MENU > System > Reboot
   ```

### Solution 3: Vérifier le Firewall Windows 🛡️

Le firewall Windows peut bloquer les connexions WSL → Réseau local.

#### Sur Windows (PowerShell Admin):
```powershell
# Autoriser Python à travers le firewall
New-NetFirewallRule -DisplayName "Python ZKTeco" -Direction Outbound -Program "python.exe" -Action Allow

# Autoriser WSL
New-NetFirewallRule -DisplayName "WSL Network" -Direction Outbound -InterfaceAlias "vEthernet (WSL)" -Action Allow
```

### Solution 4: Utiliser l'adresse IP du logiciel de gestion 🔄

Si vous avez le **logiciel ZKAccess** installé:

1. Ouvrir ZKAccess
2. Se connecter au terminal (cela fonctionne apparemment)
3. Vérifier les paramètres réseau:
   - IP réelle du terminal
   - Port utilisé
   - Mode de communication

4. **Désactiver temporairement ZKAccess** pendant que vous testez le bridge Python (ils peuvent entrer en conflit).

### Solution 5: Tester depuis Windows directement 🪟

Créons un script de test Windows:

**test_windows.py** (à exécuter sur Windows, PAS WSL):
```python
import socket

ip = "192.168.16.174"
port = 4370

try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    result = sock.connect_ex((ip, port))
    sock.close()

    if result == 0:
        print(f"✅ Port {port} est OUVERT sur {ip}")
    else:
        print(f"❌ Port {port} est FERMÉ sur {ip}")
except Exception as e:
    print(f"❌ Erreur: {e}")

input("Appuyez sur Entrée pour continuer...")
```

Enregistrez ce fichier sur Windows et exécutez :
```cmd
python test_windows.py
```

### Solution 6: Configuration avancée du Terminal 🔧

#### Méthode A: Changer le mot de passe du terminal

Par défaut, certains terminaux ont un mot de passe qui bloque les connexions externes.

```python
# Dans zkteco_bridge.py, ligne 69, modifier:
zk = ZK(TERMINAL_IP, port=TERMINAL_PORT, timeout=5, password=0)

# Tester avec différents mots de passe:
# password=0      (par défaut)
# password=1234
# password=''     (chaîne vide)
```

#### Méthode B: Utiliser une connexion série

Si vraiment TCP ne fonctionne pas, certains terminaux peuvent se connecter via USB/RS485.

### Solution 7: Alternative - Push Service du Terminal 📤

Si le bridge Python ne fonctionne pas, configurez le terminal pour **envoyer** les données:

#### Sur le terminal:
```
MENU > Comm > Cloud > Push Settings

Push Enabled: ✅ ON
Server IP: [IP de votre serveur PointaFlex]
Server Port: 3000
Push Path: /api/v1/attendance/webhook
Method: POST
Interval: 10 seconds
```

Cela inverse la logique : le **terminal contacte PointaFlex** au lieu que PointaFlex contacte le terminal.

## 🧪 Tests Recommandés (dans l'ordre)

### Test 1: Vérifier le réseau
```bash
# Votre IP doit commencer par 192.168.16.x
ip addr show | grep 192.168.16
```

### Test 2: Tester depuis Windows
```cmd
# Sur Windows CMD
telnet 192.168.16.174 4370
```

Si ça fonctionne : le problème vient de WSL
Si ça ne fonctionne pas : le problème vient du terminal ou du réseau

### Test 3: Vérifier avec nmap (sur WSL)
```bash
sudo apt-get install nmap
nmap -p 4370 192.168.16.174
```

Résultat attendu :
```
PORT     STATE  SERVICE
4370/tcp open   unknown
```

### Test 4: Vérifier les routes
```bash
ip route
```

Doit montrer une route vers 192.168.16.0/24

## 📋 Checklist de Diagnostic

- [ ] Mon PC est sur le réseau 192.168.16.x
- [ ] Je peux ping 192.168.16.1 (passerelle)
- [ ] Le terminal est allumé et l'écran fonctionne
- [ ] Le terminal affiche une IP (MENU > System > Network)
- [ ] ZKAccess est fermé (pas de conflit)
- [ ] Firewall Windows configuré
- [ ] Firewall du terminal désactivé
- [ ] TCP/IP activé sur le terminal
- [ ] Port 4370 visible avec nmap

## 🆘 Si rien ne fonctionne

### Option A: Utiliser Windows nativement

Installer Python sur Windows et lancer le bridge depuis Windows (pas WSL).

**Avantages**:
- ✅ Pas de problème de réseau WSL
- ✅ Accès direct au réseau local
- ✅ Compatible avec ZKAccess

### Option B: Utiliser le Mode Push

Configurer le terminal pour qu'il envoie les données vers PointaFlex.

**Avantages**:
- ✅ Pas besoin de connexion sortante
- ✅ Plus simple
- ✅ Fonctionne même avec firewall

### Option C: Synchronisation manuelle

Utiliser le logiciel ZKAccess pour extraire les pointages et les importer dans PointaFlex.

**Avantages**:
- ✅ Garantie de fonctionnement
- ✅ Pas de configuration réseau complexe

**Inconvénients**:
- ⚠️ Pas en temps réel
- ⚠️ Nécessite une intervention manuelle

## 📞 Prochaine Étape

**Action immédiate** : Testez si le problème vient de WSL en essayant depuis Windows :

1. Installez Python sur Windows
2. Installez `pip install pyzk requests`
3. Copiez `zkteco_bridge.py` sur Windows
4. Lancez-le depuis cmd/PowerShell

Si ça fonctionne → Problème réseau WSL
Si ça ne fonctionne pas → Configuration terminal

---

**Besoin d'aide ?** Envoyez-moi le résultat de :
```bash
ip addr show
ip route
nmap -p 4370 192.168.16.174
```
