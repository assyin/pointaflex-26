# 🛑 ARRÊT ET DÉSACTIVATION DES SCRIPTS PYTHON

**Date :** 2025-11-26
**Objectif :** Arrêter les anciens scripts Python pour vérifier que le Push URL fonctionne

---

## 🎯 Étapes à Suivre sur Windows

### ÉTAPE 1 : Arrêter les Processus Python

**Méthode A : Via le Gestionnaire des Tâches (Le Plus Simple)**

1. **Ouvrir le Gestionnaire des tâches :**
   - `Ctrl + Shift + Esc`
   - Ou clic droit sur la barre des tâches → Gestionnaire des tâches

2. **Aller dans l'onglet "Détails"** (ou "Processus" sur Windows 11)

3. **Chercher les processus Python :**
   - Nom : `python.exe` ou `pythonw.exe`
   - Description : Ligne de commande contenant `zkteco_terminal`

4. **Sélectionner et tuer les processus :**
   - Clic droit → **Fin de tâche**
   - Faire ça pour TOUS les processus `python.exe` liés aux terminaux

**Méthode B : Via PowerShell**

```powershell
# Ouvrir PowerShell en administrateur

# Lister tous les processus Python
Get-Process python* | Select-Object Id, ProcessName, Path

# Tuer tous les processus Python (ATTENTION : tue TOUS les Python)
Get-Process python* | Stop-Process -Force

# Ou tuer spécifiquement ceux des terminaux
Get-Process | Where-Object {$_.Path -like "*zkteco*"} | Stop-Process -Force
```

**Méthode C : Via Commande CMD**

```cmd
# Ouvrir CMD en administrateur

# Lister les processus Python
tasklist | findstr python

# Tuer tous les processus Python
taskkill /F /IM python.exe
taskkill /F /IM pythonw.exe
```

---

## ÉTAPE 2 : Désactiver le Démarrage Automatique

### A. Supprimer du Démarrage Windows

**Via l'interface :**

1. **Ouvrir le Gestionnaire des tâches** (`Ctrl + Shift + Esc`)
2. **Onglet "Démarrage"**
3. **Chercher les scripts ZKTeco :**
   - Peut être nommé : "START_ZKTECO", "Terminal_Bridge", etc.
4. **Clic droit → Désactiver**

**Via le dossier Démarrage :**

1. **Ouvrir le dossier de démarrage :**
   ```
   Appuyez sur Win + R
   Tapez : shell:startup
   Appuyez sur Entrée
   ```

2. **Supprimer les fichiers :**
   - Chercher `.vbs` ou `.bat` liés aux terminaux
   - Exemples : `START_ZKTECO_BRIDGES.vbs`, `start_terminals.bat`
   - **Supprimer ou déplacer ailleurs (backup)**

### B. Localiser et Désactiver les Scripts VBS

**Emplacements possibles :**

```
C:\Users\yassi\START_ZKTECO_BRIDGES.vbs
C:\Users\yassi\start_terminals.vbs
C:\Users\yassi\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\
```

**Actions :**

1. **Chercher tous les fichiers .vbs :**
   - Ouvrir l'explorateur : `C:\Users\yassi\`
   - Recherche : `*.vbs`
   - Identifier ceux liés aux terminaux

2. **Options :**
   - **Option 1 :** Supprimer (si vous êtes sûr)
   - **Option 2 :** Renommer en `.vbs.old` (backup)
   - **Option 3 :** Déplacer dans un dossier "BACKUP"

---

## ÉTAPE 3 : Vérifier que Tout est Arrêté

### Test 1 : Vérifier les Processus

**PowerShell :**
```powershell
Get-Process python* | Select-Object Id, ProcessName, Path
```

**Résultat attendu :** Aucun processus ou seulement ceux non liés aux terminaux

### Test 2 : Vérifier les Logs

**Les anciens logs ne doivent plus bouger :**

```
C:\Users\yassi\terminal1.log
C:\Users\yassi\terminal2.log
C:\Users\yassi\terminal1_improved.log
C:\Users\yassi\terminal2_improved.log
```

**Vérifier :**
- Ouvrir le fichier avec Notepad
- La dernière ligne doit avoir un timestamp ancien
- **Si le timestamp continue d'augmenter → Script encore actif !**

### Test 3 : Attendre et Observer

1. **Faire un pointage sur le terminal**
2. **Attendre 30 secondes**
3. **Vérifier la base de données :**

```bash
# Sur Linux/WSL
PGPASSWORD='MAMPAPOLino0102' psql \
  -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.apeyodpxnxxwdxwcnqmo \
  -d postgres \
  -c "SELECT timestamp, matricule, method FROM \"Attendance\" a LEFT JOIN \"Employee\" e ON a.\"employeeId\" = e.id ORDER BY a.\"createdAt\" DESC LIMIT 3;"
```

**Si le pointage arrive encore → Scripts Python tournent toujours OU Push URL fonctionne**

---

## ÉTAPE 4 : Sauvegarder les Scripts (Recommandé)

**Avant de supprimer, créer un backup :**

```cmd
# Sur Windows
mkdir C:\Users\yassi\BACKUP_SCRIPTS_PYTHON
xcopy C:\Users\yassi\zkteco*.py C:\Users\yassi\BACKUP_SCRIPTS_PYTHON\
xcopy C:\Users\yassi\*.vbs C:\Users\yassi\BACKUP_SCRIPTS_PYTHON\
xcopy C:\Users\yassi\*.bat C:\Users\yassi\BACKUP_SCRIPTS_PYTHON\
```

---

## ÉTAPE 5 : Supprimer les Scripts (Optionnel)

**Uniquement si vous êtes sûr que le Push URL fonctionne !**

**Fichiers à supprimer :**

```
C:\Users\yassi\zkteco_terminal1_log.py
C:\Users\yassi\zkteco_terminal2_log.py
C:\Users\yassi\zkteco_terminal1_improved.py
C:\Users\yassi\zkteco_terminal2_improved.py
C:\Users\yassi\START_ZKTECO_BRIDGES.vbs
C:\Users\yassi\STOP_ZKTECO_BRIDGES.bat
C:\Users\yassi\terminal1.log
C:\Users\yassi\terminal2.log
C:\Users\yassi\terminal1_improved.log
C:\Users\yassi\terminal2_improved.log
C:\Users\yassi\attendance_queue_t1.json
C:\Users\yassi\attendance_queue_t2.json
```

**Commande PowerShell :**
```powershell
# Aller dans le dossier
cd C:\Users\yassi

# Supprimer les scripts (ATTENTION : vérifier avant !)
Remove-Item zkteco*.py
Remove-Item *ZKTECO*.vbs
Remove-Item *ZKTECO*.bat
Remove-Item terminal*.log
Remove-Item attendance_queue*.json
```

---

## 🧪 TEST FINAL : Vérifier que c'est bien le Push URL

### Scénario de Test

1. **Arrêter TOUS les scripts Python** (étapes ci-dessus)

2. **Redémarrer le backend PointaFlex** (pour être sûr)
   ```bash
   # Sur Linux/WSL
   cd /home/assyin/PointaFlex/backend
   # Arrêter le backend (Ctrl+C si en cours)
   npm run start:dev
   ```

3. **Faire un pointage sur le terminal**

4. **Vérifier les logs du backend :**
   ```
   📥 [Push URL] Données reçues du terminal: {...}
   ✅ [Push URL] Pointage enregistré avec succès
   ```

5. **Si vous voyez ces logs → ✅ C'EST LE PUSH URL QUI FONCTIONNE !**

6. **Si rien n'apparaît → Scripts Python encore actifs OU Push URL non configuré**

---

## 📊 COMPARAISON : Script Python vs Push URL

**Comment savoir lequel est actif ?**

| Indice | Script Python | Push URL |
|--------|---------------|----------|
| **Logs backend** | Pas de `[Push URL]` | Messages `📥 [Push URL]` |
| **Délai** | Jusqu'à 10s | Quasi-instantané |
| **Fichier log Windows** | `terminal1.log` se met à jour | Aucun changement |
| **Processus Python** | `python.exe` visible | Aucun |
| **Headers HTTP** | `X-Device-ID` présent | Body JSON avec `SN` |

---

## 🎯 CHECKLIST COMPLÈTE

- [ ] Arrêter tous les processus Python
- [ ] Vérifier dans le Gestionnaire des tâches (aucun python.exe)
- [ ] Désactiver le démarrage automatique
- [ ] Supprimer/renommer les fichiers .vbs
- [ ] Créer un backup des scripts (au cas où)
- [ ] Redémarrer le backend PointaFlex
- [ ] Faire un pointage de test
- [ ] Vérifier les logs backend (doit voir `[Push URL]`)
- [ ] Vérifier que le pointage arrive en base
- [ ] Confirmer que c'est bien le Push URL (pas les scripts)

---

## 🔧 DÉPANNAGE

### Problème : Les pointages continuent d'arriver même après avoir tué Python

**Possibilités :**

1. ✅ **Le Push URL fonctionne !** (c'est ce qu'on veut)
   - Vérifier les logs backend pour `[Push URL]`

2. ❌ **Un autre processus Python tourne encore**
   - Chercher : `Get-Process python*`
   - Tuer TOUS les processus

3. ❌ **Script relancé automatiquement**
   - Vérifier le démarrage Windows
   - Vérifier les tâches planifiées : `taskschd.msc`

### Problème : Plus aucun pointage n'arrive après avoir arrêté Python

**Cause :** Le Push URL n'est pas encore configuré sur le terminal

**Solutions :**

1. **Reconfigurer le Push URL** (voir `CONFIGURATION_TERMINAL_IN01.md`)

2. **OU relancer les scripts Python temporairement :**
   ```cmd
   cd C:\Users\yassi
   python zkteco_terminal1_improved.py
   ```

---

## 📞 SCRIPT RAPIDE D'ARRÊT

**Créer un fichier `ARRETER_TOUT.bat` :**

```batch
@echo off
echo ========================================
echo   ARRÊT DES SCRIPTS PYTHON - TERMINAUX
echo ========================================
echo.

echo [1/3] Arrêt des processus Python...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM pythonw.exe 2>nul

echo [2/3] Vérification...
timeout /t 2 /nobreak >nul
tasklist | findstr python

echo [3/3] Terminé !
echo.
echo Si des processus Python apparaissent ci-dessus,
echo ouvrez le Gestionnaire des tâches et tuez-les manuellement.
echo.
pause
```

**Utilisation :**
1. Créer le fichier `C:\Users\yassi\ARRETER_TOUT.bat`
2. Double-clic pour exécuter
3. Les scripts Python sont arrêtés

---

## ✅ CONFIRMATION

**Après avoir tout arrêté, vous devriez :**

1. ✅ Ne plus voir `python.exe` dans le Gestionnaire des tâches
2. ✅ Les logs `terminal1.log` ne bougent plus
3. ✅ Les pointages arrivent toujours (via Push URL)
4. ✅ Voir `📥 [Push URL]` dans les logs backend

**Si tout ça est vrai → 🎉 LE PUSH URL FONCTIONNE !**

---

**Date :** 2025-11-26
**Objectif :** ✅ Arrêter les anciens scripts Python
**Résultat attendu :** Seul le Push URL natif est actif
