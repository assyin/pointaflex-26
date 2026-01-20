# Modification : Support de Plusieurs Managers Régionaux par Site

## 📋 Résumé

Cette modification permet à un site d'avoir **plusieurs managers régionaux**, un par département présent dans le site. Chaque manager régional ne voit que les employés de son département dans ce site spécifique.

## 🎯 Objectif

Permettre la structure hiérarchique suivante :
- **Directeur de département** : Voit tous les employés de son département dans tous les sites
- **Manager régional** : Voit uniquement les employés de son département dans son site spécifique
- **Un site peut avoir plusieurs managers régionaux** (un par département présent dans le site)

## 🔧 Modifications du Schéma Prisma

### Nouveau Modèle : `SiteManager`

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

### Modifications des Modèles Existants

1. **Site** : Ajout de la relation `siteManagers SiteManager[]`
2. **Employee** : Ajout de la relation `siteManagements SiteManager[]`
3. **Department** : Ajout de la relation `siteManagers SiteManager[]`
4. **Tenant** : Ajout de la relation `siteManagers SiteManager[]`
5. **Site.managerId** : Marqué comme DEPRECATED mais conservé pour rétrocompatibilité

## 📝 Modifications du Code

### 1. `backend/src/common/utils/manager-level.util.ts`

- **`getManagerLevel`** : Utilise maintenant `SiteManager` pour détecter les managers régionaux
- **`getManagedEmployeeIds`** : Utilise `departmentId` du `ManagerLevel` pour filtrer les employés

### 2. `backend/src/modules/data-generator/data-generator-hierarchy.service.ts`

- **`configureHierarchy`** : Crée maintenant des entrées `SiteManager` au lieu d'assigner `site.managerId`
- Pour chaque site, assigne un manager régional pour chaque département présent dans le site

## 🚀 Migration

### Étapes pour Appliquer les Changements

**Option 1 : Utiliser le script automatique (recommandé)**

Sous Linux/WSL :
```bash
cd backend
chmod +x apply-migration.sh
./apply-migration.sh
```

Sous Windows :
```bash
cd backend
apply-migration.bat
```

**Option 2 : Commandes manuelles**

1. **Vérifier le schéma Prisma** :
```bash
cd backend
npx prisma format
```

2. **Créer et appliquer la migration** :
```bash
npx prisma migrate dev --name add_site_manager_table
```

Ou si vous utilisez `db push` :
```bash
npx prisma db push --accept-data-loss
```

3. **Régénérer le client Prisma** :
```bash
npx prisma generate
```

4. **Redémarrer le serveur backend**

## ✅ Fonctionnalités

### Avant (Limitation)
- ❌ Un site = 1 manager maximum
- ❌ Le manager voit tous les employés du site (tous départements)

### Après (Nouveau Système)
- ✅ Un site = Plusieurs managers (un par département)
- ✅ Chaque manager régional voit uniquement les employés de son département dans ce site
- ✅ Un manager régional peut gérer plusieurs sites du même département
- ✅ Contrainte : Un seul manager par département par site (`@@unique([siteId, departmentId])`)

## 📊 Exemple de Structure Générée

Avec 2 départements et 3 sites :

```
Département 1 (Transport de fonds "CIT")
├── Directeur (voit tous les sites du département)
└── Sites:
    ├── Site 1 (Casablanca)
    │   └── Manager Régional 1 (voit uniquement Département 1 dans Site 1)
    ├── Site 2 (Rabat)
    │   └── Manager Régional 2 (voit uniquement Département 1 dans Site 2)
    └── Site 3 (Marrakech)
        └── Manager Régional 3 (voit uniquement Département 1 dans Site 3)

Département 2 (RH)
├── Directeur (voit tous les sites du département)
└── Sites:
    ├── Site 1 (Casablanca)
    │   └── Manager Régional 4 (voit uniquement Département 2 dans Site 1)
    ├── Site 2 (Rabat)
    │   └── Manager Régional 5 (voit uniquement Département 2 dans Site 2)
    └── Site 3 (Marrakech)
        └── Manager Régional 6 (voit uniquement Département 2 dans Site 3)
```

**Total** : 2 directeurs + 6 managers régionaux = 8 managers

## 🔄 Rétrocompatibilité

Le champ `Site.managerId` est conservé mais marqué comme DEPRECATED. Le code continue de fonctionner avec l'ancien système pour les sites existants, mais le nouveau système `SiteManager` est utilisé en priorité.

## 📌 Notes Importantes

1. **Migration des données existantes** : Si vous avez des sites avec `managerId` existants, vous devrez créer des entrées `SiteManager` correspondantes
2. **Générateur de données** : Utilise maintenant automatiquement le nouveau système
3. **API** : Les endpoints existants continuent de fonctionner, mais il faudra les mettre à jour pour utiliser `SiteManager` au lieu de `site.managerId`

## 🎯 Prochaines Étapes

1. ✅ Schéma Prisma modifié
2. ✅ Utilitaires mis à jour
3. ✅ Générateur de données mis à jour
4. ⏳ Mettre à jour `SitesService` pour utiliser `SiteManager`
5. ⏳ Mettre à jour les endpoints API si nécessaire
6. ⏳ Migration de la base de données
