# 🚨 RÉSUMÉ DES PROBLÈMES DE PERFORMANCE

## ⚡ PROBLÈMES CRITIQUES (À CORRIGER EN PRIORITÉ)

### 1. 🔴 Dashboard - Boucles N+1 (7 requêtes séquentielles)
**Fichier:** `backend/src/modules/reports/reports.service.ts`  
**Lignes:** 256-282, 439-467, 652-681, 930-960  
**Impact:** +2-4 secondes  
**Solution:** Remplacer par une seule requête avec `groupBy`

### 2. 🔴 Dashboard - 9 Requêtes HTTP Simultanées
**Fichier:** `frontend/app/(dashboard)/dashboard/page.tsx`  
**Lignes:** 142-171  
**Impact:** +2-3 secondes  
**Solution:** Créer un endpoint `/dashboard/full` unique

### 3. 🔴 Employees - Pas de Pagination
**Fichiers:** 
- `frontend/app/(dashboard)/employees/page.tsx`
- `backend/src/modules/employees/employees.service.ts`  
**Impact:** +1-3 secondes (1000+ employés)  
**Solution:** Pagination par défaut (20-50 éléments)

### 4. 🔴 Attendance - Limite Fixe 1000
**Fichier:** `backend/src/modules/attendance/attendance.service.ts`  
**Ligne:** 383  
**Impact:** +1-2 secondes, données tronquées  
**Solution:** Pagination réelle avec `skip/take`

### 5. 🔴 Overtime - Double Requête pour Total
**Fichier:** `backend/src/modules/overtime/overtime.service.ts`  
**Lignes:** 272-321  
**Impact:** +500ms-1s  
**Solution:** Utiliser `aggregate` au lieu de `findMany`

### 6. 🔴 Index Manquants
**Fichier:** `backend/prisma/schema.prisma`  
**Impact:** +500ms-2s par requête complexe  
**Solution:** Ajouter index composites:
- `(tenantId, employeeId, timestamp)` pour Attendance
- `(tenantId, employeeId, date, status)` pour Overtime
- `(tenantId, employeeId, startDate, endDate)` pour Leave
- `(tenantId, departmentId, isActive)` pour Employee

---

## 🟠 PROBLÈMES IMPORTANTS

### 7. Pas de Cache Backend
**Impact:** +2-5 secondes sur requêtes répétées  
**Solution:** Redis ou cache mémoire (TTL: 1-5 min)

### 8. Include au lieu de Select
**Fichiers:** Tous les services backend  
**Impact:** +200-500ms par requête  
**Solution:** Utiliser `select` spécifique

### 9. Refetch Auto Trop Fréquent
**Fichier:** `frontend/lib/hooks/useAttendance.ts`  
**Ligne:** 11  
**Impact:** Surcharge serveur  
**Solution:** Augmenter à 60-120 secondes

---

## 📊 TEMPS DE CHARGEMENT ACTUELS

| Page | Temps Actuel | Objectif | Gain Potentiel |
|------|--------------|----------|----------------|
| Dashboard Admin | 4-8s | < 2s | -6s |
| Dashboard Manager | 3-6s | < 2s | -4s |
| Employees | 2-5s | < 1s | -4s |
| Attendance | 2-4s | < 1.5s | -2.5s |

---

## ✅ PLAN D'ACTION RAPIDE

### Phase 1 - Quick Wins (1-2 jours)
1. ✅ Index composites
2. ✅ Pagination par défaut
3. ✅ Select au lieu de include
4. ✅ Aggregate pour totaux

### Phase 2 - Optimisations (3-5 jours)
1. ✅ Boucles N+1 → groupBy
2. ✅ Endpoint dashboard unifié
3. ✅ Cache Redis

**Gain total estimé:** -8 à -15 secondes

---

Voir `ANALYSE_PERFORMANCE_COMPLETE.md` pour les détails complets.
