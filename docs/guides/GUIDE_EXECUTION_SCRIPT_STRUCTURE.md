# Guide d'Exécution - Script de Création de Structure Complète

## 📋 Description

Ce script crée automatiquement :
- ✅ 11 départements (sans dupliquer ceux existants)
- ✅ Toutes les fonctions/postes pour chaque département
- ✅ 7 employés (rôle EMPLOYEE) par fonction et par site
- ✅ 1 manager de département (rôle MANAGER) par département
- ✅ 1 manager régional (rôle MANAGER) par département et par site
- ✅ Plannings du 10/12/2025 au 25/12/2025
- ✅ Pointages du 11/12/2025 au 20/12/2025 avec tous les cas possibles

## 🚀 Exécution

### Prérequis

1. **Base de données connectée** : Assurez-vous que la base de données est accessible
2. **Tenant "demo" existe** : Le script cherche le tenant avec le slug "demo"
3. **Sites existants** : Au moins un site doit exister pour le tenant
4. **Shifts existants** : Au moins un shift "Matin" doit exister
5. **RBAC initialisé** : Les rôles EMPLOYEE et MANAGER doivent exister

### Commandes

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Exécuter le script
npx ts-node scripts/create-structure-complete.ts
```

### Ou avec npm script (si configuré)

```bash
cd backend
npm run script:create-structure
```

## 📊 Ce qui sera créé

### Départements
- SECURITE
- CIT
- CPT
- GAB
- IT
- TECHNIQUE
- FLEET
- RH
- ACHAT
- FINANCE
- DIRECTION

### Fonctions par Département

**SECURITE (9 fonctions) :**
- INSPECTEUR GAB
- ADJOINT RESPONSABLE SECURITE
- AGENT BACK OFFICE INSPECTION C
- AGENT DE GARDE
- SUPERVISEUR SECURITE
- AGENT DE SECURITE
- INSPECTEUR TF
- Controleur ATM
- TECHNICIEN DE SURFACE

**CPT (7 fonctions) :**
- CHEF D'EQUIPE
- ASSISTANTE CPT
- OPERATRICE DE SAISIE CPT
- RESPONSABLE CHAMBRE FORTE
- OPERATRICE
- ASSISTANT(E) CHEF D'EQUIPE
- OPERATEUR

**CIT (6 fonctions) :**
- AGENT DE RECEPTION
- RESPONSABLE REGIONAL TF
- ASSISTANT TF
- AGENT TRANSPORT DE FONDS
- ASSISTANT GASOIL
- DISPATCH TF

**GAB (3 fonctions) :**
- SUPERVISEUR GAB
- AGENT GAB
- MAGASINIER

**IT (1 fonction) :**
- INFORMATICIEN

**TECHNIQUE (1 fonction) :**
- TECHNICIEN

**FLEET (1 fonction) :**
- TECHNICIEN DE MAINTENANCE

**RH (1 fonction) :**
- Asistant(E) RH

**ACHAT, FINANCE, DIRECTION :** Aucune fonction spécifiée

### Employés créés

Pour chaque fonction :
- **7 employés (EMPLOYEE)** par site
- **1 manager de département (MANAGER)** par département
- **1 manager régional (MANAGER)** par département et par site

**Exemple de calcul :**
- Si vous avez 3 sites
- SECURITE a 9 fonctions
- Total employés SECURITE = (9 fonctions × 7 employés × 3 sites) + 1 manager département + (1 manager régional × 3 sites) = 189 + 1 + 3 = **193 employés**

### Plannings

- **Période :** 10/12/2025 au 25/12/2025
- **Département CPT :** Shifts aléatoires (Matin, Soir, Nuit)
- **Autres départements :** Shift Matin uniquement
- **Exclusions :** Dimanches et jours fériés
- **Taux de présence :** 80% pour les employés, 100% pour les managers

### Pointages

- **Période :** 11/12/2025 au 20/12/2025
- **Basés sur les plannings** créés précédemment
- **Cas possibles :**
  - ✅ Normal (70%)
  - ⏰ Retard (15%)
  - 🏃 Départ anticipé (8%)
  - ⚠️ Retard + Départ anticipé (5%)
  - ❌ Sortie manquante (2%)

## ⚙️ Configuration

Les dates et paramètres peuvent être modifiés dans le script :

```typescript
const TENANT_SLUG = 'demo';
const SCHEDULE_START_DATE = '2025-12-10';
const SCHEDULE_END_DATE = '2025-12-25';
const ATTENDANCE_START_DATE = '2025-12-11';
const ATTENDANCE_END_DATE = '2025-12-20';
```

## 🔍 Vérification

Après l'exécution, vérifiez :

1. **Départements :**
   ```sql
   SELECT name, code FROM "Department" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo');
   ```

2. **Fonctions :**
   ```sql
   SELECT name, category FROM "Position" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo');
   ```

3. **Employés :**
   ```sql
   SELECT COUNT(*) FROM "Employee" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo');
   ```

4. **Plannings :**
   ```sql
   SELECT COUNT(*) FROM "Schedule" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo');
   ```

5. **Pointages :**
   ```sql
   SELECT COUNT(*) FROM "Attendance" WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'demo');
   ```

## ⚠️ Notes Importantes

1. **Pas de duplication :** Le script vérifie l'existence avant de créer
2. **Emails uniques :** Format : `{matricule}@demo.test`
3. **Mot de passe par défaut :** `Test123!` (pour tous les utilisateurs)
4. **Matricules :** Format `{TYPE}-{DEPT}-{FUNC}-{NUM}` (ex: `EMP-SEC-INS-001`)
5. **Jours fériés :** Automatiquement exclus des plannings
6. **Dimanches :** Automatiquement exclus des plannings

## 🐛 Résolution de Problèmes

### Erreur : "Tenant non trouvé"
- Vérifiez que le tenant avec le slug "demo" existe
- Exécutez `init-tenant-and-user.ts` si nécessaire

### Erreur : "Aucun site trouvé"
- Créez au moins un site pour le tenant "demo"

### Erreur : "Shift Matin non trouvé"
- Créez un shift avec le nom contenant "matin" ou le code "M"

### Erreur : "Rôles non trouvés"
- Exécutez `init-rbac.ts` pour initialiser le système RBAC

### Erreurs de contrainte unique
- Le script ignore automatiquement les doublons
- Si vous voulez réexécuter, supprimez d'abord les données existantes

## 📝 Logs

Le script affiche :
- ✅ Progression de chaque étape
- ⏭️ Éléments déjà existants (ignorés)
- ⚠️ Erreurs non critiques
- 📊 Statistiques finales

## 🎯 Résultat Attendu

À la fin de l'exécution, vous devriez voir :
```
🎉 Création terminée avec succès !
```

Et des statistiques comme :
- Nombre de départements créés
- Nombre de fonctions créées
- Nombre total d'employés créés
- Nombre de plannings créés
- Nombre de pointages créés

---

**Bon script ! 🚀**

