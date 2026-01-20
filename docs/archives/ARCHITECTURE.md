# Architecture NestJS - PointageFlex

## Vue d'ensemble

Architecture modulaire NestJS suivant les principes Clean Architecture et SOLID.

## Structure des dossiers

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── current-tenant.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── tenant.guard.ts
│   │   ├── interceptors/
│   │   │   ├── tenant.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── middleware/
│   │       └── tenant-resolver.middleware.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── swagger.config.ts
│   ├── database/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── users/
│   │   ├── employees/
│   │   ├── attendance/
│   │   ├── shifts/
│   │   ├── teams/
│   │   ├── schedules/
│   │   ├── leaves/
│   │   ├── overtime/
│   │   ├── reports/
│   │   ├── audit/
│   │   ├── notifications/
│   │   └── webhooks/
│   └── utils/
│       ├── date.utils.ts
│       ├── calculation.utils.ts
│       └── export.utils.ts
├── prisma/
│   └── schema.prisma
├── test/
├── package.json
└── tsconfig.json
```

## Modules Détaillés

### 1. Auth Module

**Responsabilités :**
- Authentification JWT
- Login/Logout
- Refresh tokens
- Password reset
- Email verification

**Structure :**
```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── jwt-refresh.strategy.ts
└── dto/
    ├── login.dto.ts
    ├── register.dto.ts
    ├── refresh-token.dto.ts
    └── reset-password.dto.ts
```

**Endpoints :**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

---

### 2. Tenants Module

**Responsabilités :**
- Gestion des entreprises (tenants)
- Settings entreprise
- Multi-tenant isolation

**Structure :**
```
tenants/
├── tenants.module.ts
├── tenants.controller.ts
├── tenants.service.ts
├── tenant-settings.service.ts
└── dto/
    ├── create-tenant.dto.ts
    ├── update-tenant.dto.ts
    └── tenant-settings.dto.ts
```

**Endpoints :**
- `POST /api/v1/tenants` (Super Admin)
- `GET /api/v1/tenants` (Super Admin)
- `GET /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id`
- `DELETE /api/v1/tenants/:id`
- `GET /api/v1/tenants/:id/settings`
- `PATCH /api/v1/tenants/:id/settings`

---

### 3. Users Module

**Responsabilités :**
- Gestion utilisateurs système
- Rôles et permissions
- Profil utilisateur

**Structure :**
```
users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
└── dto/
    ├── create-user.dto.ts
    ├── update-user.dto.ts
    ├── invite-user.dto.ts
    └── update-profile.dto.ts
```

**Endpoints :**
- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `POST /api/v1/users/invite`

---

### 4. Employees Module

**Responsabilités :**
- Gestion des employés
- Fiches employés
- Affectations (site, département, équipe)
- Données biométriques

**Structure :**
```
employees/
├── employees.module.ts
├── employees.controller.ts
├── employees.service.ts
├── sites.service.ts
├── departments.service.ts
└── dto/
    ├── create-employee.dto.ts
    ├── update-employee.dto.ts
    ├── create-site.dto.ts
    ├── create-department.dto.ts
    └── biometric-data.dto.ts
```

**Endpoints :**
- `POST /api/v1/employees`
- `GET /api/v1/employees`
- `GET /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id`
- `DELETE /api/v1/employees/:id`
- `POST /api/v1/employees/:id/biometric`
- `GET /api/v1/sites`
- `POST /api/v1/sites`
- `GET /api/v1/departments`
- `POST /api/v1/departments`

---

### 5. Attendance Module

**Responsabilités :**
- Enregistrement pointages
- Webhooks terminaux biométriques
- Import CSV/Excel
- Détection anomalies
- Corrections pointages
- Calculs heures travaillées

**Structure :**
```
attendance/
├── attendance.module.ts
├── attendance.controller.ts
├── attendance.service.ts
├── devices.service.ts
├── calculations.service.ts
├── anomaly-detection.service.ts
└── dto/
    ├── create-attendance.dto.ts
    ├── correct-attendance.dto.ts
    ├── import-attendance.dto.ts
    ├── create-device.dto.ts
    └── webhook-attendance.dto.ts
```

**Endpoints :**
- `POST /api/v1/attendance` (manuel)
- `GET /api/v1/attendance`
- `GET /api/v1/attendance/:id`
- `PATCH /api/v1/attendance/:id/correct`
- `POST /api/v1/attendance/import`
- `GET /api/v1/attendance/employee/:employeeId`
- `GET /api/v1/attendance/anomalies`
- `POST /api/v1/webhooks/attendance` (terminaux)
- `GET /api/v1/devices`
- `POST /api/v1/devices`

---

### 6. Shifts Module

**Responsabilités :**
- Gestion shifts (matin/soir/nuit)
- Shifts personnalisés
- Configuration horaires

**Structure :**
```
shifts/
├── shifts.module.ts
├── shifts.controller.ts
├── shifts.service.ts
└── dto/
    ├── create-shift.dto.ts
    └── update-shift.dto.ts
```

**Endpoints :**
- `POST /api/v1/shifts`
- `GET /api/v1/shifts`
- `GET /api/v1/shifts/:id`
- `PATCH /api/v1/shifts/:id`
- `DELETE /api/v1/shifts/:id`

---

### 7. Teams Module

**Responsabilités :**
- Gestion équipes
- Rotations (optionnelles)
- Affectation employés

**Structure :**
```
teams/
├── teams.module.ts
├── teams.controller.ts
├── teams.service.ts
└── dto/
    ├── create-team.dto.ts
    ├── update-team.dto.ts
    └── assign-employees.dto.ts
```

**Endpoints :**
- `POST /api/v1/teams`
- `GET /api/v1/teams`
- `GET /api/v1/teams/:id`
- `PATCH /api/v1/teams/:id`
- `DELETE /api/v1/teams/:id`
- `POST /api/v1/teams/:id/employees`

---

### 8. Schedules Module

**Responsabilités :**
- Planning jour/semaine/mois
- Affectation shifts aux employés
- Remplacements
- Échanges de shifts
- Alertes légales (non bloquantes)

**Structure :**
```
schedules/
├── schedules.module.ts
├── schedules.controller.ts
├── schedules.service.ts
├── replacements.service.ts
├── alerts.service.ts
└── dto/
    ├── create-schedule.dto.ts
    ├── bulk-schedule.dto.ts
    ├── create-replacement.dto.ts
    └── swap-shifts.dto.ts
```

**Endpoints :**
- `POST /api/v1/schedules`
- `GET /api/v1/schedules`
- `GET /api/v1/schedules/employee/:employeeId`
- `POST /api/v1/schedules/bulk`
- `GET /api/v1/schedules/week/:date`
- `GET /api/v1/schedules/month/:date`
- `POST /api/v1/schedules/replacements`
- `PATCH /api/v1/schedules/replacements/:id/approve`
- `GET /api/v1/schedules/alerts`

---

### 9. Leaves Module

**Responsabilités :**
- Gestion congés/absences
- Types de congés
- Workflow approbation (Manager → RH)
- Soldes congés
- Historique

**Structure :**
```
leaves/
├── leaves.module.ts
├── leaves.controller.ts
├── leaves.service.ts
├── leave-types.service.ts
├── leave-balance.service.ts
└── dto/
    ├── create-leave.dto.ts
    ├── approve-leave.dto.ts
    ├── create-leave-type.dto.ts
    └── leave-balance.dto.ts
```

**Endpoints :**
- `POST /api/v1/leaves`
- `GET /api/v1/leaves`
- `GET /api/v1/leaves/:id`
- `PATCH /api/v1/leaves/:id/approve`
- `PATCH /api/v1/leaves/:id/reject`
- `GET /api/v1/leaves/employee/:employeeId`
- `GET /api/v1/leaves/employee/:employeeId/balance`
- `GET /api/v1/leave-types`
- `POST /api/v1/leave-types`

---

### 10. Overtime Module

**Responsabilités :**
- Calcul heures supplémentaires
- Heures de nuit
- Conversion en récupération
- Approbation heures sup

**Structure :**
```
overtime/
├── overtime.module.ts
├── overtime.controller.ts
├── overtime.service.ts
├── recovery.service.ts
└── dto/
    ├── create-overtime.dto.ts
    ├── approve-overtime.dto.ts
    ├── convert-to-recovery.dto.ts
    └── recovery.dto.ts
```

**Endpoints :**
- `GET /api/v1/overtime`
- `GET /api/v1/overtime/employee/:employeeId`
- `PATCH /api/v1/overtime/:id/approve`
- `POST /api/v1/overtime/:id/convert-to-recovery`
- `GET /api/v1/recovery/employee/:employeeId`

---

### 11. Reports Module

**Responsabilités :**
- Rapports présence/absence
- Rapports retards
- Rapports heures sup
- Exports PDF/Excel
- Export paie

**Structure :**
```
reports/
├── reports.module.ts
├── reports.controller.ts
├── reports.service.ts
├── export-pdf.service.ts
├── export-excel.service.ts
└── dto/
    ├── report-filter.dto.ts
    └── export.dto.ts
```

**Endpoints :**
- `GET /api/v1/reports/attendance`
- `GET /api/v1/reports/leaves`
- `GET /api/v1/reports/overtime`
- `GET /api/v1/reports/dashboard`
- `POST /api/v1/reports/export/pdf`
- `POST /api/v1/reports/export/excel`
- `GET /api/v1/reports/payroll`

---

### 12. Audit Module

**Responsabilités :**
- Logs d'audit
- Traçabilité modifications
- Historique actions

**Structure :**
```
audit/
├── audit.module.ts
├── audit.controller.ts
├── audit.service.ts
└── dto/
    ├── create-audit.dto.ts
    └── audit-filter.dto.ts
```

**Endpoints :**
- `GET /api/v1/audit`
- `GET /api/v1/audit/entity/:entity/:entityId`

---

### 13. Notifications Module

**Responsabilités :**
- Notifications temps réel
- Email notifications
- Push notifications mobile
- Alertes système

**Structure :**
```
notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── email.service.ts
└── dto/
    └── notification.dto.ts
```

**Endpoints :**
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`

---

## Guards & Middleware

### TenantResolverMiddleware
Résout le tenant actuel depuis :
- Sous-domaine (tenant.pointageflex.com)
- Header `X-Tenant-ID`
- Token JWT (tenantId)

### JwtAuthGuard
Vérifie l'authentification JWT

### RolesGuard
Vérifie les permissions RBAC

### TenantGuard
Isole les données par tenant

## Interceptors

### TenantInterceptor
Injecte automatiquement le tenantId dans les requêtes Prisma

### LoggingInterceptor
Log toutes les requêtes API

## Filters

### HttpExceptionFilter
Gère les erreurs HTTP de manière uniforme

## Database Service

### PrismaService
- Extension du PrismaClient
- Soft delete support
- Auto-injection tenantId
- Connection pooling

## Configuration

### Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

## Testing Strategy

- Unit tests : Services (Jest)
- Integration tests : Controllers + DB
- E2E tests : API endpoints complets

## Bonnes Pratiques

1. **Séparation des responsabilités** : Un service = une responsabilité
2. **DTOs typés** : Validation avec class-validator
3. **Pagination** : Toutes les listes sont paginées
4. **Soft delete** : Jamais de suppression physique
5. **Audit trail** : Toutes les modifications sont loggées
6. **Error handling** : Exceptions typées et cohérentes
7. **Documentation** : Swagger auto-généré
