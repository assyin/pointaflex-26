# 🗑️ Script de Purge de la Base de Données

Ce script permet de **purger complètement** la base de données pour repartir à zéro lors des tests.

## ⚠️ ATTENTION

**Ce script supprime TOUTES les données de la base de données !**
- ✅ Tous les employés
- ✅ Tous les pointages
- ✅ Tous les plannings
- ✅ Tous les congés
- ✅ Toutes les heures supplémentaires
- ✅ Tous les sites, départements, équipes, etc.

**Cette action est IRRÉVERSIBLE !**

---

## 📋 Utilisation

### Option 1 : Purge complète (supprime TOUT, y compris tenants et utilisateurs)

```bash
cd backend
npm run purge:db
```

Ou directement :
```bash
cd backend
npx ts-node scripts/purge-database.ts --confirm
```

**⚠️ Après cette purge, vous devrez recréer un tenant et des utilisateurs pour vous connecter.**

### Option 2 : Purge en gardant les tenants et utilisateurs

```bash
cd backend
npm run purge:db:keep-tenant
```

Ou directement :
```bash
cd backend
npx ts-node scripts/purge-database.ts --confirm --keep-tenant
```

**✅ Cette option garde les tenants et utilisateurs, vous pourrez vous reconnecter immédiatement.**

---

## 📊 Ce qui sera supprimé

Le script supprime les données dans cet ordre (pour respecter les contraintes de clé étrangère) :

1. ✅ Remplacements de shift (ShiftReplacement)
2. ✅ Pointages (Attendance)
3. ✅ Plannings (Schedule)
4. ✅ Congés (Leave)
5. ✅ Heures supplémentaires (Overtime)
6. ✅ Heures de récupération (Recovery)
7. ✅ Notifications (Notification)
8. ✅ Employés (Employee)
9. ✅ Sessions utilisateur (UserSession)
10. ✅ Préférences utilisateur (UserPreferences)
11. ✅ Rôles utilisateur-tenant (UserTenantRole)
12. ✅ Permissions de rôles (RolePermission)
13. ✅ Rôles (Role)
14. ✅ Logs d'audit (AuditLog)
15. ✅ Appareils de pointage (AttendanceDevice)
16. ✅ Équipes (Team)
17. ✅ Sites (Site)
18. ✅ Shifts (Shift)
19. ✅ Départements (Department)
20. ✅ Positions (Position)
21. ✅ Types de congés (LeaveType)
22. ✅ Jours fériés (Holiday)
23. ✅ Paramètres tenant (TenantSettings)
24. ✅ Utilisateurs (User) - **sauf si `--keep-tenant`**
25. ✅ Tenants (Tenant) - **sauf si `--keep-tenant`**

---

## 🔄 Après la purge

### Si vous avez utilisé `--keep-tenant` :

Vous pouvez immédiatement :
- ✅ Vous reconnecter avec vos identifiants existants
- ✅ Recréer des employés, sites, départements, etc.
- ✅ Importer un fichier Excel avec des employés

### Si vous avez fait une purge complète :

Vous devrez d'abord :
1. Créer un nouveau tenant
2. Créer des utilisateurs de test
3. Puis recréer les données

**Scripts utiles :**
```bash
# Créer un tenant et des utilisateurs de base
npx ts-node scripts/init-tenant-and-user.ts

# Créer des utilisateurs de test
npx ts-node scripts/create-test-users.ts
```

---

## 📝 Exemple de sortie

```
🗑️  ============================================
🗑️  SCRIPT DE PURGE DE LA BASE DE DONNÉES
🗑️  ============================================

📊 Début de la purge...

1️⃣  Suppression des remplacements de shift...
   ✅ 5 remplacements supprimés

2️⃣  Suppression des pointages...
   ✅ 1250 pointages supprimés

3️⃣  Suppression des plannings...
   ✅ 320 plannings supprimés

...

📊 ============================================
📊 RÉSUMÉ DE LA PURGE
📊 ============================================

   shiftReplacements: 5
   attendance: 1250
   schedules: 320
   leaves: 45
   overtime: 12
   recovery: 8
   notifications: 89
   employees: 25
   ...

   ✅ TOTAL: 1754 enregistrements supprimés

🎉 Purge terminée avec succès !
```

---

## 🛡️ Sécurité

Le script nécessite le flag `--confirm` pour s'exécuter, ce qui évite les suppressions accidentelles.

Si vous oubliez `--confirm`, le script affichera :
```
⚠️  ATTENTION : Ce script va supprimer TOUTES les données !
⚠️  Cette action est IRRÉVERSIBLE !

❌ Pour exécuter ce script, utilisez : npx ts-node scripts/purge-database.ts --confirm
```

---

## 💡 Recommandations

1. **💾 Faire une sauvegarde** avant d'exécuter le script (si vous avez des données importantes)
2. **🧪 Utiliser `--keep-tenant`** pour les tests fréquents (plus rapide)
3. **🔄 Utiliser la purge complète** uniquement pour repartir vraiment à zéro

---

## 🐛 Dépannage

### Erreur : "Cannot find module '@prisma/client'"
```bash
cd backend
npm install
npx prisma generate
```

### Erreur : "Database connection failed"
Vérifiez votre fichier `.env` et la variable `DATABASE_URL`.

### Erreur de contrainte de clé étrangère
Le script est conçu pour respecter l'ordre des dépendances. Si vous obtenez une erreur, vérifiez que le schéma Prisma est à jour :
```bash
npx prisma generate
```

---

**Créé le :** 2025-01-09
