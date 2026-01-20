# 🪟 Installation du Bridge ZKTeco sur Windows

## Étape 1: Copier les fichiers sur Windows

Depuis WSL, copiez les fichiers vers votre répertoire Windows :

```bash
# Dans WSL
cp /home/assyin/PointaFlex/zkteco_bridge.py /mnt/c/Users/yassi/
cp /home/assyin/PointaFlex/requirements.txt /mnt/c/Users/yassi/ 2>/dev/null || echo "requirements.txt optionnel"
```

## Étape 2: Installer Python sur Windows

1. Téléchargez Python pour Windows:
   - URL: https://www.python.org/downloads/windows/
   - Choisissez la dernière version (3.11 ou 3.12)

2. **IMPORTANT**: Pendant l'installation
   - ✅ Cochez "Add Python to PATH"
   - ✅ Cochez "Install for all users" (optionnel)

3. Vérifiez l'installation:
   ```cmd
   python --version
   ```
   Devrait afficher: `Python 3.x.x`

## Étape 3: Installer les dépendances

Dans CMD (en tant qu'administrateur si possible):

```cmd
cd C:\Users\yassi
pip install pyzk requests
```

## Étape 4: Configurer le script

Ouvrez le fichier `zkteco_bridge.py` avec Notepad et modifiez:

```python
# Ligne 13-18
TERMINAL_IP = "192.168.16.174"      # ⚠️ Votre IP de terminal
TERMINAL_PORT = 4370
BACKEND_URL = "http://localhost:3000/api/v1/attendance/webhook"
DEVICE_ID = "IN01-RH-001"
TENANT_ID = "90fab0cc-8539-4566-8da7-8742e9b6937b"
CHECK_INTERVAL = 10
```

## Étape 5: Tester

```cmd
cd C:\Users\yassi
python zkteco_bridge.py
```

Vous devriez voir :
```
🔄 Connexion au terminal ZKTeco à 192.168.16.174:4370...
✅ Connecté au terminal: IN01
📊 Version firmware: Ver 8.0.4.6
👥 Utilisateurs enregistrés: 229
🚀 Début de la synchronisation
```

## Étape 6: Démarrage automatique (optionnel)

### Méthode A: Tâche planifiée Windows

1. Ouvrez "Planificateur de tâches"
2. Créer une tâche simple:
   - Nom: ZKTeco Bridge
   - Déclencheur: Au démarrage
   - Action: Démarrer un programme
     - Programme: `C:\Users\yassi\AppData\Local\Programs\Python\Python311\python.exe`
     - Arguments: `C:\Users\yassi\zkteco_bridge.py`

### Méthode B: Service Windows avec NSSM

Plus avancé mais plus professionnel.

## Troubleshooting Windows

### Problème: "python n'est pas reconnu"

```cmd
# Trouver où Python est installé
where python

# Utiliser le chemin complet
C:\Users\yassi\AppData\Local\Programs\Python\Python311\python.exe zkteco_bridge.py
```

### Problème: Firewall bloque

```powershell
# PowerShell en Admin
New-NetFirewallRule -DisplayName "Python ZKTeco" -Direction Outbound -Program "C:\Users\yassi\AppData\Local\Programs\Python\Python311\python.exe" -Action Allow
```

## Vérification finale

- [ ] Python installé et dans PATH
- [ ] pyzk et requests installés (`pip list`)
- [ ] zkteco_bridge.py copié dans C:\Users\yassi
- [ ] IP du terminal configurée
- [ ] Test de connexion réussi
