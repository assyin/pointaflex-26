# Identifiants de Connexion Vérifiés

**Date de vérification:** 2025-12-12
**Statut:** ✅ Tous les comptes fonctionnent correctement

---

## 🔐 Comptes de Démo Vérifiés

Tous les comptes ci-dessous ont été testés et fonctionnent parfaitement.

### 1. Compte ADMIN_RH (Admin Demo)

```
📧 Email:      admin@demo.com
🔑 Mot de passe: Admin@123
👤 Rôle:       ADMIN_RH
🏢 Tenant:     01651f40-c16b-4833-8543-5fd3276711e8
```

**Permissions RBAC:**
- Rôles: EMPLOYEE, MANAGER, ADMIN_RH
- 69 permissions

**Statut:** ✅ Connexion réussie

---

### 2. Compte ADMIN_RH (Fatima zahra RH)

```
📧 Email:      rh@demo.com
🔑 Mot de passe: Test123!
👤 Rôle:       ADMIN_RH
🏢 Tenant:     01651f40-c16b-4833-8543-5fd3276711e8
```

**Permissions RBAC:**
- Rôles: ADMIN_RH
- 68 permissions

**Statut:** ✅ Connexion réussie

---

### 3. Compte EMPLOYEE (Mohamed Employee)

```
📧 Email:      employee@demo.com
🔑 Mot de passe: Test123!
👤 Rôle:       EMPLOYEE
🏢 Tenant:     01651f40-c16b-4833-8543-5fd3276711e8
```

**Permissions RBAC:**
- Rôles: EMPLOYEE
- 9 permissions
  - employee.view_own
  - attendance.view_own
  - attendance.create
  - schedule.view_own
  - leave.view_own
  - leave.create
  - leave.update
  - overtime.view_own
  - reports.view_attendance

**Statut:** ✅ Connexion réussie (mot de passe réinitialisé)

---

### 4. Compte MANAGER (Sara Manager)

```
📧 Email:      manager@demo.com
🔑 Mot de passe: Test123!
👤 Rôle:       MANAGER
🏢 Tenant:     01651f40-c16b-4833-8543-5fd3276711e8
```

**Permissions RBAC:**
- Rôles: MANAGER
- 23 permissions

**Statut:** ✅ Connexion réussie

---

## 🌐 Endpoints de Connexion

### Backend API
- **URL:** `http://localhost:3000`
- **Endpoint Login:** `http://localhost:3000/api/v1/auth/login`
- **Documentation Swagger:** `http://localhost:3000/api/docs`

### Frontend
- **URL:** `http://localhost:3001`
- **Page Login:** `http://localhost:3001/login`

---

## 📝 Comment se Connecter

### Option 1: Via l'interface Frontend (Recommandé)

1. Ouvrez votre navigateur
2. Allez sur: `http://localhost:3001/login`
3. Entrez l'email et le mot de passe
4. Cliquez sur "Se connecter"

### Option 2: Via l'API directement (curl)

```bash
curl -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"employee@demo.com","password":"Test123!"}'
```

**Réponse attendue:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "employee@demo.com",
    "firstName": "Mohamed",
    "lastName": "Employee",
    "role": "EMPLOYEE",
    "tenantId": "...",
    "roles": ["EMPLOYEE"],
    "permissions": [...]
  }
}
```

### Option 3: Via Postman/Insomnia

1. Créer une requête POST
2. URL: `http://localhost:3000/api/v1/auth/login`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "email": "employee@demo.com",
  "password": "Test123!"
}
```

---

## 🔧 Tests Effectués

### ✅ Vérification Base de Données
```sql
SELECT id, email, role, "isActive"
FROM "User"
WHERE email IN ('admin@demo.com', 'rh@demo.com', 'employee@demo.com', 'manager@demo.com');
```
**Résultat:** 4 utilisateurs actifs trouvés

### ✅ Test des Mots de Passe (Bcrypt)
```bash
npx ts-node scripts/reset-demo-passwords.ts
```
**Résultat:**
- admin@demo.com: ✓ Correct
- rh@demo.com: ✓ Correct
- employee@demo.com: ✅ Réinitialisé
- manager@demo.com: ✓ Correct

### ✅ Test de Connexion Simulée (Backend)
```bash
npx ts-node scripts/test-demo-login.ts
```
**Résultat:** Tous les comptes se connectent avec succès

### ✅ Test de Connexion HTTP (API)
```bash
curl -X POST 'http://localhost:3000/api/v1/auth/login' ...
```
**Résultat:** Tous les comptes retournent un token JWT valide

---

## 🎯 Dashboards par Profil

Après connexion, chaque profil accède à son dashboard spécifique:

### EMPLOYEE → Dashboard Personnel
- **Scope:** `personal`
- **URL:** `http://localhost:3001/dashboard`
- **Données:** Uniquement ses propres données
- **Composant:** `EmployeeDashboard`

### MANAGER → Dashboard Équipe
- **Scope:** `team`
- **URL:** `http://localhost:3001/dashboard`
- **Données:** Données de son équipe + ses données personnelles
- **API:** `GET /api/v1/reports/dashboard?scope=team`

### ADMIN_RH → Dashboard Tenant
- **Scope:** `tenant`
- **URL:** `http://localhost:3001/dashboard`
- **Données:** Données de tout le tenant + équipes + personnelles
- **API:** `GET /api/v1/reports/dashboard?scope=tenant`

### SUPER_ADMIN → Dashboard Plateforme
- **Scope:** `platform`
- **URL:** `http://localhost:3001/dashboard`
- **Données:** Données de tous les tenants + tenant + équipes + personnelles
- **API:** `GET /api/v1/reports/dashboard?scope=platform`

---

## 🛡️ Sécurité

### Validation des Scopes
Le backend valide maintenant strictement l'accès aux scopes:

```typescript
PERSONAL → Tous les utilisateurs ✅
TEAM → MANAGER, ADMIN_RH, SUPER_ADMIN uniquement
TENANT → ADMIN_RH, SUPER_ADMIN uniquement
PLATFORM → SUPER_ADMIN uniquement
```

### Tentative d'Accès Non Autorisé
Si un EMPLOYEE essaie d'accéder au scope `tenant`:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions for tenant dashboard"
}
```

---

## 📊 Matrice des Permissions

| Profil       | Dashboard Personnel | Dashboard Équipe | Dashboard Tenant | Dashboard Plateforme |
|--------------|---------------------|------------------|------------------|----------------------|
| EMPLOYEE     | ✅                  | ❌               | ❌               | ❌                   |
| MANAGER      | ✅                  | ✅               | ❌               | ❌                   |
| ADMIN_RH     | ✅                  | ✅               | ✅               | ❌                   |
| SUPER_ADMIN  | ✅                  | ✅               | ✅               | ✅                   |

---

## 🚨 Dépannage

### Problème: "Cannot connect to server"

**Solution:**
```bash
# Vérifier que le backend est démarré
ps aux | grep nest

# Si non démarré, lancer le backend
cd /home/assyin/PointaFlex/backend
npm run start:dev
```

### Problème: "Invalid credentials"

**Solution:**
```bash
# Réinitialiser les mots de passe
cd /home/assyin/PointaFlex/backend
npx ts-node scripts/reset-demo-passwords.ts
```

### Problème: "Forbidden 403"

**Vérification:**
1. Vérifiez que l'utilisateur a des rôles RBAC:
```bash
npx ts-node scripts/assign-missing-rbac-roles.ts
```

2. Vérifiez les permissions du rôle:
```sql
SELECT p.code FROM "Role" r
JOIN "RolePermission" rp ON r.id = rp."roleId"
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE r.code = 'EMPLOYEE';
```

### Problème: Frontend ne se connecte pas au backend

**Vérification:**
1. Vérifiez la configuration CORS dans `backend/src/main.ts`
2. Vérifiez que le frontend utilise la bonne URL API
3. Vérifiez le fichier `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## 📁 Scripts Utiles

### reset-demo-passwords.ts
Réinitialise les mots de passe des comptes de démo.
```bash
cd backend
npx ts-node scripts/reset-demo-passwords.ts
```

### test-demo-login.ts
Teste la connexion pour tous les comptes de démo.
```bash
cd backend
npx ts-node scripts/test-demo-login.ts
```

### assign-missing-rbac-roles.ts
Assigne les rôles RBAC manquants aux utilisateurs.
```bash
cd backend
npx ts-node scripts/assign-missing-rbac-roles.ts
```

---

## ✅ Résumé

**État des Comptes:** ✅ Tous fonctionnels
**État du Backend:** ✅ Démarré sur port 3000
**État du Frontend:** ✅ Démarré sur port 3001
**État de la Sécurité:** ✅ Validation de scope implémentée
**État des Permissions:** ✅ Tous les rôles RBAC assignés

**Vous pouvez maintenant vous connecter avec n'importe lequel des 4 comptes ci-dessus.**

---

**Date de vérification:** 2025-12-12 13:02
**Version Backend:** 1.0.0
**Version Frontend:** 1.0.0
**Base de données:** PostgreSQL (Supabase)
