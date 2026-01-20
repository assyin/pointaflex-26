# 🔍 VÉRIFICATION DES POINTAGES - Guide Complet

**Date :** 2025-11-26
**Objectif :** Savoir si les pointages des terminaux arrivent bien au backend

---

## ✅ MÉTHODE 1 : Vérifier les Logs du Backend (LE PLUS SIMPLE)

### Option A : Via la Console (Temps Réel)

**Si le backend tourne dans un terminal :**

```bash
cd /home/assyin/PointaFlex/backend
npm run start:dev
```

**Ce que vous verrez quand un pointage arrive :**

```
📥 [Push URL] Données reçues du terminal: {
  "pin": "1091",
  "time": "2025-11-26 14:30:00",
  "state": 1,
  "verifymode": 1,
  "SN": "TERMINAL-PRINC-001"
}
📋 [Push URL] Headers: {...}
🔄 [Push URL] Données converties: {
  "employeeId": "1091",
  "timestamp": "2025-11-26T14:30:00Z",
  "type": "IN",
  "method": "FINGERPRINT"
}
✅ [Push URL] Pointage enregistré avec succès
```

**Si vous ne voyez RIEN** → Le terminal n'envoie pas encore

**Si vous voyez des erreurs :**
- ❌ `Device not found` → Le terminal n'est pas enregistré dans PointaFlex
- ❌ `Employee X not found` → L'employé n'existe pas en base
- ❌ Autres erreurs → Problème de configuration

### Option B : Via les Fichiers de Log

**Si vous avez configuré un fichier de log :**

```bash
# Surveiller les logs en temps réel
tail -f /home/assyin/PointaFlex/backend/logs/application.log

# Ou voir les dernières lignes
tail -n 50 /home/assyin/PointaFlex/backend/logs/application.log

# Chercher les pointages
grep "Push URL" /home/assyin/PointaFlex/backend/logs/application.log
```

---

## ✅ MÉTHODE 2 : Vérifier dans l'Interface PointaFlex

### Accéder à l'interface :

```
http://localhost:3001/attendance
```

**Ce que vous devriez voir :**

1. **Tableau des pointages récents**
   - Matricule de l'employé
   - Date et heure du pointage
   - Type (Entrée/Sortie)
   - Méthode (Empreinte, Badge, etc.)

2. **Si le pointage apparaît → ✅ Succès !**

3. **Si aucun pointage → Vérifier les logs backend**

### Rafraîchir la page

```
F5 ou Ctrl+R
```

Les nouveaux pointages devraient apparaître en temps réel (ou après rafraîchissement).

---

## ✅ MÉTHODE 3 : Vérifier Directement dans la Base de Données

### Connexion à la base Supabase

```bash
PGPASSWORD='MAMPAPOLino0102' psql \
  -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.apeyodpxnxxwdxwcnqmo \
  -d postgres
```

### Requêtes SQL de Vérification

**1. Voir les derniers pointages (toutes les colonnes) :**

```sql
SELECT
  id,
  "employeeId",
  "deviceId",
  timestamp,
  type,
  method,
  "createdAt"
FROM "Attendance"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**2. Compter les pointages d'aujourd'hui :**

```sql
SELECT COUNT(*) as total_pointages_aujourdhui
FROM "Attendance"
WHERE DATE("createdAt") = CURRENT_DATE;
```

**3. Voir les pointages par terminal :**

```sql
SELECT
  d.name as terminal,
  COUNT(*) as nombre_pointages
FROM "Attendance" a
LEFT JOIN "AttendanceDevice" d ON a."deviceId" = d.id
WHERE DATE(a."createdAt") = CURRENT_DATE
GROUP BY d.name;
```

**4. Voir les derniers pointages avec infos employé :**

```sql
SELECT
  a.timestamp,
  e.matricule,
  e."firstName",
  e."lastName",
  a.type,
  a.method,
  d.name as terminal
FROM "Attendance" a
LEFT JOIN "Employee" e ON a."employeeId" = e.id
LEFT JOIN "AttendanceDevice" d ON a."deviceId" = d.id
ORDER BY a."createdAt" DESC
LIMIT 10;
```

**Quitter psql :**
```
\q
```

---

## ✅ MÉTHODE 4 : Test Manuel avec curl

### Simuler un pointage depuis le terminal

```bash
curl -X POST http://localhost:3000/api/v1/attendance/push \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1091",
    "time": "2025-11-26 14:30:00",
    "state": 1,
    "verifymode": 1,
    "SN": "TERMINAL-PRINC-001"
  }'
```

**Réponses possibles :**

### ✅ Succès (201 Created)
```json
{
  "id": "uuid-du-pointage",
  "employeeId": "uuid-de-l-employe",
  "timestamp": "2025-11-26T14:30:00.000Z",
  "type": "IN",
  "method": "FINGERPRINT"
}
```
→ **Tout fonctionne !**

### ❌ Device not found (404)
```json
{
  "message": "Device not found",
  "error": "Not Found",
  "statusCode": 404
}
```
→ **Solution :** Enregistrer le terminal dans PointaFlex

### ❌ Employee not found (404)
```json
{
  "message": "Employee 1091 not found",
  "error": "Not Found",
  "statusCode": 404
}
```
→ **Solution :** Vérifier que l'employé existe avec ce matricule

---

## ✅ MÉTHODE 5 : Monitoring en Temps Réel

### Script de Surveillance Automatique

**Créer un script de monitoring :**

```bash
#!/bin/bash
# /home/assyin/PointaFlex/scripts/monitor-pointages.sh

echo "🔍 Surveillance des pointages en temps réel..."
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

# Compter les pointages toutes les 5 secondes
while true; do
  COUNT=$(PGPASSWORD='MAMPAPOLino0102' psql \
    -h aws-1-eu-north-1.pooler.supabase.com \
    -p 6543 \
    -U postgres.apeyodpxnxxwdxwcnqmo \
    -d postgres \
    -t -c "SELECT COUNT(*) FROM \"Attendance\" WHERE DATE(\"createdAt\") = CURRENT_DATE;")

  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TIMESTAMP] Total pointages aujourd'hui : $COUNT"

  sleep 5
done
```

**Rendre exécutable et lancer :**

```bash
chmod +x /home/assyin/PointaFlex/scripts/monitor-pointages.sh
./scripts/monitor-pointages.sh
```

---

## 🎯 SCÉNARIO DE TEST COMPLET

### Étape 1 : Préparer le Monitoring

**Terminal 1 : Lancer le backend avec logs**
```bash
cd /home/assyin/PointaFlex/backend
npm run start:dev
```

**Terminal 2 : Surveiller la base de données**
```bash
watch -n 2 "PGPASSWORD='MAMPAPOLino0102' psql \
  -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.apeyodpxnxxwdxwcnqmo \
  -d postgres \
  -t -c \"SELECT COUNT(*) FROM \\\"Attendance\\\" WHERE DATE(\\\"createdAt\\\") = CURRENT_DATE;\""
```

### Étape 2 : Faire un Pointage sur le Terminal

1. Aller au terminal physique ZKTeco
2. Faire un pointage (empreinte, badge, ou PIN)
3. Observer ce qui se passe

### Étape 3 : Vérifier les Résultats

**Dans Terminal 1 (backend) - Vous devriez voir :**
```
📥 [Push URL] Données reçues du terminal: {...}
✅ [Push URL] Pointage enregistré avec succès
```

**Dans Terminal 2 (base de données) - Le compteur devrait augmenter**
```
Avant : 10
Après : 11  ← Nouveau pointage !
```

**Dans l'interface web :**
- Aller sur http://localhost:3001/attendance
- Rafraîchir (F5)
- Le nouveau pointage devrait apparaître

### ✅ Si tout ça fonctionne → Configuration réussie !
### ❌ Si rien ne se passe → Voir "Dépannage" ci-dessous

---

## 🔧 DÉPANNAGE

### Problème : Rien ne se passe quand je pointe

**Vérifications :**

1. **Le backend tourne-t-il ?**
   ```bash
   curl http://localhost:3000/api/v1/attendance/push
   # Devrait répondre (même avec une erreur, c'est normal)
   ```

2. **Le terminal envoie-t-il des données ?**
   - Vérifier la config du terminal
   - Vérifier que l'IP et le port sont corrects
   - Vérifier le réseau : `ping 192.168.16.XXX`

3. **Le firewall bloque-t-il le port 3000 ?**
   ```bash
   # Linux
   sudo ufw allow 3000/tcp

   # Windows
   # Paramètres → Pare-feu → Autoriser port 3000
   ```

### Problème : "Device not found"

**Le pointage arrive au backend ✅ mais le terminal n'est pas enregistré**

**Solution : Enregistrer le terminal dans PointaFlex**

```sql
-- Via psql
INSERT INTO "AttendanceDevice" (
  id,
  "tenantId",
  name,
  "deviceId",
  "ipAddress",
  type,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  '90fab0cc-8539-4566-8da7-8742e9b6937b',
  'Terminal Principal',
  'TERMINAL-PRINC-001',
  '192.168.16.174',
  'BIOMETRIC',
  true,
  NOW(),
  NOW()
);
```

Ou via l'interface web (si disponible) :
- http://localhost:3001/devices ou /terminals
- Bouton "Ajouter un terminal"
- Saisir les informations

### Problème : "Employee not found"

**Le terminal envoie bien ✅ mais l'employé n'existe pas**

**Vérifier le matricule :**
```sql
SELECT matricule, "firstName", "lastName"
FROM "Employee"
WHERE matricule = '1091' OR matricule = '01091';
```

**Si l'employé n'existe pas, l'ajouter ou vérifier le matricule sur le terminal**

---

## 📊 TABLEAU DE DIAGNOSTIC

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Rien dans les logs | Terminal ne se connecte pas | Vérifier config terminal + réseau |
| "Device not found" | Terminal non enregistré | Enregistrer le terminal dans PointaFlex |
| "Employee not found" | Matricule incorrect/inexistant | Vérifier/ajouter l'employé |
| Pointage dans logs mais pas dans BDD | Erreur après validation | Vérifier logs d'erreur complets |
| Pointage dans BDD mais pas dans UI | Problème frontend | Rafraîchir page, vérifier filtres |

---

## 📈 MÉTRIQUES À SURVEILLER

### Quotidiennement

```sql
-- Nombre de pointages par jour
SELECT
  DATE("createdAt") as date,
  COUNT(*) as nombre_pointages
FROM "Attendance"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY DATE("createdAt")
ORDER BY date DESC;
```

### Par Terminal

```sql
-- Pointages par terminal (dernières 24h)
SELECT
  d.name,
  COUNT(*) as pointages
FROM "Attendance" a
LEFT JOIN "AttendanceDevice" d ON a."deviceId" = d.id
WHERE a."createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY d.name;
```

### Taux de Réussite

```sql
-- Comparer avec les logs pour calculer le taux de succès
-- (nécessite de stocker les tentatives échouées)
```

---

## 🎉 CONFIRMATION DE SUCCÈS

**Vous saurez que tout fonctionne quand :**

✅ Un pointage sur le terminal physique...
✅ Apparaît immédiatement dans les logs backend...
✅ Est visible dans la base de données...
✅ S'affiche dans l'interface web PointaFlex...
✅ Sans aucune erreur !

---

## 📞 AIDE RAPIDE

**Commande tout-en-un pour vérifier :**

```bash
# Voir les 5 derniers pointages avec toutes les infos
PGPASSWORD='MAMPAPOLino0102' psql \
  -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.apeyodpxnxxwdxwcnqmo \
  -d postgres \
  -c "SELECT a.timestamp, e.matricule, e.\"firstName\", a.type, a.method FROM \"Attendance\" a LEFT JOIN \"Employee\" e ON a.\"employeeId\" = e.id ORDER BY a.\"createdAt\" DESC LIMIT 5;"
```

---

**Date :** 2025-11-26
**Version :** 1.0
**Status :** ✅ Guide complet de vérification
