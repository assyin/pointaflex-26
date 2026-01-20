# GUIDE RAPIDE - Configuration Push URL ZKTeco

**Date:** 2025-11-26
**M\u00e9thode:** Push URL Native (RECOMMAND\u00c9E)

---

## Pourquoi Push URL?

- ✅ Aucun logiciel tiers n\u00e9cessaire (pas de Python, pas de scripts)
- ✅ Fonctionnalit\u00e9 native du terminal ZKTeco
- ✅ Pointages envoy\u00e9s en temps r\u00e9el
- ✅ Fiabilit\u00e9 maximale
- ✅ Maintenance z\u00e9ro

---

## \u00c9tape 1: V\u00e9rifier le Backend

### Endpoint disponible :
```
POST http://localhost:3000/api/v1/attendance/push
```

### Formats support\u00e9s :
Le backend accepte plusieurs formats de terminaux ZKTeco :

```json
{
  "pin": "1091",                    // Ou userId, cardno, userCode, user_id
  "time": "2025-11-26 12:30:00",    // Ou checktime, timestamp
  "state": 1,                       // Ou checktype, type (0=OUT, 1=IN)
  "verifymode": 1,                  // Ou verifyMode, verify_mode
  "SN": "TERMINAL-PRINC-001"        // Ou sn, deviceId, serialNumber
}
```

### Test manuel :
```bash
curl -X POST http://localhost:3000/api/v1/attendance/push \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1091",
    "time": "2025-11-26 12:30:00",
    "state": 1,
    "verifymode": 1,
    "SN": "TERMINAL-PRINC-001"
  }'
```

---

## \u00c9tape 2: Configuration du Terminal ZKTeco

### Option A: Via Interface Web du Terminal

1. **Acc\u00e9der au terminal :**
   ```
   Navigateur: http://192.168.16.174
   Login: admin / mot de passe par d\u00e9faut (souvent vide ou "admin")
   ```

2. **Configurer le Push URL :**
   - Menu : **Communication** → **Push Settings** ou **Cloud Settings**
   - Activer : **Push URL** ou **HTTP Push**
   - URL : `http://[IP_BACKEND]:3000/api/v1/attendance/push`

   **Exemples :**
   - Si backend sur m\u00eame machine que terminal : `http://192.168.16.100:3000/api/v1/attendance/push`
   - Si backend sur serveur : `http://server.pointaflex.local:3000/api/v1/attendance/push`

3. **Param\u00e8tres avanc\u00e9s :**
   - **M\u00e9thode :** POST
   - **Format :** JSON
   - **Intervalle :** Temps r\u00e9el (Real-time) ou 1 seconde
   - **Retry :** 3 tentatives
   - **Timeout :** 10 secondes

4. **Sauvegarder et red\u00e9marrer le terminal**

### Option B: Via ZKAccess (Logiciel PC)

1. **T\u00e9l\u00e9charger ZKAccess** (si pas d\u00e9j\u00e0 install\u00e9)
2. **Connecter le terminal :**
   - Ajouter appareil → Saisir IP : `192.168.16.174`
3. **Configurer Push URL :**
   - S\u00e9lectionner terminal → Param\u00e8tres → Communication
   - Activer **Push to URL**
   - URL : `http://[IP_BACKEND]:3000/api/v1/attendance/push`
4. **Appliquer la configuration au terminal**

### Option C: Via l'Interface du Terminal (Physique)

1. **Menu principal du terminal :**
   ```
   Menu → Communication → Push URL
   ```

2. **Param\u00e8tres :**
   - **Push Enable :** ON
   - **Push URL :** `http://[IP_BACKEND]:3000/api/v1/attendance/push`
   - **Push Method :** HTTP POST
   - **Push Format :** JSON

3. **Tester la connexion**

---

## \u00c9tape 3: V\u00e9rifier la Configuration

### Terminal 1 (192.168.16.174)
```bash
# Depuis le PC Windows ou Linux
curl -X POST http://192.168.16.100:3000/api/v1/attendance/push \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1091",
    "time": "2025-11-26 13:00:00",
    "state": 1,
    "verifymode": 1,
    "SN": "TERMINAL-PRINC-001"
  }'
```

### Terminal 2 (192.168.16.175)
```bash
curl -X POST http://192.168.16.100:3000/api/v1/attendance/push \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "2308",
    "time": "2025-11-26 13:00:00",
    "state": 1,
    "verifymode": 1,
    "SN": "Terminal_CIT_GAB"
  }'
```

**R\u00e9ponse attendue (si employé existe) :**
```json
{
  "id": "uuid-attendance",
  "employeeId": "uuid-employee",
  "type": "IN",
  "method": "FINGERPRINT",
  "timestamp": "2025-11-26T13:00:00.000Z"
}
```

**R\u00e9ponse si appareil non enregistr\u00e9 :**
```json
{
  "message": "Device not found",
  "error": "Not Found",
  "statusCode": 404
}
```
→ **Solution :** Enregistrer le terminal dans PointaFlex via l'interface web

---

## \u00c9tape 4: Test de Pointage R\u00e9el

1. **Faire un pointage sur le terminal** (empreinte, badge, PIN...)
2. **V\u00e9rifier les logs du backend :**

```bash
# Depuis WSL/Linux
tail -f /home/assyin/PointaFlex/backend/logs/backend.log

# Vous devriez voir :
📥 [Push URL] Donn\u00e9es reçues du terminal: {...}
🔄 [Push URL] Donn\u00e9es converties: {...}
✅ [Push URL] Pointage enregistr\u00e9 avec succ\u00e8s
```

3. **V\u00e9rifier dans PointaFlex :**
   - Aller sur http://localhost:3001/attendance
   - Le pointage doit appara\u00eetre en temps r\u00e9el

---

## D\u00e9pannage

### Probl\u00e8me : Terminal n'envoie pas

**V\u00e9rifications :**

1. **Connectivit\u00e9 r\u00e9seau :**
```bash
ping 192.168.16.174  # Depuis le serveur backend
```

2. **Port backend accessible :**
```bash
curl http://192.168.16.100:3000/api/v1/attendance/push
```

3. **Firewall :**
   - Windows : Autoriser port 3000 entrant
   - Linux : `sudo ufw allow 3000/tcp`

### Probl\u00e8me : "Device not found"

**Solution :** Enregistrer le terminal dans PointaFlex

1. Aller sur http://localhost:3001/terminals (ou /devices)
2. Ajouter un nouveau terminal :
   - **Device ID :** `TERMINAL-PRINC-001`
   - **Nom :** Terminal Principal
   - **IP :** 192.168.16.174
   - **Type :** ZKTeco
   - **Tenant :** Votre entreprise

### Probl\u00e8me : "Employee not found"

**Solution :** V\u00e9rifier le matricule de l'employ\u00e9

```sql
-- V\u00e9rifier si l'employ\u00e9 existe
SELECT matricule, "firstName", "lastName"
FROM "Employee"
WHERE matricule = '1091' OR matricule = '01091';
```

Si l'employ\u00e9 n'existe pas :
1. Aller sur http://localhost:3001/employees
2. Ajouter l'employ\u00e9 avec le bon matricule

---

## Comparaison : Push URL vs Python Scripts

| Crit\u00e8re | Push URL ✅ | Scripts Python ❌ |
|----------|-----------|------------------|
| **Installation** | Aucune | Python + biblioth\u00e8ques |
| **Maintenance** | Z\u00e9ro | Scripts \u00e0 surveiller |
| **Fiabilit\u00e9** | Maximale (natif) | D\u00e9pend du script |
| **Latence** | Temps r\u00e9el | 10s intervalle |
| **D\u00e9marrage auto** | Oui (terminal) | Besoin VBS/Service |
| **Logs** | Backend centralis\u00e9 | Fichiers locaux |
| **Retry** | G\u00e9r\u00e9 par terminal | \u00c0 implémenter |
| **Compatibilit\u00e9** | Tous terminaux ZKTeco | D\u00e9pend PyZK |

---

## Prochaines \u00c9tapes

1. ✅ Backend Push URL op\u00e9rationnel
2. ⏳ Enregistrer les terminaux dans PointaFlex
3. ⏳ Configurer Push URL sur Terminal 1
4. ⏳ Configurer Push URL sur Terminal 2
5. ⏳ Tester pointages r\u00e9els
6. ⏳ (Optionnel) D\u00e9sactiver scripts Python si Push URL fonctionne

---

## Support

- **Documentation ZKTeco :** Consulter le manuel du terminal
- **Documentation PointaFlex :** Voir `ALTERNATIVES_CONFIGURATION_TERMINAUX.md`
- **Logs backend :** `/home/assyin/PointaFlex/backend/logs/`

---

**Mise \u00e0 jour :** 2025-11-26
**Version backend :** 1.0 avec Push URL
**Status :** ✅ Endpoint test\u00e9 et fonctionnel
