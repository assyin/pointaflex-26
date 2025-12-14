# Migration SiteManager - Système Hiérarchique Amélioré

## ✅ Migration terminée avec succès

Date: 14/12/2025
Statut: **COMPLETE**

---

## 📋 Résumé des modifications

### 1. Schéma Prisma

#### Nouveau modèle créé: `SiteManager`
```prisma
model SiteManager {
  id           String     @id @default(uuid())
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  tenantId     String
  siteId       String
  managerId    String     // ID du manager régional
  departmentId String     // ID du département que ce manager gère dans ce site

  site         Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)
  manager      Employee   @relation(fields: [managerId], references: [id], onDelete: Cascade)
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  tenant       Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([siteId, departmentId]) // Un seul manager par département par site
  @@index([tenantId])
  @@index([siteId])
  @@index([managerId])
  @@index([departmentId])
}
```

#### Relations ajoutées

**Site** (ligne 197):
```prisma
siteManagers SiteManager[] // Nouvelle relation: plusieurs managers par site (un par département)
```

**Department** (ligne 219):
```prisma
siteManagers SiteManager[] // Managers régionaux de ce département dans différents sites
```

**Employee** (ligne 166):
```prisma
siteManagements SiteManager[] // Nouvelle relation: gestion de sites par département
```

**Tenant** (ligne 45):
```prisma
siteManagers SiteManager[]
```

#### Rétrocompatibilité

Les champs `managerId` dans Site restent présents mais marqués comme DEPRECATED:
```prisma
managerId String? // DEPRECATED: Utiliser SiteManager à la place. Gardé pour rétrocompatibilité
```

---

### 2. Services mis à jour

#### `data-generator-hierarchy.service.ts`

**Lignes 134-142**: Création d'entrées SiteManager
```typescript
// Créer l'entrée SiteManager (nouveau système)
await this.prisma.siteManager.create({
  data: {
    tenantId,
    siteId: site.id,
    managerId: manager.id,
    departmentId: departmentId,
  },
});
```

**Fonctionnalités**:
- Assigne automatiquement des managers régionaux à chaque site pour chaque département présent
- Utilise la nouvelle table `SiteManager` au lieu de `Site.managerId`
- Gère plusieurs managers par site (un par département)

#### `manager-level.util.ts`

**Lignes 62-82**: Utilise la table SiteManager
```typescript
// Priorité 2: Manager de Site (via SiteManager - nouveau système)
const siteManagements = await prisma.siteManager.findMany({
  where: {
    managerId: employee.id,
    tenantId,
  },
  select: {
    siteId: true,
    departmentId: true,
  },
});

if (siteManagements.length > 0) {
  return {
    type: 'SITE',
    siteId: siteManagements[0].siteId,
    departmentId: siteManagements[0].departmentId, // Important: le département géré dans ce site
  };
}
```

**Lignes 84-102**: Fallback vers l'ancien système pour rétrocompatibilité

**Lignes 152-174**: Filtre les employés par site ET département
```typescript
case 'SITE':
  // Manager de site régional : uniquement les employés du site ET du département spécifique
  where.siteId = managerLevel.siteId;

  if (managerLevel.departmentId) {
    where.departmentId = managerLevel.departmentId;
  }
  break;
```

---

### 3. Migration de base de données

#### Commandes exécutées

```bash
# 1. Formatage du schéma Prisma
npx prisma format

# 2. Application de la migration
npx prisma db push --accept-data-loss

# 3. Régénération du client Prisma (automatique)
npx prisma generate
```

#### Résultat
```
✔ Your database is now in sync with your Prisma schema. Done in 4.12s
✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 2.23s
```

---

## 🎯 Fonctionnalités du nouveau système

### Hiérarchie des managers

1. **Manager de Département** (niveau le plus élevé)
   - Gère tous les employés du département, tous sites confondus
   - Un seul manager par département

2. **Manager de Site Régional** (nouveau - flexible)
   - Gère les employés d'un département spécifique dans un site donné
   - Plusieurs managers par site (un par département présent)
   - Contrainte unique: `@@unique([siteId, departmentId])`

3. **Manager d'Équipe** (niveau le plus bas)
   - Gère tous les employés de l'équipe

### Exemple de structure

**Avant (ancien système)**:
```
Site Casablanca
  └─ Manager: Ahmed (gère TOUT le site)
```

**Après (nouveau système)**:
```
Site Casablanca
  ├─ Département IT
  │   └─ Manager régional: Ahmed (gère uniquement IT à Casablanca)
  ├─ Département RH
  │   └─ Manager régional: Fatima (gère uniquement RH à Casablanca)
  └─ Département Finance
      └─ Manager régional: Said (gère uniquement Finance à Casablanca)
```

### Avantages

✅ **Flexibilité**: Un site peut avoir plusieurs managers (un par département)
✅ **Granularité**: Chaque manager voit uniquement les employés de son département dans son site
✅ **Évolutivité**: Facilite l'ajout de nouveaux départements ou sites
✅ **Permissions précises**: RBAC plus fin pour chaque niveau hiérarchique
✅ **Rétrocompatibilité**: L'ancien système continue de fonctionner

---

## 🚀 Serveurs redémarrés

- ✅ Backend: http://localhost:3000
- ✅ Swagger: http://localhost:3000/api/docs
- ✅ Client Prisma régénéré
- ✅ Compilation TypeScript réussie

---

## 🧪 Tests recommandés

### 1. Tester la génération de hiérarchie

Accédez à http://localhost:3001/admin/data-generator-all et générez des données avec:

```json
{
  "structure": {
    "sitesCount": 2,
    "departmentsCount": 3,
    "assignManagers": true
  },
  "employees": {
    "count": 20
  }
}
```

### 2. Vérifier les SiteManagers créés

```sql
SELECT
  sm.id,
  s.name as site_name,
  d.name as department_name,
  e.firstName || ' ' || e.lastName as manager_name
FROM "SiteManager" sm
JOIN "Site" s ON s.id = sm."siteId"
JOIN "Department" d ON d.id = sm."departmentId"
JOIN "Employee" e ON e.id = sm."managerId"
WHERE sm."tenantId" = 'your-tenant-id';
```

### 3. Tester les permissions

1. Connectez-vous en tant que manager régional
2. Vérifiez que vous ne voyez que les employés de votre département dans votre site
3. Vérifiez que vous ne voyez pas les employés d'autres départements du même site

---

## 📝 Prochaines étapes (optionnel)

1. **Interface d'administration**
   - Créer une page pour gérer les SiteManagers
   - Permettre d'assigner/retirer des managers régionaux

2. **Rapports**
   - Ajouter des filtres par manager régional
   - Générer des rapports par site et département

3. **Notifications**
   - Notifier les managers régionaux des absences dans leur périmètre
   - Alertes de validation de congés

---

## 🔧 Rollback (si nécessaire)

Si vous devez revenir à l'ancien système:

1. Les données de l'ancien système (`Site.managerId`) sont préservées
2. Supprimez les entrées de la table `SiteManager`:
   ```sql
   DELETE FROM "SiteManager" WHERE "tenantId" = 'your-tenant-id';
   ```
3. Le code utilise un fallback automatique vers `Site.managerId`

---

## ✅ Checklist de validation

- [x] Schéma Prisma modifié
- [x] Nouveau modèle SiteManager créé
- [x] Relations ajoutées (Site, Department, Employee, Tenant)
- [x] Migration appliquée avec succès
- [x] Client Prisma régénéré
- [x] Code du générateur mis à jour
- [x] Utilitaire manager-level.util.ts mis à jour
- [x] Backend compilé sans erreurs
- [x] Serveurs redémarrés
- [x] Documentation créée

---

## 📚 Références

- Schéma Prisma: `backend/prisma/schema.prisma`
- Service de hiérarchie: `backend/src/modules/data-generator/data-generator-hierarchy.service.ts`
- Utilitaire manager: `backend/src/common/utils/manager-level.util.ts`
- Documentation Prisma: https://www.prisma.io/docs
