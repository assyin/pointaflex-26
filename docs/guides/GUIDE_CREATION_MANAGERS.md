# 📘 Guide Complet : Création des Managers selon la Hiérarchie

**Date:** 2025-01-XX  
**Objectif:** Créer les managers (Directeur de Département et Managers Régionaux) en respectant la structure hiérarchique

---

## 🎯 Structure Hiérarchique à Créer

### Description de la Hiérarchie

```
Département: "Transport de fonds (CIT)"
│
├── Directeur de Département (Manager Direction)
│   └── Gère TOUS les sites du département CIT
│       ├── Site Casablanca
│       ├── Site Rabat
│       ├── Site Marrakech
│       └── Site Fès
│
└── Managers Régionaux (par Site et par Département)
    ├── Manager Régional CIT - Site Casablanca
    │   └── Gère UNIQUEMENT les employés du département CIT dans le Site Casablanca
    ├── Manager Régional CIT - Site Rabat
    │   └── Gère UNIQUEMENT les employés du département CIT dans le Site Rabat
    └── Manager Régional CIT - Site Marrakech
        └── Gère UNIQUEMENT les employés du département CIT dans le Site Marrakech
```

### Règles Importantes

1. **Directeur de Département** :
   - Voit **TOUS** les employés du département dans **TOUS** les sites
   - Gère toutes les données (pointages, congés, heures sup, etc.) de tous les employés du département
   - Ne peut **pas** voir les employés d'autres départements

2. **Manager Régional** :
   - Voit **UNIQUEMENT** les employés de son département dans son site spécifique
   - Ne peut **pas** voir les employés d'autres sites (même département)
   - Ne peut **pas** voir les employés d'autres départements dans son site
   - Un site peut avoir **plusieurs managers régionaux** (un par département présent dans le site)

3. **Contraintes** :
   - Un site peut avoir plusieurs employés de différents départements
   - Un département peut être présent dans plusieurs sites
   - Un site peut avoir plusieurs Managers Régionaux (un par département)
   - Un Manager Régional ne peut gérer qu'un seul département (mais peut gérer plusieurs sites du même département)

---

## 🔍 Analyse du Système Existant

### ✅ Ce qui est Implémenté

#### 1. **Structure de Données (Prisma Schema)**

Le système supporte parfaitement la hiérarchie avec :

- **`Department.managerId`** : ID du Directeur de Département
- **`SiteManager`** : Table de liaison pour les Managers Régionaux
  - `siteId` : Site géré
  - `managerId` : Manager régional
  - `departmentId` : Département géré dans ce site
  - Contrainte unique : `@@unique([siteId, departmentId])` (un seul manager par département par site)

#### 2. **Détection Automatique du Niveau Hiérarchique**

Le système détecte automatiquement le niveau d'un manager via `getManagerLevel()` :
- **Priorité 1** : Manager de Département (si `department.managerId === employee.id`)
- **Priorité 2** : Manager Régional (si existe dans `SiteManager`)
- **Priorité 3** : Manager d'Équipe (si `team.managerId === employee.id`)

#### 3. **Filtrage Automatique des Données**

Le système filtre automatiquement les données selon le niveau du manager :
- **Manager Direction** : Voit tous les employés du département (tous sites)
- **Manager Régional** : Voit uniquement les employés de son département dans son site

#### 4. **Validation des Contraintes**

Le système valide automatiquement :
- Un manager régional ne peut gérer qu'un seul département
- Le manager doit appartenir au département qu'il gère

---

## 🖥️ Interfaces Disponibles pour Créer les Managers

### 1. **Interface Frontend : Structure RH** (`/structure-rh`)

**URL:** `http://localhost:3001/structure-rh`

**Onglets disponibles :**
- **Départements** : Pour créer/modifier les départements et assigner le Directeur de Département
- **Fonctions** : Pour gérer les positions
- **Statistiques** : Pour voir les statistiques

**Fonctionnalités :**
- ✅ Créer un département
- ✅ Modifier un département
- ✅ Assigner un manager de direction à un département (via `managerId`)

**Limitation actuelle :**
- ⚠️ L'interface ne permet pas encore de créer directement les `SiteManager` (managers régionaux)

### 2. **Interface Frontend : Paramètres** (`/settings`)

**URL:** `http://localhost:3001/settings`

**Section Sites :**
- ✅ Créer un site
- ✅ Modifier un site
- ⚠️ Permet d'assigner un `managerId` et `departmentId` au site (ancien système)

**Limitation actuelle :**
- ⚠️ Utilise l'ancien système (`Site.managerId`) au lieu du nouveau (`SiteManager`)

### 3. **Interface Backend : API REST**

**Base URL:** `http://localhost:3000/api/v1`

**Endpoints disponibles :**

#### Départements
- `POST /departments` : Créer un département
- `PATCH /departments/:id` : Modifier un département (inclut `managerId`)

#### Sites
- `POST /sites` : Créer un site
- `PATCH /sites/:id` : Modifier un site

#### SiteManager (à vérifier)
- ⚠️ Il n'existe pas encore d'endpoint dédié pour créer des `SiteManager` directement

### 4. **Générateur de Données** (`/admin/data-generator-all`)

**URL:** `http://localhost:3001/admin/data-generator-all`

**Fonctionnalités :**
- ✅ Génère automatiquement la structure complète (départements, sites, employés)
- ✅ Assigne automatiquement les managers de direction aux départements
- ✅ Crée automatiquement les `SiteManager` pour chaque département présent dans chaque site

**Avantage :**
- ✅ Crée la structure complète en une seule opération
- ✅ Respecte toutes les contraintes automatiquement

---

## 📝 Étapes Pas à Pas pour Créer la Structure

### **Méthode 1 : Utilisation du Générateur de Données (Recommandé)**

Cette méthode est la plus simple et garantit que toutes les contraintes sont respectées.

#### Étape 1 : Accéder au Générateur

1. Connectez-vous en tant qu'administrateur
2. Accédez à : `http://localhost:3001/admin/data-generator-all`

#### Étape 2 : Configurer la Structure

Dans la section **Structure**, configurez :

```json
{
  "structure": {
    "departments": [
      {
        "name": "Transport de fonds",
        "code": "CIT",
        "description": "Département Transport de fonds"
      }
    ],
    "sites": [
      {
        "name": "Casablanca",
        "code": "CAS",
        "city": "Casablanca"
      },
      {
        "name": "Rabat",
        "code": "RBT",
        "city": "Rabat"
      },
      {
        "name": "Marrakech",
        "code": "MRK",
        "city": "Marrakech"
      }
    ],
    "assignManagers": true,
    "managerDistribution": {
      "departmentManagers": 1,
      "siteManagers": 3,
      "teamManagers": 0
    }
  }
}
```

#### Étape 3 : Configurer les Employés

Dans la section **Employees**, configurez :

```json
{
  "employees": {
    "count": 20,
    "assignToStructures": true,
    "linkToUsers": true
  }
}
```

#### Étape 4 : Lancer la Génération

1. Cliquez sur **Générer**
2. Attendez la fin de la génération
3. Le système créera automatiquement :
   - ✅ 1 Directeur de Département pour "Transport de fonds"
   - ✅ 3 Managers Régionaux (un pour chaque site)
   - ✅ Les entrées `SiteManager` correspondantes

---

### **Méthode 2 : Création Manuelle via l'Interface**

Cette méthode vous donne plus de contrôle mais nécessite plusieurs étapes.

#### Étape 1 : Créer le Département

1. Accédez à : `http://localhost:3001/structure-rh`
2. Cliquez sur l'onglet **Départements**
3. Cliquez sur **Nouveau département**
4. Remplissez le formulaire :
   - **Nom** : `Transport de fonds`
   - **Code** : `CIT`
   - **Description** : `Département Transport de fonds`
5. Cliquez sur **Créer**
6. **Notez l'ID du département créé** (vous en aurez besoin plus tard)

#### Étape 2 : Créer les Sites

1. Accédez à : `http://localhost:3001/settings`
2. Dans la section **Sites**, cliquez sur **Nouveau site**
3. Créez chaque site :
   - **Site Casablanca** :
     - Code : `CAS`
     - Nom : `Casablanca`
     - Ville : `Casablanca`
     - **Département** : Sélectionnez "Transport de fonds (CIT)"
   - **Site Rabat** :
     - Code : `RBT`
     - Nom : `Rabat`
     - Ville : `Rabat`
     - **Département** : Sélectionnez "Transport de fonds (CIT)"
   - **Site Marrakech** :
     - Code : `MRK`
     - Nom : `Marrakech`
     - Ville : `Marrakech`
     - **Département** : Sélectionnez "Transport de fonds (CIT)"
4. **Notez les IDs des sites créés**

#### Étape 3 : Créer les Employés (Managers)

1. Accédez à : `http://localhost:3001/employees`
2. Créez les employés qui seront managers :

   **Directeur de Département :**
   - Nom : `Ahmed BENNANI`
   - Matricule : `DIR-CIT-001`
   - Département : `Transport de fonds (CIT)`
   - Site : `Casablanca` (ou n'importe quel site)
   - **Notez l'ID de cet employé**

   **Manager Régional - Casablanca :**
   - Nom : `Fatima ALAMI`
   - Matricule : `MGR-CAS-CIT-001`
   - Département : `Transport de fonds (CIT)`
   - Site : `Casablanca`
   - **Notez l'ID de cet employé**

   **Manager Régional - Rabat :**
   - Nom : `Hassan IDRISSI`
   - Matricule : `MGR-RBT-CIT-001`
   - Département : `Transport de fonds (CIT)`
   - Site : `Rabat`
   - **Notez l'ID de cet employé**

   **Manager Régional - Marrakech :**
   - Nom : `Said EL FASSI`
   - Matricule : `MGR-MRK-CIT-001`
   - Département : `Transport de fonds (CIT)`
   - Site : `Marrakech`
   - **Notez l'ID de cet employé**

#### Étape 4 : Assigner le Directeur de Département

1. Retournez à : `http://localhost:3001/structure-rh`
2. Cliquez sur l'onglet **Départements**
3. Trouvez le département "Transport de fonds"
4. Cliquez sur **Modifier** (icône crayon)
5. Dans le champ **Manager** (si disponible), sélectionnez `Ahmed BENNANI`
6. Cliquez sur **Enregistrer**

**Alternative via API :**

Si l'interface ne permet pas d'assigner le manager, utilisez l'API :

```bash
PATCH http://localhost:3000/api/v1/departments/{departmentId}
Content-Type: application/json

{
  "managerId": "{id-du-directeur}"
}
```

#### Étape 5 : Créer les SiteManagers (Managers Régionaux)

⚠️ **IMPORTANT** : L'interface frontend ne permet pas encore de créer directement les `SiteManager`. Vous devez utiliser l'API ou la base de données.

**Option A : Via l'API (si l'endpoint existe)**

```bash
POST http://localhost:3000/api/v1/site-managers
Content-Type: application/json

{
  "siteId": "{id-site-casablanca}",
  "managerId": "{id-manager-casablanca}",
  "departmentId": "{id-departement-cit}"
}
```

Répétez pour chaque site.

**Option B : Via la Base de Données (SQL)**

Connectez-vous à votre base de données et exécutez :

```sql
-- Manager Régional pour Casablanca
INSERT INTO "SiteManager" (id, "createdAt", "updatedAt", "tenantId", "siteId", "managerId", "departmentId")
VALUES (
  gen_random_uuid(),
  NOW(),
  NOW(),
  '{votre-tenant-id}',
  '{id-site-casablanca}',
  '{id-manager-casablanca}',
  '{id-departement-cit}'
);

-- Manager Régional pour Rabat
INSERT INTO "SiteManager" (id, "createdAt", "updatedAt", "tenantId", "siteId", "managerId", "departmentId")
VALUES (
  gen_random_uuid(),
  NOW(),
  NOW(),
  '{votre-tenant-id}',
  '{id-site-rabat}',
  '{id-manager-rabat}',
  '{id-departement-cit}'
);

-- Manager Régional pour Marrakech
INSERT INTO "SiteManager" (id, "createdAt", "updatedAt", "tenantId", "siteId", "managerId", "departmentId")
VALUES (
  gen_random_uuid(),
  NOW(),
  NOW(),
  '{votre-tenant-id}',
  '{id-site-marrakech}',
  '{id-manager-marrakech}',
  '{id-departement-cit}'
);
```

**Option C : Via le Backend (Script Node.js)**

Créez un script temporaire `create-site-managers.js` :

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSiteManagers() {
  // Récupérer les IDs (remplacez par vos vrais IDs)
  const tenantId = 'votre-tenant-id';
  const departmentId = 'id-departement-cit';
  const siteCasablancaId = 'id-site-casablanca';
  const siteRabatId = 'id-site-rabat';
  const siteMarrakechId = 'id-site-marrakech';
  const managerCasablancaId = 'id-manager-casablanca';
  const managerRabatId = 'id-manager-rabat';
  const managerMarrakechId = 'id-manager-marrakech';

  // Créer les SiteManagers
  await prisma.siteManager.createMany({
    data: [
      {
        tenantId,
        siteId: siteCasablancaId,
        managerId: managerCasablancaId,
        departmentId,
      },
      {
        tenantId,
        siteId: siteRabatId,
        managerId: managerRabatId,
        departmentId,
      },
      {
        tenantId,
        siteId: siteMarrakechId,
        managerId: managerMarrakechId,
        departmentId,
      },
    ],
  });

  console.log('✅ SiteManagers créés avec succès');
}

createSiteManagers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Exécutez le script :

```bash
cd backend
node create-site-managers.js
```

---

### **Méthode 3 : Création via API REST (Programmatique)**

Si vous préférez utiliser directement l'API, voici les requêtes complètes :

#### Étape 1 : Créer le Département

```bash
POST http://localhost:3000/api/v1/departments
Content-Type: application/json
Authorization: Bearer {votre-token}

{
  "name": "Transport de fonds",
  "code": "CIT",
  "description": "Département Transport de fonds"
}
```

**Réponse :** Notez l'`id` du département créé.

#### Étape 2 : Créer les Sites

```bash
POST http://localhost:3000/api/v1/sites
Content-Type: application/json
Authorization: Bearer {votre-token}

{
  "name": "Casablanca",
  "code": "CAS",
  "city": "Casablanca",
  "departmentId": "{id-departement-cit}"
}
```

Répétez pour chaque site (Rabat, Marrakech, etc.).

#### Étape 3 : Créer les Employés (Managers)

```bash
POST http://localhost:3000/api/v1/employees
Content-Type: application/json
Authorization: Bearer {votre-token}

{
  "matricule": "DIR-CIT-001",
  "firstName": "Ahmed",
  "lastName": "BENNANI",
  "email": "ahmed.bennani@example.com",
  "departmentId": "{id-departement-cit}",
  "siteId": "{id-site-casablanca}",
  "hireDate": "2024-01-01"
}
```

Répétez pour chaque manager.

#### Étape 4 : Assigner le Directeur de Département

```bash
PATCH http://localhost:3000/api/v1/departments/{id-departement-cit}
Content-Type: application/json
Authorization: Bearer {votre-token}

{
  "managerId": "{id-directeur}"
}
```

#### Étape 5 : Créer les SiteManagers

⚠️ **Note** : Il n'existe pas encore d'endpoint dédié. Utilisez l'une des options de l'Étape 5 de la Méthode 2.

---

## ✅ Vérification de la Structure Créée

### Vérification 1 : Directeur de Département

1. Connectez-vous en tant que Directeur de Département
2. Accédez à la liste des employés : `http://localhost:3001/employees`
3. **Vérifiez** :
   - ✅ Vous voyez tous les employés du département "Transport de fonds"
   - ✅ Vous voyez les employés de tous les sites (Casablanca, Rabat, Marrakech)
   - ❌ Vous ne voyez pas les employés d'autres départements

### Vérification 2 : Manager Régional

1. Connectez-vous en tant que Manager Régional (ex: Casablanca)
2. Accédez à la liste des employés : `http://localhost:3001/employees`
3. **Vérifiez** :
   - ✅ Vous voyez uniquement les employés du département "Transport de fonds"
   - ✅ Vous voyez uniquement les employés du site "Casablanca"
   - ❌ Vous ne voyez pas les employés d'autres sites (Rabat, Marrakech)
   - ❌ Vous ne voyez pas les employés d'autres départements dans Casablanca

### Vérification 3 : Base de Données

Connectez-vous à la base de données et exécutez :

```sql
-- Vérifier les départements avec leurs managers
SELECT 
  d.name as department_name,
  d.code as department_code,
  e."firstName" || ' ' || e."lastName" as director_name
FROM "Department" d
LEFT JOIN "Employee" e ON e.id = d."managerId"
WHERE d."tenantId" = '{votre-tenant-id}';

-- Vérifier les SiteManagers
SELECT 
  s.name as site_name,
  d.name as department_name,
  e."firstName" || ' ' || e."lastName" as manager_name
FROM "SiteManager" sm
JOIN "Site" s ON s.id = sm."siteId"
JOIN "Department" d ON d.id = sm."departmentId"
JOIN "Employee" e ON e.id = sm."managerId"
WHERE sm."tenantId" = '{votre-tenant-id}';
```

---

## 🚨 Problèmes Courants et Solutions

### Problème 1 : "Le manager doit appartenir au département du site"

**Cause** : Vous essayez d'assigner un manager qui n'appartient pas au même département que le site.

**Solution** : Assurez-vous que l'employé (manager) a le même `departmentId` que le site.

### Problème 2 : "Ce manager gère déjà un site dans un autre département"

**Cause** : Un manager régional ne peut gérer qu'un seul département.

**Solution** : Créez un employé différent pour chaque département, ou réassignez le manager existant.

### Problème 3 : "Un seul manager par département par site"

**Cause** : Vous essayez de créer un deuxième `SiteManager` pour le même site et département.

**Solution** : Supprimez l'ancien `SiteManager` avant d'en créer un nouveau, ou modifiez l'existant.

### Problème 4 : Le manager ne voit pas les employés attendus

**Cause** : Les employés n'ont pas le bon `departmentId` ou `siteId`.

**Solution** : Vérifiez que les employés ont :
- Le même `departmentId` que le manager
- Le même `siteId` que le manager (pour les managers régionaux)

---

## 📊 Résumé des Interfaces

| Interface | URL | Fonctionnalité | Limitation |
|-----------|-----|----------------|------------|
| **Structure RH** | `/structure-rh` | Créer/modifier départements, assigner directeur | ⚠️ Pas de création SiteManager |
| **Paramètres** | `/settings` | Créer/modifier sites | ⚠️ Utilise ancien système |
| **Employés** | `/employees` | Créer/modifier employés | ✅ Fonctionne |
| **Générateur** | `/admin/data-generator-all` | Génération automatique complète | ✅ Recommandé |
| **API REST** | `/api/v1/*` | Toutes les opérations | ⚠️ Pas d'endpoint SiteManager dédié |

---

## 🎯 Recommandations

1. **Pour une création rapide** : Utilisez le **Générateur de Données** (Méthode 1)
2. **Pour un contrôle total** : Utilisez la **Création Manuelle** (Méthode 2)
3. **Pour l'intégration** : Utilisez l'**API REST** (Méthode 3)

---

## 📝 Notes Finales

- Le système `SiteManager` est le nouveau système recommandé
- L'ancien système (`Site.managerId`) est conservé pour rétrocompatibilité mais est marqué comme DEPRECATED
- Un site peut avoir plusieurs managers régionaux (un par département)
- Un manager régional ne peut gérer qu'un seul département (mais peut gérer plusieurs sites du même département)
- Le système filtre automatiquement les données selon le niveau du manager

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX  
**Statut** : ✅ Guide complet et à jour
