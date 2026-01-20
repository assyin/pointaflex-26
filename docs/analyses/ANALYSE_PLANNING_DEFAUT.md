# Analyse Approfondie : Planning par Défaut pour les Employés

## 📋 Contexte et Problématique

### Situation Actuelle
- Le système détecte les anomalies en cherchant un `Schedule` pour chaque date
- Si aucun `Schedule` n'existe pour une date, le système détecte une **ABSENCE** (Cas A)
- Le champ `currentShiftId` existe dans le modèle `Employee` mais n'est **pas utilisé** comme fallback
- Les employés avec des shifts fixes (direction, administration) doivent avoir un planning créé manuellement pour chaque jour

### Solution Proposée
Créer automatiquement un planning par défaut pour chaque employé à sa création, basé sur son `currentShiftId`.

---

## 🔍 Analyse des Scénarios

### ✅ Scénario 1 : Employé avec Shift Fixe (Direction/Administration)
**Cas d'usage** : Employé avec shift "Matin" (08:00-17:00) fixe

**Avec planning par défaut** :
- ✅ Pas besoin de créer un planning manuellement chaque jour
- ✅ Détection automatique des retards/départs anticipés
- ✅ Calcul automatique des heures travaillées
- ✅ Pas d'absence détectée à tort

**Sans planning par défaut (situation actuelle)** :
- ❌ Doit créer un planning manuellement pour chaque jour
- ❌ Si oubli → Absence détectée à tort
- ❌ Pas de détection de retard/départ anticipé

**Verdict** : ✅ **Solution pratique et nécessaire**

---

### ✅ Scénario 2 : Employé avec Planning Spécifique (Override)
**Cas d'usage** : Employé avec shift fixe, mais planning différent pour certains jours

**Avec planning par défaut** :
- ✅ Le planning spécifique **remplace** le planning par défaut (contrainte unique `[employeeId, date]`)
- ✅ Le système utilise le planning spécifique pour cette date
- ✅ Pas de conflit

**Logique actuelle** :
```typescript
// Dans schedules.service.ts
// Contrainte unique: @@unique([employeeId, date])
// Un employé ne peut avoir qu'UN planning par jour
```

**Verdict** : ✅ **Fonctionne correctement** - Le planning spécifique a priorité

---

### ✅ Scénario 3 : Employé Sans Shift (Contrat Spécial)
**Cas d'usage** : Employé temporaire, consultant, ou sans shift défini

**Avec planning par défaut** :
- ⚠️ Si `currentShiftId` est null → Pas de planning par défaut créé
- ⚠️ Doit créer un planning manuellement pour chaque jour
- ⚠️ Sinon → Absence détectée

**Recommandation** :
- Créer un planning par défaut **seulement si** `currentShiftId` est défini
- Si `currentShiftId` est null, ne pas créer de planning (comportement actuel)

**Verdict** : ✅ **Gestion correcte** - Pas de planning si pas de shift

---

### ⚠️ Scénario 4 : Changement de Shift
**Cas d'usage** : Employé change de shift (ex: Matin → Soir)

**Avec planning par défaut** :
- ⚠️ Les plannings existants gardent l'ancien shift
- ⚠️ Seuls les nouveaux plannings utilisent le nouveau shift
- ⚠️ Incohérence possible entre anciens et nouveaux plannings

**Problèmes potentiels** :
1. **Plannings passés** : Gardent l'ancien shift (correct pour historique)
2. **Plannings futurs** : Doivent être mis à jour ou recréés
3. **Plannings par défaut** : Doivent être régénérés avec le nouveau shift

**Solutions possibles** :

#### Option A : Régénérer les plannings futurs
```typescript
// Quand currentShiftId change
// 1. Supprimer tous les plannings futurs sans planning spécifique
// 2. Recréer avec le nouveau shift
```

#### Option B : Garder les plannings existants
```typescript
// Les plannings existants restent inchangés
// Seuls les nouveaux jours utilisent le nouveau shift
```

#### Option C : Planning par défaut virtuel (Recommandé)
```typescript
// Ne pas créer de planning physique
// Utiliser currentShiftId comme fallback dans la logique de détection
```

**Verdict** : ⚠️ **Nécessite une stratégie claire** - Voir solution complète ci-dessous

---

### ⚠️ Scénario 5 : Employé Inactif ou Désactivé
**Cas d'usage** : Employé désactivé temporairement ou définitivement

**Avec planning par défaut** :
- ⚠️ Les plannings par défaut continuent d'exister
- ⚠️ Le job batch de détection d'absences vérifie `isActive`
- ✅ Pas d'absence détectée pour les employés inactifs

**Recommandation** :
- Supprimer ou désactiver les plannings futurs quand `isActive = false`
- Recréer quand `isActive = true` à nouveau

**Verdict** : ⚠️ **Nécessite gestion du cycle de vie**

---

### ⚠️ Scénario 6 : Jours Non Ouvrables
**Cas d'usage** : Dimanche, jours fériés, etc.

**Avec planning par défaut** :
- ⚠️ Un planning est créé même pour les jours non ouvrables
- ⚠️ Le job batch vérifie `workingDays` mais les plannings existent
- ⚠️ Risque de détection d'absence à tort

**Recommandation** :
- Ne créer des plannings par défaut **que pour les jours ouvrables**
- Utiliser `TenantSettings.workingDays` pour déterminer les jours ouvrables

**Verdict** : ⚠️ **Nécessite filtrage par jours ouvrables**

---

## 🎯 Solution Complète Recommandée

### Approche Hybride : Planning par Défaut + Fallback Virtuel

#### 1. **Planning par Défaut Physique** (Pour les jours ouvrables futurs)

**Avantages** :
- ✅ Détection immédiate des retards/départs anticipés
- ✅ Calcul automatique des heures travaillées
- ✅ Pas de requête supplémentaire lors de la détection

**Inconvénients** :
- ⚠️ Stockage de nombreux enregistrements
- ⚠️ Gestion du cycle de vie (changement de shift, désactivation)
- ⚠️ Synchronisation avec jours ouvrables

#### 2. **Fallback Virtuel** (Utiliser currentShiftId si pas de Schedule)

**Avantages** :
- ✅ Pas de stockage massif
- ✅ Flexibilité totale
- ✅ Pas de gestion de cycle de vie

**Inconvénients** :
- ⚠️ Requête supplémentaire (Employee + Shift) lors de la détection
- ⚠️ Performance légèrement impactée

### 🏆 Solution Recommandée : **Approche Hybride Optimisée**

#### Phase 1 : Fallback Virtuel (Immédiat)
Modifier la logique de détection pour utiliser `currentShiftId` comme fallback si aucun Schedule n'existe.

#### Phase 2 : Planning par Défaut Intelligent (Optionnel)
Créer des plannings par défaut uniquement pour les jours ouvrables futurs (ex: 30 jours), avec régénération automatique.

---

## 📝 Implémentation Détaillée

### Solution 1 : Fallback Virtuel (Recommandée - Priorité Haute)

#### A. Modifier `detectAnomalies()` dans `attendance.service.ts`

```typescript
// Dans detectAnomalies(), section détection LATE
if (type === AttendanceType.IN) {
  let schedule = await this.prisma.schedule.findFirst({
    where: {
      tenantId,
      employeeId,
      date: { gte: startOfDay, lte: endOfDay },
      status: 'PUBLISHED',
    },
    include: { shift: true },
  });

  // FALLBACK : Si pas de schedule, utiliser currentShiftId
  if (!schedule) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { currentShiftId: true },
      include: {
        currentShift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (employee?.currentShift) {
      // Créer un schedule virtuel pour la détection
      schedule = {
        id: 'virtual',
        date: timestamp,
        shift: employee.currentShift,
        shiftId: employee.currentShift.id,
        customStartTime: null,
        customEndTime: null,
        status: 'PUBLISHED',
        tenantId,
        employeeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }
  }

  // Continuer avec la logique existante...
  if (schedule?.shift && schedule.status === 'PUBLISHED') {
    // Détection LATE, ABSENCE_PARTIAL, etc.
  }
}
```

#### B. Modifier `calculateMetrics()` de la même manière

```typescript
// Dans calculateMetrics()
let schedule = await this.prisma.schedule.findFirst({
  // ... même logique de fallback
});

if (!schedule) {
  // Fallback vers currentShiftId
  // ...
}
```

#### C. Modifier le Job Batch `detect-absences.job.ts`

```typescript
// Dans detectAbsencesForTenant()
// Au lieu de chercher seulement les schedules, chercher aussi les employés avec currentShiftId
const employeesWithDefaultShift = await this.prisma.employee.findMany({
  where: {
    tenantId,
    isActive: true,
    currentShiftId: { not: null },
  },
  include: {
    currentShift: true,
  },
});

// Pour chaque employé avec shift par défaut
for (const employee of employeesWithDefaultShift) {
  // Vérifier s'il y a un planning spécifique pour cette date
  const specificSchedule = await this.prisma.schedule.findFirst({
    where: {
      tenantId,
      employeeId: employee.id,
      date: { gte: startDate, lte: endDate },
    },
  });

  // Si pas de planning spécifique, utiliser le shift par défaut
  if (!specificSchedule) {
    // Vérifier si c'est un jour ouvrable
    // Vérifier s'il y a un pointage
    // Détecter absence si nécessaire
  }
}
```

---

### Solution 2 : Planning par Défaut Physique (Optionnel)

#### A. Créer un Service de Génération de Planning par Défaut

```typescript
// backend/src/modules/schedules/services/default-schedule.service.ts

@Injectable()
export class DefaultScheduleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un planning par défaut pour un employé
   * Seulement pour les jours ouvrables futurs (30 jours par défaut)
   */
  async createDefaultSchedules(
    tenantId: string,
    employeeId: string,
    daysAhead: number = 30
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { currentShiftId: true },
    });

    if (!employee?.currentShiftId) {
      return; // Pas de shift par défaut
    }

    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { workingDays: true },
    });

    const workingDays = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5, 6];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedulesToCreate = [];

    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

      // Vérifier si c'est un jour ouvrable
      if (!workingDays.includes(normalizedDayOfWeek)) {
        continue;
      }

      // Vérifier si un planning spécifique existe déjà
      const existingSchedule = await this.prisma.schedule.findFirst({
        where: {
          tenantId,
          employeeId,
          date: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lte: new Date(date.setHours(23, 59, 59, 999)),
          },
        },
      });

      if (!existingSchedule) {
        schedulesToCreate.push({
          tenantId,
          employeeId,
          shiftId: employee.currentShiftId,
          date: new Date(date),
          status: 'PUBLISHED',
        });
      }
    }

    // Créer en batch
    if (schedulesToCreate.length > 0) {
      await this.prisma.schedule.createMany({
        data: schedulesToCreate,
        skipDuplicates: true,
      });
    }
  }

  /**
   * Régénère les plannings par défaut (appelé quand currentShiftId change)
   */
  async regenerateDefaultSchedules(
    tenantId: string,
    employeeId: string
  ) {
    // Supprimer les plannings futurs qui ne sont pas spécifiques
    // (marqués comme "par défaut" - nécessite un champ isDefault)
    // Puis recréer avec le nouveau shift
  }
}
```

#### B. Appeler lors de la création d'employé

```typescript
// Dans employees.service.ts
async create(tenantId: string, dto: CreateEmployeeDto) {
  const employee = await this.prisma.employee.create({
    // ... création
  });

  // Si currentShiftId est défini, créer les plannings par défaut
  if (dto.currentShiftId) {
    await this.defaultScheduleService.createDefaultSchedules(
      tenantId,
      employee.id
    );
  }

  return employee;
}
```

#### C. Appeler lors du changement de shift

```typescript
// Dans employees.service.ts
async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
  const employee = await this.prisma.employee.findUnique({
    where: { id },
    select: { currentShiftId: true },
  });

  const updated = await this.prisma.employee.update({
    // ... mise à jour
  });

  // Si currentShiftId a changé, régénérer les plannings
  if (dto.currentShiftId && dto.currentShiftId !== employee?.currentShiftId) {
    await this.defaultScheduleService.regenerateDefaultSchedules(
      tenantId,
      id
    );
  }

  return updated;
}
```

---

## 🔄 Impact sur les Interfaces

### 1. **Page de Création d'Employé** (`/employees`)
- ✅ Aucun changement nécessaire
- ✅ Le champ `currentShiftId` existe déjà
- ✅ Le planning par défaut sera créé automatiquement en backend

### 2. **Page de Modification d'Employé** (`/employees`)
- ⚠️ **Changement nécessaire** : Afficher un avertissement si `currentShiftId` change
- ⚠️ Message : "Les plannings futurs seront mis à jour avec le nouveau shift"

### 3. **Page de Planning** (`/schedules`)
- ✅ Aucun changement nécessaire
- ✅ Les plannings par défaut apparaîtront comme des plannings normaux
- ⚠️ **Optionnel** : Ajouter un indicateur visuel pour distinguer "Planning par défaut" vs "Planning spécifique"

### 4. **Page d'Attendance** (`/attendance`)
- ✅ Aucun changement nécessaire
- ✅ La détection fonctionnera automatiquement avec le fallback

### 5. **Page de Rapports**
- ✅ Aucun changement nécessaire
- ✅ Les calculs utiliseront les plannings par défaut

---

## ⚡ Performance et Optimisation

### Impact Performance avec Fallback Virtuel

**Requêtes supplémentaires** :
- 1 requête `Employee` avec `currentShift` par pointage
- Impact : **Minimal** (requête indexée par `id`)

**Optimisation** :
```typescript
// Cache le résultat dans le contexte de la requête
// Utiliser un cache Redis pour les employés actifs
```

### Impact Performance avec Planning Physique

**Stockage** :
- ~30 plannings par employé (30 jours)
- 100 employés = 3000 enregistrements
- Impact : **Acceptable** (indexation par `[employeeId, date]`)

**Requêtes** :
- Pas de requête supplémentaire lors de la détection
- Impact : **Meilleur** que le fallback virtuel

---

## ✅ Recommandation Finale

### **Solution Hybride Optimisée**

1. **Phase 1 (Immédiat)** : Implémenter le **Fallback Virtuel**
   - ✅ Pas de changement de schéma
   - ✅ Pas de stockage massif
   - ✅ Flexibilité totale
   - ✅ Performance acceptable

2. **Phase 2 (Optionnel)** : Ajouter **Planning par Défaut Physique**
   - ✅ Meilleure performance
   - ✅ Détection plus rapide
   - ⚠️ Nécessite gestion du cycle de vie
   - ⚠️ Nécessite champ `isDefault` pour distinguer

### **Champ `isDefault` dans Schedule (Recommandé)**

Ajouter un champ optionnel pour distinguer les plannings par défaut :

```prisma
model Schedule {
  // ... champs existants
  isDefault Boolean @default(false) // Planning généré automatiquement
}
```

**Avantages** :
- Permet de supprimer/régénérer uniquement les plannings par défaut
- Permet de garder les plannings spécifiques intacts
- Permet d'afficher un indicateur visuel dans l'interface

---

## 🚨 Points d'Attention

### 1. **Gestion du Changement de Shift**
- ⚠️ Décider si on régénère les plannings futurs ou non
- ⚠️ Conserver l'historique des plannings passés

### 2. **Jours Ouvrables**
- ⚠️ Ne créer des plannings que pour les jours ouvrables
- ⚠️ Utiliser `TenantSettings.workingDays`

### 3. **Employés Inactifs**
- ⚠️ Supprimer/désactiver les plannings futurs
- ⚠️ Recréer quand réactivé

### 4. **Performance**
- ⚠️ Limiter le nombre de jours de planning par défaut (ex: 30 jours)
- ⚠️ Régénérer automatiquement (job batch quotidien)

### 5. **Conflits avec Plannings Spécifiques**
- ✅ La contrainte unique `[employeeId, date]` garantit qu'un seul planning existe par jour
- ✅ Le planning spécifique a toujours priorité

---

## 📊 Comparaison des Solutions

| Critère | Fallback Virtuel | Planning Physique | Hybride |
|---------|------------------|-------------------|---------|
| **Performance** | ⚠️ Bonne | ✅ Excellente | ✅ Excellente |
| **Flexibilité** | ✅ Totale | ⚠️ Moyenne | ✅ Totale |
| **Stockage** | ✅ Minimal | ⚠️ Important | ⚠️ Important |
| **Complexité** | ✅ Simple | ⚠️ Moyenne | ⚠️ Moyenne |
| **Maintenance** | ✅ Facile | ⚠️ Complexe | ⚠️ Complexe |
| **Détection** | ✅ Immédiate | ✅ Immédiate | ✅ Immédiate |

---

## 🎯 Plan d'Implémentation Recommandé

### Étape 1 : Fallback Virtuel (1-2 jours)
1. Modifier `detectAnomalies()` pour utiliser `currentShiftId` comme fallback
2. Modifier `calculateMetrics()` de la même manière
3. Modifier le job batch `detect-absences.job.ts`
4. Tests unitaires et d'intégration

### Étape 2 : Planning par Défaut Physique (Optionnel - 2-3 jours)
1. Ajouter champ `isDefault` au modèle `Schedule`
2. Créer `DefaultScheduleService`
3. Intégrer dans `employees.service.ts`
4. Créer job batch pour régénération automatique
5. Tests et validation

### Étape 3 : Interface Utilisateur (1 jour)
1. Ajouter indicateur visuel pour plannings par défaut
2. Avertissement lors du changement de shift
3. Option pour désactiver planning par défaut

---

## ✅ Conclusion

La solution de **planning par défaut** est **pratique et nécessaire** pour les employés avec shifts fixes. 

**Recommandation** : Commencer par le **Fallback Virtuel** (simple, flexible, performant), puis ajouter le **Planning Physique** si nécessaire pour optimiser les performances.

La solution hybride offre le meilleur compromis entre flexibilité, performance et maintenabilité.

