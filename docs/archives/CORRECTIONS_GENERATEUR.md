# Corrections du Générateur de Données

## Résumé des problèmes corrigés

### 1. ❌ Erreur des dates invalides pour les congés
**Problème** : Le service de génération des congés créait des objets `Date` invalides car `startDate` et `endDate` n'étaient pas passés par l'orchestrateur.

**Correction** :
- Ajout des propriétés `startDate` et `endDate` dans `LeavesConfigDto`
- Modification de l'orchestrateur pour passer des dates par défaut (début et fin d'année courante)
- Ajout de validations dans le service de congés pour détecter les dates invalides

**Fichiers modifiés** :
- `src/modules/data-generator/dto/generate-all-data.dto.ts` (lignes 289-297)
- `src/modules/data-generator/data-generator-orchestrator.service.ts` (lignes 197-210)
- `src/modules/data-generator/data-generator-leaves.service.ts` (lignes 90-108)

### 2. ❌ Création de seulement 3 employés au lieu de 10
**Problème** : Le compteur de matricules (`employeeIndex`) commençait toujours à 1 et tous les employés tentaient de se créer avec le matricule `EMP0001` qui existait déjà.

**Correction** :
- Recherche du dernier employé existant pour trouver le prochain index disponible
- Extraction du numéro du matricule (ex: EMP0042 → 43)
- Suppression de la vérification d'existence car on utilise maintenant un index séquentiel

**Fichiers modifiés** :
- `src/modules/data-generator/data-generator-employee.service.ts` (lignes 47-131)

### 3. ❌ Erreur de contrainte unique sur userId
**Problème** : Lors de la génération, plusieurs employés tentaient d'utiliser le même `userId`, causant l'erreur "Unique constraint failed on the fields: (`userId`)". Seuls 2 employés étaient créés au lieu de 10.

**Correction** :
- Ajout d'un `Set<string>` pour tracker les userIds déjà assignés pendant la génération en cours
- Modification du filtre pour exclure à la fois les utilisateurs ayant déjà un employé ET ceux assignés dans cette génération
- Ajout immédiat du userId au Set après sélection

**Fichiers modifiés** :
- `src/modules/data-generator/data-generator-employee.service.ts` (lignes 66, 94, 98)

**Code de la correction pour le problème 2 (matricules)** :
```typescript
// Trouver le prochain index de matricule disponible
const lastEmployee = await this.prisma.employee.findFirst({
  where: { tenantId },
  orderBy: { matricule: 'desc' },
});
let employeeIndex = 1;
if (lastEmployee && lastEmployee.matricule) {
  const match = lastEmployee.matricule.match(/\d+$/);
  if (match) {
    employeeIndex = parseInt(match[0], 10) + 1;
  }
}
```

**Code de la correction pour le problème 3 (userId unique)** :
```typescript
// Avant (INCORRECT) :
let userId: string | undefined;
if (linkToUsers && users.length > 0) {
  const availableUsers = users.filter((u) => !u.employee);
  if (availableUsers.length > 0) {
    userId = this.selectRandom(availableUsers).id; // ❌ Peut sélectionner le même user plusieurs fois
  }
}

// Après (CORRECT) :
const assignedUserIds = new Set<string>(); // Tracker les userIds déjà assignés

for (let i = 0; i < count; i++) {
  // ... génération des données ...

  let userId: string | undefined;
  if (linkToUsers && users.length > 0) {
    // Filtrer les utilisateurs qui n'ont pas d'employé ET qui n'ont pas été assignés dans cette génération
    const availableUsers = users.filter((u) => !u.employee && !assignedUserIds.has(u.id));
    if (availableUsers.length > 0) {
      const selectedUser = this.selectRandom(availableUsers);
      userId = selectedUser.id;
      assignedUserIds.add(userId); // ✅ Marquer comme assigné
    }
  }

  // ... création de l'employé ...
}
```

## Configuration par défaut recommandée

Pour éviter les erreurs futures, voici la configuration par défaut à utiliser dans le formulaire frontend :

### Onglet 1 : Structure 🏢
```json
{
  "structure": {
    "sitesCount": 2,
    "departmentsCount": 3,
    "positionsCount": 5,
    "teamsCount": 2,
    "assignManagers": true
  }
}
```

### Onglet 1 : RBAC - Utilisateurs
```json
{
  "rbac": {
    "usersPerRole": {
      "SUPER_ADMIN": 1,
      "ADMIN_RH": 1,
      "MANAGER": 2,
      "EMPLOYEE": 10
    }
  }
}
```

### Onglet 1 : Employés
```json
{
  "employees": {
    "count": 10,
    "linkToUsers": true,
    "assignToStructures": true
  }
}
```

### Onglet 2 : Horaires ⏰
```json
{
  "shifts": {
    "createDefault": true,
    "assignToEmployees": true
  },
  "holidays": {
    "generateMoroccoHolidays": true,
    "startYear": 2024,
    "endYear": 2025
  },
  "schedules": {
    "startDate": "aujourd'hui",
    "endDate": "+30 jours",
    "coverage": 100,
    "excludeHolidays": true,
    "excludeWeekends": true
  }
}
```

### Onglet 3 : Absences 📅
```json
{
  "leaves": {
    "startDate": "aujourd'hui - 90 jours",
    "endDate": "aujourd'hui + 90 jours",
    "percentage": 30,
    "averageDaysPerEmployee": 3,
    "workflow": {
      "autoApprove": false,
      "approvalDistribution": {
        "PENDING": 20,
        "MANAGER_APPROVED": 30,
        "APPROVED": 50,
        "REJECTED": 0
      }
    }
  }
}
```

### Onglet 4 : Pointages 📊
```json
{
  "attendance": {
    "startDate": "aujourd'hui - 7 jours",
    "endDate": "aujourd'hui",
    "distribution": {
      "normal": 70,
      "late": 15,
      "earlyLeave": 5,
      "anomaly": 5,
      "mission": 3,
      "absence": 2
    },
    "excludeHolidays": true,
    "excludeWeekends": true,
    "generateOvertime": true
  },
  "overtime": {
    "count": 5,
    "averageHours": 2,
    "statusDistribution": {
      "PENDING": 30,
      "APPROVED": 60,
      "REJECTED": 10
    }
  },
  "recovery": {
    "count": 3,
    "convertFromOvertime": true,
    "conversionRate": 20
  }
}
```

### Onglet 5 : Équipements 📱
```json
{
  "devices": {
    "perSite": 1
  },
  "replacements": {
    "count": 3,
    "statusDistribution": {
      "PENDING": 20,
      "APPROVED": 70,
      "REJECTED": 10
    }
  },
  "notifications": {
    "count": 10
  }
}
```

### Onglet 6 : Options ⚙️
```json
{
  "options": {
    "markAsGenerated": true,
    "useTransactions": true,
    "stopOnError": false
  }
}
```

## Tests recommandés

1. **Nettoyer les données existantes** (optionnel) :
   - Utiliser l'endpoint `/api/v1/data-generator/all/cleanup`

2. **Lancer la génération** :
   - Utiliser l'endpoint `/api/v1/data-generator/all/generate` avec la configuration ci-dessus

3. **Vérifier les résultats** :
   - Vérifier que 10 employés ont été créés (EMP0001 à EMP0010 ou suite)
   - Vérifier que les congés ont été générés sans erreur
   - Vérifier les pointages, overtimes, etc.

## Serveurs

### Backend
- **URL locale** : http://localhost:3000
- **URL réseau** : http://0.0.0.0:3000
- **Swagger** : http://localhost:3000/api/docs
- **Statut** : ✅ En cours d'exécution

### Frontend
- **URL locale** : http://localhost:3001
- **URL réseau** : http://0.0.0.0:3001
- **Statut** : ✅ En cours d'exécution

## 🎯 Nouveau système de gestion hiérarchique (SiteManager)

### Date: 14/12/2025 - ✅ IMPLEMENTÉ

Un nouveau système de gestion hiérarchique a été implémenté pour permettre plusieurs managers régionaux par site (un par département).

**Avant**:
- Un site = un seul manager (gérait tout le site)

**Après**:
- Un site = plusieurs managers régionaux (un par département présent)
- Chaque manager régional gère uniquement son département dans son site

**Modifications apportées**:

1. **Nouveau modèle Prisma**: `SiteManager`
   - Contrainte unique: `@@unique([siteId, departmentId])`
   - Relations: Site, Department, Employee, Tenant

2. **Services mis à jour**:
   - `data-generator-hierarchy.service.ts`: Crée automatiquement des SiteManagers
   - `manager-level.util.ts`: Utilise le nouveau système avec fallback vers l'ancien

3. **Migration appliquée**:
   ```bash
   npx prisma format
   npx prisma db push --accept-data-loss
   npx prisma generate
   ```

4. **Avantages**:
   - ✅ Granularité: Managers voient uniquement leur département dans leur site
   - ✅ Flexibilité: Plusieurs managers par site possibles
   - ✅ Rétrocompatibilité: L'ancien système continue de fonctionner

**Documentation complète**: Voir `/backend/MIGRATION_SITEMANAGER_COMPLETE.md`

---

## Prochaines étapes

1. Tester la génération avec les paramètres par défaut ci-dessus
2. Vérifier que les SiteManagers sont correctement créés lors de la génération
3. Tester les permissions des managers régionaux (visibilité des employés)
4. Si des erreurs persistent, consulter les logs du serveur backend
5. Ajuster les paramètres selon les besoins spécifiques
