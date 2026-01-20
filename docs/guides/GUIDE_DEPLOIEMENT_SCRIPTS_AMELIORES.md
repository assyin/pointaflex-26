# 🚀 GUIDE DE DÉPLOIEMENT - SCRIPTS AMÉLIORÉS

**Version:** 2.0 (avec Retry Logic + Circuit Breaker + Queue Locale)  
**Date:** 2025-11-26

---

## 📋 Résumé des Améliorations

Les nouveaux scripts incluent :

✅ **Retry Logic avec Exponential Backoff**  
   - 5 tentatives avant abandon
   - Délais: 2s, 4s, 8s, 16s, 32s

✅ **Circuit Breaker**  
   - Détecte backend down après 10 échecs
   - Passe en mode dégradé automatiquement
   - Se rétablit automatiquement

✅ **Queue Locale avec Persistance**  
   - Stocke les pointages si backend indisponible
   - Resynchronise automatiquement
   - Zéro perte de données

✅ **Timeout Augmenté**  
   - Passé de 5s à 10s
   - Réduit les erreurs de timeout

✅ **Filtrage des Employés de Test**  
   - Ignore les employés 78 et 80
   - Configurable facilement

---

## 📁 Emplacement des Fichiers

### Scripts de Référence (Linux)
```
/home/assyin/PointaFlex/scripts/zkteco_terminal_improved.py
```

### À Déployer sur Windows
```
C:\Users\yassi\zkteco_terminal1_improved.py
C:\Users\yassi\zkteco_terminal2_improved.py
```

---

## 🔧 ÉTAPE 1 : Copier les Scripts sur Windows

### Option A: Via WSL (Recommandé)

```bash
# Depuis WSL
cp /home/assyin/PointaFlex/scripts/zkteco_terminal_improved.py /mnt/c/Users/yassi/zkteco_terminal1_improved.py
cp /home/assyin/PointaFlex/scripts/zkteco_terminal_improved.py /mnt/c/Users/yassi/zkteco_terminal2_improved.py
```

### Option B: Copie Manuelle
1. Ouvrir l'explorateur Windows
2. Aller dans `\\wsl.localhost\Ubuntu\home\assyin\PointaFlex\scripts\`
3. Copier `zkteco_terminal_improved.py`
4. Coller dans `C:\Users\yassi\`
5. Renommer en `zkteco_terminal1_improved.py` et `zkteco_terminal2_improved.py`

---

## ⚙️ ÉTAPE 2 : Configurer Terminal 1

Éditer `C:\Users\yassi\zkteco_terminal1_improved.py` :

```python
# Ligne 21-29 : Configuration Terminal 1
TERMINAL_IP = "192.168.16.174"
TERMINAL_PORT = 4370
BACKEND_URL = "http://localhost:3000/api/v1/attendance/webhook"
DEVICE_ID = "TERMINAL-PRINC-001"
TENANT_ID = "90fab0cc-8539-4566-8da7-8742e9b6937b"
CHECK_INTERVAL = 10
LOG_FILE = "C:\\Users\\yassi\\terminal1_improved.log"
QUEUE_FILE = "C:\\Users\\yassi\\attendance_queue_t1.json"
```

---

## ⚙️ ÉTAPE 3 : Configurer Terminal 2

Éditer `C:\Users\yassi\zkteco_terminal2_improved.py` :

```python
# Ligne 21-29 : Configuration Terminal 2
TERMINAL_IP = "192.168.16.175"  # ⬅️ CHANGER
TERMINAL_PORT = 4370
BACKEND_URL = "http://localhost:3000/api/v1/attendance/webhook"
DEVICE_ID = "Terminal_CIT_GAB"  # ⬅️ CHANGER
TENANT_ID = "90fab0cc-8539-4566-8da7-8742e9b6937b"
CHECK_INTERVAL = 10
LOG_FILE = "C:\\Users\\yassi\\terminal2_improved.log"  # ⬅️ CHANGER
QUEUE_FILE = "C:\\Users\\yassi\\attendance_queue_t2.json"  # ⬅️ CHANGER
```

---

## 🧪 ÉTAPE 4 : Tester les Nouveaux Scripts

### Test Terminal 1

```batch
cd C:\Users\yassi
python zkteco_terminal1_improved.py
```

**Vérifier :**
- ✅ Connexion au terminal réussie
- ✅ Logs dans `terminal1_improved.log`
- ✅ Messages de circuit breaker et retry

### Test Terminal 2

```batch
cd C:\Users\yassi
python zkteco_terminal2_improved.py
```

**Ctrl+C pour arrêter après quelques secondes.**

---

## 🔄 ÉTAPE 5 : Mettre à Jour les Scripts de Démarrage

### Option A : Créer Nouveaux Scripts VBS

**`START_IMPROVED.vbs`** :
```vbscript
Set WshShell = CreateObject("WScript.Shell")

' Démarrer Terminal 1 amélioré
WshShell.Run "pythonw C:\Users\yassi\zkteco_terminal1_improved.py", 0, False

' Attendre 2 secondes
WScript.Sleep 2000

' Démarrer Terminal 2 amélioré
WshShell.Run "pythonw C:\Users\yassi\zkteco_terminal2_improved.py", 0, False

WScript.Echo "Scripts améliorés démarrés en arrière-plan"
```

### Option B : Remplacer les Anciens Scripts

**⚠️ SAUVEGARDER D'ABORD LES ANCIENS !**

```batch
cd C:\Users\yassi
copy zkteco_terminal1_log.py zkteco_terminal1_log.py.backup
copy zkteco_terminal2_log.py zkteco_terminal2_log.py.backup

copy zkteco_terminal1_improved.py zkteco_terminal1_log.py
copy zkteco_terminal2_improved.py zkteco_terminal2_log.py
```

---

## 📊 ÉTAPE 6 : Surveiller les Nouveaux Logs

### Voir les Logs

```batch
cd C:\Users\yassi
type terminal1_improved.log
type terminal2_improved.log
```

### Chercher les Métriques du Circuit Breaker

```batch
findstr /C:"Circuit breaker" terminal1_improved.log
```

### Chercher les Retry

```batch
findstr /C:"retry" terminal1_improved.log
```

### Voir la Queue Locale

```batch
type attendance_queue_t1.json
type attendance_queue_t2.json
```

---

## 🔍 ÉTAPE 7 : Vérifier les Améliorations

### Avant (Logs Actuels)

| Métrique | Terminal 1 | Terminal 2 |
|----------|------------|------------|
| Taux d'échec | **94.7%** | **22.5%** |
| Erreurs "Device not found" | 947 | - |
| Erreurs "Employee not found" | - | 225 |
| Succès | 0 | 2 |

### Après (Objectifs)

| Métrique | Terminal 1 | Terminal 2 |
|----------|------------|------------|
| Taux de succès | **>95%** | **>98%** |
| Erreurs Backend Down | <10 (avec retry) | <10 |
| Erreurs Employés | - | 0 (ignorés) |
| Perte de données | **0%** (queue) | **0%** |

---

## 🎯 ÉTAPE 8 : Paramétrage Avancé (Optionnel)

### Ajuster le Timeout

```python
# Ligne 30
TIMEOUT = 15  # Si connexion lente, augmenter à 15s
```

### Ajuster le Nombre de Retry

```python
# Ligne 31
MAX_RETRIES = 7  # Plus de tentatives
```

### Ajuster le Circuit Breaker

```python
# Ligne 33-34
CIRCUIT_BREAKER_THRESHOLD = 15  # Plus tolérant
CIRCUIT_BREAKER_TIMEOUT = 120  # Attente plus longue (2 minutes)
```

### Ajouter Plus d'Employés à Ignorer

```python
# Ligne 37
IGNORED_EMPLOYEES = ["78", "80", "123", "456"]
```

---

## 🛑 ÉTAPE 9 : Arrêter les Anciens Scripts

```batch
cd C:\Users\yassi
STOP_ZKTECO_BRIDGES.bat
```

Puis démarrer les nouveaux :

```batch
START_IMPROVED.vbs
```

---

## ✅ ÉTAPE 10 : Vérification Post-Déploiement

### Checklist

- [ ] Scripts améliorés copiés sur Windows
- [ ] Configuration Terminal 1 correcte
- [ ] Configuration Terminal 2 correcte
- [ ] Test Terminal 1 réussi
- [ ] Test Terminal 2 réussi
- [ ] Scripts VBS mis à jour
- [ ] Anciens scripts sauvegardés
- [ ] Nouveaux scripts démarrés
- [ ] Logs nouveaux vérifiés
- [ ] Queue locale créée
- [ ] Circuit breaker fonctionne
- [ ] Retry logic fonctionne

---

## 🔧 Dépannage

### Erreur: "No module named 'pathlib'"

**Solution:** pathlib est intégré à Python 3.4+. Vérifier la version:

```batch
python --version
```

### Queue JSON Corrompue

**Solution:** Supprimer et laisser recréer:

```batch
del C:\Users\yassi\attendance_queue_t1.json
del C:\Users\yassi\attendance_queue_t2.json
```

### Circuit Breaker Toujours OPEN

**Solution:** Backend probablement down. Vérifier:

```batch
curl http://localhost:3000/api/v1/health
```

---

## 📈 Monitoring Continu

### Commande pour Voir les Métriques

```powershell
# PowerShell
Get-Content C:\Users\yassi\terminal1_improved.log | Select-String -Pattern "Circuit breaker|retry|Queue"
```

### Dashboard Simple (Optionnel)

Créer `STATS.bat` :

```batch
@echo off
echo === STATISTIQUES TERMINAUX ===
echo.
echo Terminal 1:
findstr /C:"✅" C:\Users\yassi\terminal1_improved.log | find /C "✅"
echo Succès

findstr /C:"❌" C:\Users\yassi\terminal1_improved.log | find /C "❌"
echo Échecs
echo.

echo Terminal 2:
findstr /C:"✅" C:\Users\yassi\terminal2_improved.log | find /C "✅"
echo Succès

findstr /C:"❌" C:\Users\yassi\terminal2_improved.log | find /C "❌"
echo Échecs
pause
```

---

## 🎉 Conclusion

Les scripts améliorés réduiront drastiquement les erreurs et garantiront **zéro perte de données**.

**Support:** Consultez `ANALYSE_ERREURS_TERMINAUX.md` pour plus de détails techniques.

---

**Date:** 2025-11-26  
**Version:** 2.0
