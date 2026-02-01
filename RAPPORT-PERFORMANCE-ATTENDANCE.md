# Rapport de Performance - Page Pointages & Presences

**Date** : 01/02/2026
**Page analysee** : `http://localhost:3001/attendance`
**Stack** : Next.js (frontend) + NestJS + Prisma (backend) + PostgreSQL (Supabase)

---

## Resume Executif

La page Pointages souffre d'un **temps de reponse excessif** (6-7 secondes) principalement cause par un probleme **N+1 queries** dans la recuperation des plannings. Ce probleme est aggrave par un filtrage cote client au lieu du serveur, et un chargement fixe de 500 enregistrements sans pagination reelle.

| Metrique | Actuel | Cible |
|----------|--------|-------|
| Temps reponse backend | ~5.5s | < 300ms |
| Temps total page | ~6-7s | < 1s |
| Taille payload | ~500KB | < 100KB |
| Requetes DB par appel | ~500+ | < 5 |

---

## 1. Problemes Identifies

### 1.1 CRITIQUE - Probleme N+1 Queries (Schedule Lookups)

**Fichier** : `backend/src/modules/attendance/attendance.service.ts` (lignes 2296-2322)

**Description** : Apres avoir recupere les 500 pointages, le code boucle sur chaque combinaison employe/date pour chercher le planning correspondant. Chaque iteration execute une requete Prisma individuelle.

```typescript
// CODE ACTUEL - PROBLEMATIQUE
for (const [employeeId, dates] of employeeDatePairs.entries()) {
  for (const dateStr of dates) {
    const schedule = await this.prisma.schedule.findFirst({  // <-- REQUETE DANS LA BOUCLE
      where: {
        tenantId,
        employeeId,
        date: dateOnly,
        status: 'PUBLISHED',
      },
      include: { shift: { ... } },
    });
  }
}
```

**Impact chiffre** :
- 50 employes x 10 jours = **500 requetes SQL sequentielles**
- ~10ms par requete = **5 000ms (5 secondes)** de temps DB
- C'est **le bottleneck principal** de la page

**Solution recommandee** :
```typescript
// SOLUTION - UNE SEULE REQUETE BATCH
const allSchedules = await this.prisma.schedule.findMany({
  where: {
    tenantId,
    status: 'PUBLISHED',
    OR: Array.from(employeeDatePairs.entries()).flatMap(([employeeId, dates]) =>
      Array.from(dates).map(dateStr => ({
        employeeId,
        date: new Date(dateStr + 'T00:00:00.000Z'),
      }))
    ),
  },
  include: { shift: true },
});

// Indexer par cle employe+date pour lookup O(1)
const scheduleMap = new Map();
for (const s of allSchedules) {
  scheduleMap.set(`${s.employeeId}_${s.date.toISOString().split('T')[0]}`, s);
}

// Utiliser le Map au lieu de requetes
for (const [employeeId, dates] of employeeDatePairs.entries()) {
  for (const dateStr of dates) {
    const schedule = scheduleMap.get(`${employeeId}_${dateStr}`);
    // ... utiliser schedule
  }
}
```

**Gain attendu** : 5 000ms -> **50-100ms** (reduction de 98%)

---

### 1.2 CRITIQUE - Index DB Manquant pour Schedule

**Fichier** : `backend/prisma/schema.prisma` (lignes 533-537)

**Description** : La table Schedule n'a pas d'index composite pour la requete frequente `(tenantId, employeeId, date, status)`.

**Index actuels** :
```prisma
@@index([tenantId])
@@index([date])
@@index([employeeId])
@@index([status])
```

**Index manquant** :
```prisma
@@index([tenantId, employeeId, date, status])  // <-- A AJOUTER
```

**Gain attendu** : Les lookups schedule passent de ~10ms a ~1ms chacun

---

### 1.3 HAUTE - Filtrage Cote Client au lieu du Serveur

**Fichier** : `frontend/app/(dashboard)/attendance/page.tsx` (lignes 377-423)

**Description** : Les filtres departement, type d'anomalie, source, et statut sont appliques cote client apres avoir recu les 500 enregistrements. Le backend ne recoit que les filtres basiques.

**Filtres envoyes au backend** (ligne 149-162) :
- `startDate`, `endDate`
- `employeeId`, `siteId`
- `hasAnomaly`, `type`
- `search`

**Filtres appliques cote client uniquement** :
- `departmentId` - filtre en JS sur `record.employee?.department?.id`
- `anomalyType` - filtre en JS sur `record.anomalyType`
- `source` - filtre en JS sur `record.source`
- `status` (VALID/HAS_ANOMALY/CORRECTED) - filtre en JS
- `shiftType` - filtre en JS

**Impact** : Le backend envoie 500 enregistrements meme si l'utilisateur filtre un seul departement de 20 personnes. **480 enregistrements sont telecharges pour rien**.

**Solution** : Ajouter ces filtres au backend (`departmentId`, `anomalyType`, `source`, `shiftType`) dans le DTO et la requete Prisma.

**Gain attendu** : Reduction payload de 50-70%

---

### 1.4 HAUTE - Pas de Pagination Reelle

**Fichier** : `frontend/app/(dashboard)/attendance/page.tsx` (ligne 154)

```typescript
const apiFilters = useMemo(() => ({
  ...filters,
  page: 1,
  limit: 500,  // <-- TOUJOURS 500, PAS DE NAVIGATION
}), [...]);
```

**Description** : La page demande toujours 500 enregistrements en une seule requete. Il n'y a pas de controles de pagination (page suivante/precedente) dans l'UI.

**Solution** : Implementer une pagination cote serveur avec 50-100 enregistrements par page et des controles de navigation.

**Gain attendu** : Temps de reponse reduit proportionnellement (500 -> 50 = 10x plus rapide)

---

### 1.5 MOYENNE - 6 Appels API Concurrents au Chargement

**Fichier** : `frontend/app/(dashboard)/attendance/page.tsx` (lignes 177-194)

```typescript
const { data: attendanceDataRaw } = useAttendance(apiFilters);     // 1. Pointages
const { data: anomaliesDataRaw } = useAttendanceAnomalies(startDate); // 2. Anomalies
const { data: employeesData } = useEmployees({ isActive: true });  // 3. Employes
const { data: sitesData } = useSites();                            // 4. Sites
const { data: departmentsData } = useDepartments();                // 5. Departements
const { data: shiftsData } = useShifts();                          // 6. Shifts
```

**Impact** : 6 requetes HTTP simultanees + 6 requetes DB backend. Les donnees de reference (sites, departements, shifts) changent rarement mais sont re-fetchees a chaque visite.

**Solutions** :
- Augmenter le `staleTime` pour sites/departements/shifts a 5-10 minutes
- Fusionner certains appels en un seul endpoint `/attendance/page-data`
- Utiliser `prefetchQuery` pour precharger les donnees de reference

---

### 1.6 MOYENNE - Auto-refresh Toutes les 60 Secondes

**Fichier** : `frontend/lib/hooks/useAttendance.ts` (lignes 6-14)

```typescript
export function useAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => attendanceApi.getAll(filters),
    staleTime: 60000,        // 60s
    refetchInterval: 60000,  // <-- RE-FETCH AUTOMATIQUE CHAQUE MINUTE
  });
}
```

**Impact** : Toutes les 60 secondes, la requete lourde de 5.5s est relancee, meme si l'utilisateur ne regarde pas la page activement.

**Solution** : Augmenter a 120-180s, ou utiliser `refetchOnWindowFocus` uniquement.

---

## 2. Index de la Base de Donnees

### Index Existants (Attendance)
```prisma
@@index([tenantId])
@@index([employeeId])
@@index([timestamp])
@@index([hasAnomaly])
@@index([needsApproval])
@@index([validationStatus])
@@index([isAmbiguous])
@@index([tenantId, employeeId, timestamp])  // Composite - BON
@@index([source])
```

### Index a Ajouter

```prisma
// Sur la table Schedule - CRITIQUE
@@index([tenantId, employeeId, date, status])

// Sur la table Attendance - RECOMMANDE
@@index([tenantId, timestamp, hasAnomaly])
@@index([tenantId, type, hasAnomaly])
```

---

## 3. Plan d'Action par Priorite

### Phase 1 - Corrections Critiques (Impact immediat)

| # | Action | Fichier | Gain Estime |
|---|--------|---------|-------------|
| 1 | Remplacer N+1 par batch query | `attendance.service.ts:2296-2322` | 5s -> 100ms |
| 2 | Ajouter index composite Schedule | `schema.prisma` | 10ms -> 1ms/lookup |

**Resultat Phase 1** : Page de **6-7s -> ~1s**

### Phase 2 - Optimisations Hautes

| # | Action | Fichier | Gain Estime |
|---|--------|---------|-------------|
| 3 | Migrer filtres vers backend | `attendance.service.ts` + `page.tsx` | -50% payload |
| 4 | Pagination reelle (50/page) | `page.tsx` + `service.ts` | -90% donnees |
| 5 | Reduire limit par defaut a 50 | `page.tsx:154` | Immediat |

**Resultat Phase 2** : Page de **~1s -> ~400ms**

### Phase 3 - Optimisations Moyennes

| # | Action | Fichier | Gain Estime |
|---|--------|---------|-------------|
| 6 | Cache long pour donnees ref | `useEmployees/useSites/...` | -4 appels API |
| 7 | Augmenter intervalle refresh | `useAttendance.ts:11` | Moins de charge |
| 8 | Compression gzip/brotli | Config NestJS | -80% taille |
| 9 | Index supplementaires | `schema.prisma` | Meilleur filtrage |

**Resultat Phase 3** : Page de **~400ms -> ~200ms**

---

## 4. Estimation Performance Apres Optimisation

```
AVANT:
  Backend:   [████████████████████████████████████████] 5500ms
  Network:   [████]                                     400ms
  Frontend:  [██]                                       200ms
  TOTAL:     ~6100ms

APRES Phase 1:
  Backend:   [███]                                      300ms
  Network:   [████]                                     400ms
  Frontend:  [██]                                       200ms
  TOTAL:     ~900ms

APRES Phase 2:
  Backend:   [█]                                        100ms
  Network:   [█]                                        100ms
  Frontend:  [██]                                       200ms
  TOTAL:     ~400ms

APRES Phase 3:
  Backend:   [█]                                        80ms
  Network:   [.]                                        30ms
  Frontend:  [█]                                        100ms
  TOTAL:     ~210ms
```

---

## 5. Localisation du Code Concerne

| Composant | Fichier | Lignes |
|-----------|---------|--------|
| Endpoint controller | `backend/src/modules/attendance/attendance.controller.ts` | 323-364 |
| Service findAll | `backend/src/modules/attendance/attendance.service.ts` | 2047-2354 |
| N+1 Schedule loop | `backend/src/modules/attendance/attendance.service.ts` | 2296-2322 |
| Schema Prisma | `backend/prisma/schema.prisma` | 508-538, 645-707 |
| Page frontend | `frontend/app/(dashboard)/attendance/page.tsx` | 149-423 |
| Hook useAttendance | `frontend/lib/hooks/useAttendance.ts` | 6-14 |
| API client | `frontend/lib/api/attendance.ts` | - |
| Hook useEmployees | `frontend/lib/hooks/useEmployees.ts` | - |

---

## 6. Risques et Precautions

- **Migration index** : `prisma migrate dev` verrouille la table pendant la creation d'index. Planifier en heure creuse.
- **Batch query OR** : Si le nombre de combinaisons employe/date depasse 1000, PostgreSQL peut ralentir sur le OR massif. Utiliser `WHERE (employeeId, date) IN (VALUES ...)` via `$queryRaw` si necessaire.
- **Pagination** : L'ajout de pagination change le comportement utilisateur. Prevoir un selecteur "par page" (25/50/100).
- **Cache** : Verifier que l'invalidation du cache fonctionne correctement apres les modifications de donnees.
