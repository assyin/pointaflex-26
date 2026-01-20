# Scénario de Test - Interface Attendance
## Semaine du 13-15 Janvier 2026

---

## Préparation effectuée ✅
- [x] 556 pointages supprimés de la BDD DEV
- [x] Fichiers de sync réinitialisés (lastUserSn = 0)
- [x] Prêt pour resynchronisation

---

## ÉTAPE 1 : Démarrer la synchronisation

### 1.1 Redémarrer les scripts sync (PowerShell Windows)
```powershell
pm2 restart sync-cp sync-cit sync-portable
```

### 1.2 Vérifier les logs de synchronisation
```powershell
pm2 logs sync-cp --lines 50
```

**Résultat attendu :**
- Les pointages de la semaine (13-15 janvier) doivent se synchroniser
- Messages "[DEV] Envoyé" dans les logs

---

## ÉTAPE 2 : Vérifier la récupération en BDD

### 2.1 Compter les pointages récupérés
```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres -c "SELECT COUNT(*) as total, DATE(timestamp) as jour FROM \"Attendance\" WHERE timestamp >= '2026-01-13' GROUP BY DATE(timestamp) ORDER BY jour;"
```

**Résultat attendu :**
- ~283 pointages le 13/01
- ~160 pointages le 14/01
- ~113+ pointages le 15/01

---

## ÉTAPE 3 : Tester l'interface Attendance

### 3.1 Accéder à l'interface
- URL : http://localhost:3001/attendance
- Connexion : admin@test.com / Admin123

### 3.2 Vérifications à effectuer

| Test | Action | Résultat attendu |
|------|--------|------------------|
| **Affichage liste** | Ouvrir /attendance | Liste des pointages du jour visible |
| **Filtrage par date** | Sélectionner "Cette semaine" | Pointages du 13-15 janvier affichés |
| **Filtrage par employé** | Rechercher un nom | Filtrage fonctionnel |
| **Détection IN/OUT** | Vérifier les types | Alternance IN → OUT correcte |
| **Détection anomalies** | Chercher anomalies | RETARD, EARLY_LEAVE, MISSING_OUT détectés |
| **Pagination** | Naviguer pages | Chargement correct |

---

## ÉTAPE 4 : Tester les anomalies

### 4.1 Types d'anomalies à vérifier

| Anomalie | Description | Comment vérifier |
|----------|-------------|------------------|
| **RETARD** | Pointage IN après l'heure prévue | Employés arrivés après 08:00/09:00 |
| **EARLY_LEAVE** | Pointage OUT avant l'heure prévue | Employés partis avant 17:00/18:00 |
| **MISSING_OUT** | Pas de pointage OUT | Employés avec IN mais sans OUT |
| **ABSENCE** | Pas de pointage du tout | Employés planifiés sans pointage |

### 4.2 Accéder à la page Anomalies
- URL : http://localhost:3001/anomalies
- Vérifier la détection automatique

---

## ÉTAPE 5 : Tester le Dashboard

### 5.1 Accéder au Dashboard
- URL : http://localhost:3001/dashboard

### 5.2 Métriques à vérifier

| Métrique | Description |
|----------|-------------|
| **Taux de présence** | % d'employés présents vs planifiés |
| **Retards** | Nombre de retards cette semaine |
| **Total pointages** | Nombre total de pointages |
| **Répartition shifts** | Graphique par shift |

---

## ÉTAPE 6 : Tests temps réel

### 6.1 Effectuer un nouveau pointage
1. Faire un pointage sur un terminal (CP, CIT ou Portable)
2. Attendre 30 secondes (intervalle de sync)
3. Rafraîchir la page /attendance

**Résultat attendu :**
- Le nouveau pointage apparaît dans la liste
- Type IN/OUT correctement détecté
- Anomalie détectée si applicable

---

## Checklist finale

- [ ] Synchronisation fonctionne (logs OK)
- [ ] Pointages affichés dans /attendance
- [ ] Filtres fonctionnels (date, employé, type)
- [ ] Détection IN/OUT correcte
- [ ] Anomalies détectées automatiquement
- [ ] Dashboard affiche les métriques
- [ ] Temps réel fonctionne (nouveau pointage visible)

---

## En cas de problème

### Logs à vérifier
```bash
# Backend DEV
pm2 logs dev-backend --lines 50

# Sync scripts (Windows)
pm2 logs sync-cp --lines 50
```

### Réinitialiser si nécessaire
```bash
# Supprimer tous les pointages de la semaine
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres -c "DELETE FROM \"Attendance\" WHERE timestamp >= '2026-01-13';"
```

---

*Document créé le 15/01/2026*
