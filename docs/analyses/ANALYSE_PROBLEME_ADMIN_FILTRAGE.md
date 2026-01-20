# Analyse du Problème de Filtrage pour admin@demo.com

## Problèmes Identifiés

### 1. **Filtrage Incorrect des Employés**
**Symptôme :** `admin@demo.com` voit uniquement les employés du site "Siège Social CASABLANCA" au lieu de tous les employés.

**Cause :** Dans `employees.service.ts`, la méthode `findAll` applique le filtrage basé sur le niveau de manager **AVANT** de vérifier si l'utilisateur a la permission `employee.view_all`. 

**Code problématique (lignes 480-518) :**
```typescript
// IMPORTANT: Détecter TOUJOURS si l'utilisateur est un manager, indépendamment des permissions
// Cela permet aux managers régionaux de voir leurs employés même s'ils n'ont que 'employee.view_team'
if (userId) {
  const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

  // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
  // PRIORITÉ: Le statut de manager prime sur les permissions
  if (managerLevel.type === 'DEPARTMENT') {
    where.departmentId = managerLevel.departmentId;
  } else if (managerLevel.type === 'SITE') {
    // ... filtrage par site
  }
  // ...
}
```

**Problème :** Même si `admin@demo.com` a la permission `employee.view_all`, si son employé associé est manager d'un site/département, le système applique quand même le filtrage de manager.

### 2. **Filtres Frontend Non Respectés**
**Symptôme :** Quand on filtre par "CPT RABAT", seulement 2 employés sont affichés au lieu de tous les employés de ce site.

**Cause :** Les filtres du frontend (lignes 520-523) sont appliqués **APRÈS** le filtrage de manager, ce qui crée une intersection :
- Filtre manager : `siteId IN ['Siège Social CASABLANCA']`
- Filtre frontend : `siteId = 'CPT RABAT'`
- Résultat : Intersection vide ou très limitée

### 3. **Profil Affiche le Mauvais Site**
**Symptôme :** Le profil de `admin@demo.com` affiche "CPT Marrakech" comme site.

**Cause :** Le profil affiche le site de l'employé associé à l'utilisateur (`profile.employee.site?.name`), pas le site de l'utilisateur lui-même. Si l'employé associé à `admin@demo.com` a été assigné au site "CPT Marrakech", c'est ce site qui s'affiche.

## Solution

### Correction de la Logique de Filtrage

La logique doit être modifiée pour :

1. **Vérifier d'abord la permission `employee.view_all`** :
   - Si l'utilisateur a `employee.view_all`, **ne pas appliquer** le filtrage de manager
   - L'utilisateur doit voir tous les employés du tenant

2. **Ensuite, vérifier le statut de manager** :
   - Si l'utilisateur n'a pas `employee.view_all` mais est manager, appliquer le filtrage de manager
   - Si l'utilisateur n'a que `employee.view_own`, filtrer par son propre ID

3. **Enfin, appliquer les filtres du frontend** :
   - Les filtres du frontend doivent être appliqués en **AND** avec les filtres précédents
   - Mais si l'utilisateur a `employee.view_all`, les filtres du frontend doivent être respectés sans restriction

### Code Corrigé

```typescript
async findAll(
  tenantId: string,
  filters?: {
    siteId?: string;
    departmentId?: string;
    teamId?: string;
    isActive?: boolean;
    search?: string;
  },
  userId?: string,
  userPermissions?: string[],
) {
  const where: any = { tenantId };

  const hasViewAll = userPermissions?.includes('employee.view_all');
  const hasViewOwn = userPermissions?.includes('employee.view_own');
  const hasViewTeam = userPermissions?.includes('employee.view_team');
  const hasViewDepartment = userPermissions?.includes('employee.view_department');
  const hasViewSite = userPermissions?.includes('employee.view_site');

  // CORRECTION: Si l'utilisateur a 'employee.view_all', NE PAS appliquer le filtrage de manager
  // Les admins doivent voir tous les employés, indépendamment de leur statut de manager
  if (userId && !hasViewAll) {
    const managerLevel = await getManagerLevel(this.prisma, userId, tenantId);

    // Si l'utilisateur est un manager, appliquer le filtrage selon son niveau hiérarchique
    if (managerLevel.type === 'DEPARTMENT') {
      where.departmentId = managerLevel.departmentId;
    } else if (managerLevel.type === 'SITE') {
      if (managerLevel.siteIds && managerLevel.siteIds.length > 0) {
        where.siteId = { in: managerLevel.siteIds };
      }
      if (managerLevel.departmentId) {
        where.departmentId = managerLevel.departmentId;
      }
    } else if (managerLevel.type === 'TEAM') {
      where.teamId = managerLevel.teamId;
    } else if (hasViewOwn) {
      // Si pas manager et a seulement 'view_own', filtrer par son propre ID
      const employee = await this.prisma.employee.findFirst({
        where: { userId, tenantId },
        select: { id: true },
      });

      if (employee) {
        where.id = employee.id;
      } else {
        return [];
      }
    }
  }

  // Appliquer les filtres du frontend (pour tous les utilisateurs, y compris les admins)
  if (filters?.siteId) where.siteId = filters.siteId;
  if (filters?.departmentId) where.departmentId = filters.departmentId;
  if (filters?.teamId) where.teamId = filters.teamId;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;

  if (filters?.search) {
    where.OR = [
      { matricule: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return this.prisma.employee.findMany({
    where,
    include: {
      site: true,
      department: true,
      team: true,
      currentShift: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

## Points à Vérifier

1. **Permissions de `admin@demo.com`** :
   - Vérifier que l'utilisateur a bien la permission `employee.view_all`
   - Vérifier les rôles assignés via `UserTenantRole`

2. **Association Employé-User** :
   - Vérifier si `admin@demo.com` a un employé associé
   - Si oui, vérifier si cet employé est manager d'un site/département
   - Si oui, c'est ce qui cause le filtrage incorrect

3. **Données dans la Base** :
   - Vérifier combien d'employés sont dans le site "CPT RABAT"
   - Vérifier combien d'employés sont dans le site "Siège Social CASABLANCA"
   - Vérifier le site assigné à l'employé associé à `admin@demo.com`

## Actions Recommandées

1. ✅ **Corriger la logique de filtrage** dans `employees.service.ts`
2. ✅ **Tester avec `admin@demo.com`** pour vérifier que tous les employés sont visibles
3. ✅ **Vérifier les filtres** pour s'assurer qu'ils fonctionnent correctement avec `employee.view_all`
4. ⚠️ **Note sur le profil** : Le profil affiche le site de l'employé associé, ce qui est normal. Si l'admin n'a pas besoin d'être associé à un employé, on peut retirer cette association.

