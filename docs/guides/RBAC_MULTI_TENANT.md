# Système RBAC Multi-Tenant - PointageFlex

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Modèle de données](#modèle-de-données)
3. [Architecture NestJS](#architecture-nestjs)
4. [Permissions métier](#permissions-métier)
5. [Rôles par défaut](#rôles-par-défaut)
6. [Utilisation](#utilisation)
7. [Migration depuis l'ancien système](#migration-depuis-lancien-système)
8. [Sécurité](#sécurité)

---

## Vue d'ensemble

Le système RBAC (Role-Based Access Control) multi-tenant permet :

- **Un utilisateur peut appartenir à plusieurs tenants** avec des rôles différents dans chacun
- **Permissions granulaires** : chaque action est contrôlée par une permission atomique
- **Rôles composables** : les rôles sont des collections de permissions
- **Rôles personnalisables** : possibilité de créer des rôles personnalisés par tenant
- **Audit complet** : tous les changements de droits sont tracés

### Concepts clés

- **User** : Identité globale (email unique globalement)
- **Tenant** : Entreprise (client)
- **Role** : Rôle logique (SUPER_ADMIN, ADMIN_RH, MANAGER, EMPLOYEE, ou personnalisé)
- **Permission** : Action atomique (ex: `employee.view_all`, `attendance.edit`)
- **UserTenantRole** : Liaison indiquant quel utilisateur a quel rôle dans quel tenant

---

## Modèle de données

### Schéma Prisma

```prisma
model User {
  id                String            @id @default(uuid())
  email             String            @unique // Email unique globalement
  tenantId          String?           // Optionnel (legacy, pour compatibilité)
  role              Role?             // Optionnel (legacy, pour compatibilité)
  userTenantRoles   UserTenantRole[]
  // ...
}

model Role {
  id          String            @id @default(uuid())
  tenantId    String?           // null = rôle système (SUPER_ADMIN uniquement)
  code        String            // Ex: "ADMIN_RH", "MANAGER", "CUSTOM_ROLE"
  name        String
  description String?
  isSystem    Boolean           @default(false)
  isActive    Boolean           @default(true)
  permissions RolePermission[]
  userRoles   UserTenantRole[]
  
  @@unique([tenantId, code])
}

model Permission {
  id          String            @id @default(uuid())
  code        String            @unique // Ex: "employee.view_all"
  name        String
  category    String            // Ex: "employees", "attendance"
  isActive    Boolean           @default(true)
  rolePermissions RolePermission[]
}

model RolePermission {
  id           String     @id @default(uuid())
  roleId       String
  permissionId String
  role         Role
  permission   Permission
  
  @@unique([roleId, permissionId])
}

model UserTenantRole {
  id        String   @id @default(uuid())
  userId    String
  tenantId  String
  roleId    String
  assignedBy String?
  assignedAt DateTime @default(now())
  isActive  Boolean  @default(true)
  user      User
  tenant    Tenant
  role      Role
  
  @@unique([userId, tenantId, roleId])
}
```

### Relations

```
User 1---N UserTenantRole N---1 Tenant
UserTenantRole N---1 Role
Role N---N Permission (via RolePermission)
```

---

## Architecture NestJS

### Modules

#### 1. PermissionsModule

**Fichiers :**
- `permissions.module.ts`
- `permissions.service.ts`
- `permissions.controller.ts`

**Responsabilités :**
- Gestion des permissions
- Vérification des permissions utilisateur
- Récupération des permissions par catégorie

**Endpoints :**
- `GET /api/v1/permissions` - Liste toutes les permissions
- `GET /api/v1/permissions/category/:category` - Permissions par catégorie
- `GET /api/v1/permissions/role/:roleId` - Permissions d'un rôle

#### 2. RolesModule

**Fichiers :**
- `roles.module.ts`
- `roles.service.ts`
- `roles.controller.ts`
- `dto/create-role.dto.ts`
- `dto/update-role.dto.ts`

**Responsabilités :**
- Gestion des rôles (système et tenant)
- Association permissions ↔ rôles
- Initialisation des rôles par défaut

**Endpoints :**
- `POST /api/v1/roles` - Créer un rôle
- `GET /api/v1/roles` - Liste des rôles
- `GET /api/v1/roles/:id` - Détails d'un rôle
- `PATCH /api/v1/roles/:id` - Modifier un rôle
- `DELETE /api/v1/roles/:id` - Supprimer un rôle
- `POST /api/v1/roles/:id/permissions` - Assigner des permissions

#### 3. UsersModule (étendu)

**Nouveaux fichiers :**
- `user-tenant-roles.service.ts`

**Nouveaux endpoints :**
- `GET /api/v1/users/:id/roles` - Rôles d'un utilisateur dans le tenant courant
- `POST /api/v1/users/:id/roles` - Assigner des rôles
- `PATCH /api/v1/users/:id/roles` - Mettre à jour les rôles
- `DELETE /api/v1/users/:id/roles/:roleId` - Retirer un rôle
- `GET /api/v1/users/me/tenants` - Tous les tenants de l'utilisateur connecté

### Guards & Décorateurs

#### PermissionsGuard

**Fichier :** `backend/src/common/guards/permissions.guard.ts`

Vérifie si l'utilisateur a les permissions requises pour accéder à une route.

**Utilisation :**
```typescript
@UseGuards(PermissionsGuard)
@RequirePermissions('employee.view_all', 'attendance.edit')
@Get()
findAll() {
  // ...
}
```

#### Décorateur @RequirePermissions

**Fichier :** `backend/src/common/decorators/permissions.decorator.ts`

Définit les permissions requises pour accéder à un endpoint.

**Logique :** OR (avoir l'une des permissions suffit)

**Exemple :**
```typescript
@RequirePermissions('employee.view_all') // Nécessite cette permission
@RequirePermissions('employee.view_all', 'employee.view_team') // Nécessite l'une des deux
```

### JwtStrategy (mis à jour)

Le `JwtStrategy` charge maintenant les rôles et permissions de l'utilisateur pour le tenant spécifié dans le token JWT.

**Structure du user dans la requête :**
```typescript
{
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Legacy (pour compatibilité)
  tenantId: string; // Legacy (pour compatibilité)
  roles: string[]; // Nouveaux rôles multi-tenant
  permissions: string[]; // Permissions dérivées des rôles
}
```

---

## Permissions métier

### Catégorie : Employees

| Code | Nom | Description |
|------|-----|-------------|
| `employee.view_all` | Voir tous les employés | Accès à la liste complète des employés |
| `employee.view_own` | Voir ses propres informations | Accès à ses propres données |
| `employee.create` | Créer un employé | Création de nouveaux employés |
| `employee.update` | Modifier un employé | Modification des données employé |
| `employee.delete` | Supprimer un employé | Suppression d'employés |
| `employee.import` | Importer des employés | Import CSV/Excel |
| `employee.export` | Exporter des employés | Export des données |
| `employee.manage_biometric` | Gérer les données biométriques | Gestion empreintes, visage, RFID |

### Catégorie : Attendance

| Code | Nom | Description |
|------|-----|-------------|
| `attendance.view_all` | Voir tous les pointages | Accès à tous les pointages |
| `attendance.view_own` | Voir ses propres pointages | Accès à ses propres pointages |
| `attendance.view_team` | Voir les pointages de son équipe | Pointages de l'équipe |
| `attendance.create` | Créer un pointage | Création manuelle |
| `attendance.edit` | Modifier un pointage | Modification |
| `attendance.correct` | Corriger un pointage | Correction d'anomalies |
| `attendance.delete` | Supprimer un pointage | Suppression |
| `attendance.import` | Importer des pointages | Import CSV/Excel |
| `attendance.export` | Exporter des pointages | Export |
| `attendance.view_anomalies` | Voir les anomalies | Liste des anomalies |

### Catégorie : Schedules

| Code | Nom | Description |
|------|-----|-------------|
| `schedule.view_all` | Voir tous les plannings | Accès complet |
| `schedule.view_own` | Voir son propre planning | Planning personnel |
| `schedule.view_team` | Voir le planning de son équipe | Planning équipe |
| `schedule.create` | Créer un planning | Création |
| `schedule.update` | Modifier un planning | Modification |
| `schedule.delete` | Supprimer un planning | Suppression |
| `schedule.manage_team` | Gérer le planning de son équipe | Gestion équipe |
| `schedule.approve_replacement` | Approuver un remplacement | Validation remplacements |

### Catégorie : Shifts

| Code | Nom | Description |
|------|-----|-------------|
| `shift.view_all` | Voir tous les shifts | Liste complète |
| `shift.create` | Créer un shift | Création |
| `shift.update` | Modifier un shift | Modification |
| `shift.delete` | Supprimer un shift | Suppression |

### Catégorie : Leaves

| Code | Nom | Description |
|------|-----|-------------|
| `leave.view_all` | Voir tous les congés | Accès complet |
| `leave.view_own` | Voir ses propres congés | Congés personnels |
| `leave.view_team` | Voir les congés de son équipe | Congés équipe |
| `leave.create` | Demander un congé | Création demande |
| `leave.update` | Modifier une demande | Modification |
| `leave.approve` | Approuver un congé | Validation |
| `leave.reject` | Refuser un congé | Refus |
| `leave.manage_types` | Gérer les types de congés | Gestion types |

### Catégorie : Overtime

| Code | Nom | Description |
|------|-----|-------------|
| `overtime.view_all` | Voir toutes les heures sup | Accès complet |
| `overtime.view_own` | Voir ses propres heures sup | Heures sup personnelles |
| `overtime.approve` | Approuver des heures sup | Validation |
| `recovery.view` | Voir les récupérations | Liste récupérations |

### Catégorie : Reports

| Code | Nom | Description |
|------|-----|-------------|
| `reports.view_all` | Voir tous les rapports | Accès complet |
| `reports.view_attendance` | Voir les rapports de présence | Rapports présence |
| `reports.view_leaves` | Voir les rapports de congés | Rapports congés |
| `reports.view_overtime` | Voir les rapports d'heures sup | Rapports heures sup |
| `reports.export` | Exporter des rapports | Export |
| `reports.view_payroll` | Voir les exports paie | Exports paie |

### Catégorie : Users

| Code | Nom | Description |
|------|-----|-------------|
| `user.view_all` | Voir tous les utilisateurs | Liste complète |
| `user.create` | Créer un utilisateur | Création |
| `user.update` | Modifier un utilisateur | Modification |
| `user.delete` | Supprimer un utilisateur | Suppression |
| `user.view_roles` | Voir les rôles d'un utilisateur | Rôles utilisateur |
| `user.assign_roles` | Assigner des rôles | Attribution rôles |
| `user.remove_roles` | Retirer des rôles | Retrait rôles |
| `role.view_all` | Voir tous les rôles | Liste rôles |
| `role.create` | Créer un rôle | Création rôle |
| `role.update` | Modifier un rôle | Modification rôle |
| `role.delete` | Supprimer un rôle | Suppression rôle |

### Catégorie : Settings

| Code | Nom | Description |
|------|-----|-------------|
| `tenant.view_settings` | Voir les paramètres | Consultation |
| `tenant.update_settings` | Modifier les paramètres | Modification |
| `tenant.manage_sites` | Gérer les sites | Gestion sites |
| `tenant.manage_departments` | Gérer les départements | Gestion départements |
| `tenant.manage_positions` | Gérer les postes | Gestion postes |
| `tenant.manage_teams` | Gérer les équipes | Gestion équipes |
| `tenant.manage_holidays` | Gérer les jours fériés | Gestion jours fériés |
| `tenant.manage_devices` | Gérer les terminaux | Gestion terminaux |

### Catégorie : Audit

| Code | Nom | Description |
|------|-----|-------------|
| `audit.view_all` | Voir tous les logs d'audit | Accès complet |
| `audit.view_own` | Voir ses propres logs | Logs personnels |

---

## Rôles par défaut

### SUPER_ADMIN (Système)

**Description :** Accès complet à la plateforme, gestion des tenants.

**Permissions :**
- Toutes les permissions de gestion utilisateurs/rôles
- Gestion des paramètres tenant
- Accès audit complet
- **Note :** N'a PAS accès aux données internes des tenants par défaut (sauf si prévu)

### ADMIN_RH (Par tenant)

**Description :** Gestion complète des ressources humaines du tenant.

**Permissions :**
- Toutes les permissions employees
- Toutes les permissions attendance
- Toutes les permissions schedules/shifts
- Toutes les permissions leaves/overtime
- Toutes les permissions reports
- Gestion utilisateurs/rôles dans le tenant
- Gestion paramètres tenant
- Accès audit

### MANAGER (Par tenant)

**Description :** Gestion d'équipe, validation des demandes.

**Permissions :**
- `employee.view_team`
- `attendance.view_team`, `attendance.view_anomalies`, `attendance.correct`
- `schedule.view_team`, `schedule.manage_team`, `schedule.approve_replacement`
- `leave.view_team`, `leave.approve`, `leave.reject`
- `overtime.view_all`, `overtime.approve`
- Rapports (attendance, leaves, overtime, export)

### EMPLOYEE (Par tenant)

**Description :** Accès limité aux données personnelles.

**Permissions :**
- `employee.view_own`
- `attendance.view_own`, `attendance.create`
- `schedule.view_own`
- `leave.view_own`, `leave.create`, `leave.update`
- `overtime.view_own`
- `reports.view_attendance` (limité à ses propres données)

---

## Utilisation

### 1. Initialisation

Exécuter le script d'initialisation :

```bash
cd backend
npx ts-node scripts/init-rbac.ts
```

Ce script :
- Crée toutes les permissions par défaut
- Crée le rôle SUPER_ADMIN (système)
- Crée les rôles ADMIN_RH, MANAGER, EMPLOYEE pour chaque tenant existant
- Assigne les permissions aux rôles

### 2. Créer un utilisateur avec rôles

```typescript
// 1. Créer l'utilisateur (sans tenantId)
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: hashedPassword,
    firstName: 'John',
    lastName: 'Doe',
  },
});

// 2. Assigner des rôles dans un tenant
await userTenantRolesService.assignRoles(
  user.id,
  tenantId,
  [adminRhRoleId, managerRoleId],
  currentUserId, // Qui assigne
);
```

### 3. Protéger un endpoint avec permissions

```typescript
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('api/v1/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  @Get()
  @RequirePermissions('employee.view_all')
  findAll() {
    // Seuls les utilisateurs avec la permission peuvent accéder
  }

  @Post()
  @RequirePermissions('employee.create')
  create(@Body() dto: CreateEmployeeDto) {
    // ...
  }
}
```

### 4. Vérifier une permission dans un service

```typescript
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class MyService {
  constructor(private permissionsService: PermissionsService) {}

  async someMethod(userId: string, tenantId: string) {
    const hasPermission = await this.permissionsService.userHasPermission(
      userId,
      tenantId,
      'employee.view_all',
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
    // ...
  }
}
```

### 5. Créer un rôle personnalisé

```typescript
// Créer le rôle
const role = await rolesService.create(tenantId, {
  name: 'Superviseur',
  code: 'SUPERVISOR',
  description: 'Superviseur avec accès limité',
  permissionCodes: [
    'employee.view_team',
    'attendance.view_team',
    'schedule.view_team',
  ],
});

// Assigner à un utilisateur
await userTenantRolesService.assignRoles(
  userId,
  tenantId,
  [role.id],
  currentUserId,
);
```

---

## Migration depuis l'ancien système

### Étape 1 : Migration des données

Le schéma Prisma a été modifié pour rendre `User.tenantId` et `User.role` optionnels. Les données existantes restent compatibles.

### Étape 2 : Migration des utilisateurs

Pour chaque utilisateur existant :

```typescript
// Récupérer l'utilisateur avec son tenantId et role legacy
const users = await prisma.user.findMany({
  where: { tenantId: { not: null } },
});

for (const user of users) {
  // Trouver le rôle correspondant
  const role = await prisma.role.findFirst({
    where: {
      tenantId: user.tenantId,
      code: user.role, // ADMIN_RH, MANAGER, EMPLOYEE
    },
  });

  if (role) {
    // Créer le UserTenantRole
    await prisma.userTenantRole.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        roleId: role.id,
        isActive: true,
      },
    });
  }
}
```

### Étape 3 : Mise à jour du code

- Remplacer `@Roles(Role.ADMIN_RH)` par `@RequirePermissions('employee.view_all')`
- Utiliser `PermissionsGuard` au lieu de `RolesGuard` uniquement
- Mettre à jour les services pour utiliser `PermissionsService`

---

## Sécurité

### Principes appliqués

1. **Principe du moindre privilège**
   - Par défaut, tout nouvel utilisateur est EMPLOYEE
   - Les permissions sont granulaires

2. **Isolation stricte entre tenants**
   - Un utilisateur ne peut accéder qu'aux données du tenant où il a un rôle actif
   - Les requêtes sont toujours filtrées par tenantId

3. **Audit complet**
   - Tous les changements de rôles sont tracés dans `AuditLog`
   - Actions tracées : `ROLE_ASSIGNED`, `ROLE_REMOVED`

4. **Soft delete**
   - Les UserTenantRole sont désactivés (isActive = false) plutôt que supprimés
   - Historique conservé

### Vérifications de sécurité

- Un utilisateur ne peut pas s'assigner lui-même des rôles (vérifier dans le service)
- Un utilisateur ne peut pas retirer tous ses rôles (vérifier qu'il reste au moins un rôle)
- Les rôles système ne peuvent pas être modifiés/supprimés
- Les permissions sont vérifiées à chaque requête

---

## Structure UI (React/Next.js)

### 1. Gestion des utilisateurs & rôles

**Page :** `/admin/users`

**Composants :**
- `UserList.tsx` - Liste des utilisateurs avec leurs rôles
- `UserRolesModal.tsx` - Modal pour assigner/retirer des rôles
- `RoleSelector.tsx` - Sélecteur de rôles avec permissions affichées

**Fonctionnalités :**
- Voir tous les utilisateurs du tenant
- Filtrer par rôle
- Assigner/retirer des rôles
- Voir les permissions d'un utilisateur

### 2. Écran de revue des accès

**Page :** `/admin/users/:id/access`

**Composants :**
- `UserAccessReview.tsx` - Vue d'ensemble des accès
- `TenantRolesList.tsx` - Liste des rôles par tenant
- `PermissionsList.tsx` - Liste des permissions dérivées

**Fonctionnalités :**
- Voir tous les tenants où l'utilisateur a des rôles
- Voir les rôles dans chaque tenant
- Voir les permissions dérivées
- Historique des changements

### 3. Audit des changements de droits

**Page :** `/admin/audit/roles`

**Composants :**
- `RoleChangesAudit.tsx` - Liste des changements
- `AuditFilter.tsx` - Filtres (utilisateur, date, action)

**Fonctionnalités :**
- Filtrer par utilisateur, date, action
- Voir qui a assigné/retiré quel rôle
- Export CSV/PDF

---

## Exemples d'utilisation

### Exemple 1 : Endpoint protégé

```typescript
@Controller('api/v1/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  @Get()
  @RequirePermissions('employee.view_all')
  async findAll(@CurrentTenant() tenantId: string) {
    // Seuls les utilisateurs avec employee.view_all peuvent accéder
    return this.employeesService.findAll(tenantId);
  }

  @Get('me')
  @RequirePermissions('employee.view_own')
  async findMe(@CurrentUser() user: any) {
    // Accès à ses propres données
    return this.employeesService.findOne(user.userId);
  }
}
```

### Exemple 2 : Vérification conditionnelle

```typescript
@Injectable()
export class EmployeesService {
  constructor(private permissionsService: PermissionsService) {}

  async findOne(userId: string, employeeId: string, tenantId: string) {
    // Si l'utilisateur demande ses propres données, autoriser
    if (userId === employeeId) {
      return this.prisma.employee.findUnique({ where: { id: employeeId } });
    }

    // Sinon, vérifier la permission
    const canViewAll = await this.permissionsService.userHasPermission(
      userId,
      tenantId,
      'employee.view_all',
    );

    if (!canViewAll) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.employee.findUnique({ where: { id: employeeId } });
  }
}
```

### Exemple 3 : Création d'utilisateur avec rôles

```typescript
@Post('users')
@RequirePermissions('user.create')
async createUser(
  @CurrentTenant() tenantId: string,
  @CurrentUser() currentUser: any,
  @Body() dto: CreateUserDto,
) {
  // 1. Créer l'utilisateur
  const user = await this.usersService.create(dto);

  // 2. Assigner les rôles par défaut (EMPLOYEE)
  const employeeRole = await this.rolesService.findByCode(tenantId, 'EMPLOYEE');
  
  await this.userTenantRolesService.assignRoles(
    user.id,
    tenantId,
    [employeeRole.id],
    currentUser.userId,
  );

  return user;
}
```

---

## Conclusion

Le système RBAC multi-tenant est maintenant opérationnel et prêt à être utilisé. Il offre :

- ✅ Flexibilité : un utilisateur peut avoir différents rôles dans différents tenants
- ✅ Granularité : permissions atomiques pour un contrôle fin
- ✅ Évolutivité : possibilité de créer des rôles personnalisés
- ✅ Sécurité : isolation stricte entre tenants, audit complet
- ✅ Compatibilité : l'ancien système reste fonctionnel pendant la transition

Pour toute question ou problème, consulter les logs d'audit ou contacter l'équipe de développement.

