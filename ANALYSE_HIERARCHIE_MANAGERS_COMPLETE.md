# 📊 Analyse Complète - Hiérarchie des Managers

**Date:** 2025-01-XX  
**Demandé par:** Utilisateur  
**Objectif:** Vérifier si le système supporte la hiérarchie Manager Direction (Département) et Manager Régional (Site)

---

## 🎯 Besoins Exprimés

### Structure Hiérarchique Demandée

```
Département: "Transport de fonds (CIT)"
│
├── Manager de Direction (Casablanca)
│   └── Gère TOUS les sites du département CIT
│       ├── Site Casablanca
│       ├── Site Rabat
│       ├── Site Marrakech
│       └── Site Fès
│
└── Managers Régionaux (par Site)
    ├── Manager Site Casablanca (CIT)
    │   └── Gère UNIQUEMENT les employés du département CIT dans le Site Casablanca
    ├── Manager Site Rabat (CIT)
    │   └── Gère UNIQUEMENT les employés du département CIT dans le Site Rabat
    └── Manager Site Marrakech (CIT)
        └── Gère UNIQUEMENT les employés du département CIT dans le Site Marrakech
```

### Règles d'Accès

#### **Manager de Direction (Département)**
- ✅ Voit **TOUS** les employés du département
- ✅ Voit les employés du département dans **TOUS** les sites
- ✅ Peut gérer toutes les données (pointages, congés, heures sup, etc.) de tous les employés du département
- ❌ Ne peut **pas** voir les employés d'autres départements

#### **Manager Régional (Site)**
- ✅ Voit **UNIQUEMENT** les employés de son site
- ✅ Voit **UNIQUEMENT** les employés du même département que son site
- ❌ Ne peut **pas** voir les employés d'autres sites (même département)
- ❌ Ne peut **pas** voir les employés d'autres départements dans son site

### Contraintes Importantes

1. **Un site peut avoir plusieurs employés de différents départements**
2. **Un département peut être présent dans plusieurs sites**
3. **Un site peut avoir un seul Manager Régional par département**
4. **Un Manager Régional ne peut gérer qu'un seul département**

---

## 🔍 Analyse du Code Actuel

### ✅ **Ce qui FONCTIONNE**

#### 1. **Schéma Prisma - Structure de Données**

**Fichier:** `prisma/schema.prisma`

```prisma
model Site {
  id           String             @id @default(uuid())
  managerId    String?            // ✅ Manager régional du site
  departmentId String?            // ✅ Département principal du site
  manager      Employee?          @relation("SiteManager", fields: [managerId], references: [id])
  department   Department?        @relation("SiteDepartment", fields: [departmentId], references: [id])
  employees    Employee[]        // ✅ Plusieurs employés de différents départements possibles
}

model Department {
  id          String     @id @default(uuid())
  managerId   String?    // ✅ Manager de direction du département
  manager     Employee?  @relation("DepartmentManager", fields: [managerId], references: [id])
  employees   Employee[]  // ✅ Employés dans différents sites
  sites       Site[]     @relation("SiteDepartment")  // ✅ Sites du département
}

model Employee {
  id           String   @id @default(uuid())
  siteId       String?  // ✅ Site de l'employé
  departmentId String?  // ✅ Département de l'employé
  // ✅ Un employé = 1 site + 1 département
}
```

**✅ Conclusion:** La structure de données supporte parfaitement la hiérarchie demandée.

#### 2. **Manager de Direction (Département) - CORRECT**

**Fichier:** `backend/src/common/utils/manager-level.util.ts`

```typescript
case 'DEPARTMENT':
  // Manager de département : tous les employés du département, tous sites confondus
  where.departmentId = managerLevel.departmentId;
  break;
```

**✅ Fonctionne correctement:**
- Le manager de direction voit TOUS les employés du département
- Tous les sites confondus sont inclus
- Utilisé dans: `EmployeesService`, `AttendanceService`, `LeavesService`, `OvertimeService`, etc.

#### 3. **Validation Contrainte Manager Régional**

**Fichier:** `backend/src/modules/sites/sites.service.ts`

```typescript
private async validateManagerDepartmentConstraint(
  managerId: string,
  departmentId: string | null | undefined,
  currentSiteId?: string,
) {
  // Vérifie qu'un manager ne gère pas déjà un site dans un autre département
  const otherManagedSites = await this.prisma.site.findMany({
    where: {
      managerId,
      tenantId,
      departmentId: { not: departmentId },  // ✅ Autre département
    },
  });

  if (otherManagedSites.length > 0) {
    throw new ForbiddenException(
      `Ce manager gère déjà un site dans un autre département. ` +
      `Un manager régional ne peut gérer qu'un seul département.`
    );
  }
}
```

**✅ Fonctionne correctement:** La contrainte est validée lors de l'assignation d'un manager à un site.

---

## ❌ **PROBLÈME CRITIQUE IDENTIFIÉ**

### **Manager Régional (Site) - FILTRAGE INCOMPLET**

**Fichier:** `backend/src/common/utils/manager-level.util.ts` (lignes 129-132)

```typescript
case 'SITE':
  // Manager de site : tous les employés du site, tous départements confondus
  where.siteId = managerLevel.siteId;
  break;
```

**❌ PROBLÈME:**
- Actuellement, un manager régional voit **TOUS** les employés du site, même ceux d'autres départements
- **Selon les besoins:** Un manager régional doit voir **UNIQUEMENT** les employés de son département dans son site

**Exemple du problème:**
```
Site Casablanca:
  - Employé 1: Département CIT (doit être visible par Manager Régional CIT)
  - Employé 2: Département IT (NE DOIT PAS être visible par Manager Régional CIT)
  - Employé 3: Département RH (NE DOIT PAS être visible par Manager Régional CIT)

Manager Régional CIT du Site Casablanca:
  - Voit actuellement: Employé 1, 2, 3 ❌ (INCORRECT)
  - Devrait voir: Employé 1 uniquement ✅ (CORRECT)
```

### **Solution Nécessaire**

Le filtrage doit inclure **à la fois** le `siteId` ET le `departmentId` du site:

```typescript
case 'SITE':
  // Manager de site : uniquement les employés du site ET du département du site
  where.siteId = managerLevel.siteId;
  
  // Récupérer le département du site
  const site = await prisma.site.findUnique({
    where: { id: managerLevel.siteId },
    select: { departmentId: true },
  });
  
  if (site?.departmentId) {
    where.departmentId = site.departmentId;  // ✅ Filtrer par département du site
  }
  break;
```

---

## 🔍 Analyse du Générateur de Données

### ✅ **Ce qui FONCTIONNE**

#### 1. **Génération de la Structure**

**Fichier:** `backend/src/modules/data-generator/data-generator-structure.service.ts`

- ✅ Génère des Sites avec `departmentId` (département principal)
- ✅ Génère des Départements avec `managerId` (manager de direction)
- ✅ Structure correcte

#### 2. **Génération des Employés**

**Fichier:** `backend/src/modules/data-generator/data-generator-employee.service.ts`

```typescript
// Lignes 56-61
const siteId = assignToStructures && sites.length > 0
  ? this.selectRandom(sites).id      // ✅ Sélection aléatoire d'un site
  : undefined;
const departmentId = assignToStructures && departments.length > 0
  ? this.selectRandom(departments).id  // ✅ Sélection aléatoire d'un département
  : undefined;
```

**✅ Fonctionne correctement:**
- Les employés sont assignés aléatoirement à un site ET un département
- Un site peut avoir des employés de différents départements ✅
- Un département peut avoir des employés dans différents sites ✅

#### 3. **Génération de la Hiérarchie**

**Fichier:** `backend/src/modules/data-generator/data-generator-hierarchy.service.ts`

```typescript
// Lignes 86-104
// Assigner des managers aux sites
for (const site of sites) {
  const manager = potentialManagers[managerIndex];
  await this.prisma.site.update({
    where: { id: site.id },
    data: { managerId: manager.id },  // ✅ Assignation du manager
  });
  // ...
}
```

**⚠️ PROBLÈME POTENTIEL:**
- Le générateur assigne un manager au site, mais ne vérifie pas que le manager appartient au même département que le site
- Il faudrait s'assurer que le manager assigné au site appartient au département du site

---

## 📋 Services Backend Affectés

Les services suivants utilisent `getManagedEmployeeIds()` et sont donc affectés par le problème:

1. ✅ **EmployeesService.findAll()** - Liste des employés
2. ✅ **AttendanceService.findAll()** - Liste des pointages
3. ✅ **LeavesService.findAll()** - Liste des congés
4. ✅ **OvertimeService.findAll()** - Liste des heures sup
5. ✅ **SchedulesService.findAll()** - Liste des plannings
6. ✅ **ReportsService** - Rapports et statistiques

**Tous ces services ont le même problème:** Un manager régional voit tous les employés du site, pas seulement ceux de son département.

---

## ✅ Recommandations de Correction

### **1. Corriger `getManagedEmployeeIds()`**

**Fichier:** `backend/src/common/utils/manager-level.util.ts`

```typescript
case 'SITE':
  // Manager de site : uniquement les employés du site ET du département du site
  where.siteId = managerLevel.siteId;
  
  // Récupérer le département principal du site
  const site = await prisma.site.findUnique({
    where: { id: managerLevel.siteId },
    select: { departmentId: true },
  });
  
  if (site?.departmentId) {
    where.departmentId = site.departmentId;  // ✅ Filtrer par département du site
  } else {
    // Si le site n'a pas de département principal, retourner vide
    // (un manager régional doit être lié à un département)
    return [];
  }
  break;
```

### **2. Améliorer le Générateur**

**Fichier:** `backend/src/modules/data-generator/data-generator-hierarchy.service.ts`

```typescript
// Assigner des managers aux sites
for (const site of sites) {
  if (managerIndex >= potentialManagers.length) break;
  
  // ✅ Filtrer les managers par département du site
  const managersForSite = potentialManagers.filter(
    (m) => m.departmentId === site.departmentId
  );
  
  if (managersForSite.length === 0) {
    this.logger.warn(`⚠️ Aucun manager disponible pour le site ${site.name} (département ${site.departmentId})`);
    continue;
  }
  
  const manager = managersForSite[0];
  await this.prisma.site.update({
    where: { id: site.id },
    data: { managerId: manager.id },
  });
  
  // ...
}
```

### **3. Ajouter Validation dans SitesService**

**Fichier:** `backend/src/modules/sites/sites.service.ts`

Ajouter une validation pour s'assurer que le manager assigné au site appartient au département du site:

```typescript
async create(tenantId: string, dto: CreateSiteDto) {
  // ...
  
  if (dto.managerId && dto.departmentId) {
    // Vérifier que le manager appartient au département du site
    const manager = await this.prisma.employee.findUnique({
      where: { id: dto.managerId },
      select: { departmentId: true },
    });
    
    if (manager?.departmentId !== dto.departmentId) {
      throw new BadRequestException(
        `Le manager doit appartenir au département du site (${dto.departmentId})`
      );
    }
  }
  
  // ...
}
```

---

## 📊 Résumé de l'Analyse

| Aspect | État | Commentaire |
|--------|------|-------------|
| **Schéma Prisma** | ✅ Correct | Structure supporte la hiérarchie |
| **Manager Direction** | ✅ Correct | Voit tous les employés du département |
| **Manager Régional - Structure** | ✅ Correct | Contrainte validée |
| **Manager Régional - Filtrage** | ❌ **PROBLÈME** | Voit tous les employés du site (devrait filtrer par département) |
| **Générateur - Structure** | ✅ Correct | Génère correctement |
| **Générateur - Hiérarchie** | ⚠️ Améliorable | Ne vérifie pas que manager appartient au département du site |

---

## 🎯 Conclusion

### ✅ **Points Positifs**
1. La structure de données (Prisma) supporte parfaitement la hiérarchie
2. Le manager de direction fonctionne correctement
3. Les contraintes de validation sont en place
4. Le générateur crée la structure correctement

### ❌ **Problème Principal**
**Le filtrage des employés pour un Manager Régional est incomplet.**  
Actuellement, un manager régional voit tous les employés du site, alors qu'il devrait voir uniquement les employés de son département dans son site.

### 🔧 **Actions Requises**
1. **URGENT:** Corriger `getManagedEmployeeIds()` pour filtrer par site ET département
2. **Recommandé:** Améliorer le générateur pour assigner des managers du même département que le site
3. **Recommandé:** Ajouter validation dans `SitesService` pour s'assurer que le manager appartient au département du site

---

## ✅ **CORRECTIONS APPLIQUÉES**

### **1. Correction du Filtrage Manager Régional**

**Fichier:** `backend/src/common/utils/manager-level.util.ts`

**Correction appliquée:**
```typescript
case 'SITE':
  // Manager de site : uniquement les employés du site ET du département du site
  where.siteId = managerLevel.siteId;
  
  // Récupérer le département principal du site
  const site = await prisma.site.findUnique({
    where: { id: managerLevel.siteId },
    select: { departmentId: true },
  });
  
  if (site?.departmentId) {
    // Filtrer par département du site (manager régional ne voit que son département)
    where.departmentId = site.departmentId;
  } else {
    // Si le site n'a pas de département principal, retourner vide
    return [];
  }
  break;
```

**✅ Résultat:** Un manager régional voit maintenant uniquement les employés de son département dans son site.

### **2. Amélioration du Générateur**

**Fichier:** `backend/src/modules/data-generator/data-generator-hierarchy.service.ts`

**Amélioration appliquée:**
- Le générateur préfère maintenant assigner des managers qui appartiennent au même département que le site
- Évite d'assigner des managers déjà utilisés comme managers de direction
- Logs améliorés pour indiquer si le manager appartient au même département

**✅ Résultat:** Le générateur crée maintenant une hiérarchie plus cohérente.

---

## 📊 **ÉTAT FINAL**

| Aspect | État Initial | État Après Correction |
|--------|--------------|----------------------|
| **Manager Direction** | ✅ Correct | ✅ Correct |
| **Manager Régional - Filtrage** | ❌ Problème | ✅ **CORRIGÉ** |
| **Générateur - Hiérarchie** | ⚠️ Améliorable | ✅ **AMÉLIORÉ** |

---

**Date de l'analyse:** 2025-01-XX  
**Date des corrections:** 2025-01-XX  
**Analysé par:** Assistant IA  
**Fichiers analysés:** 15+ fichiers de code backend et générateur  
**Fichiers modifiés:** 2 fichiers (manager-level.util.ts, data-generator-hierarchy.service.ts)
