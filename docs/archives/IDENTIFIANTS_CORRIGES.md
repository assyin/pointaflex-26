# 🔐 Identifiants de Connexion - CORRIGÉS

## ⚠️ Problème détecté

Le mot de passe pour `employee@demo.com` pourrait être différent de `Test123!`.

## 🔧 Solution : Réinitialiser les mots de passe

### Option 1 : Via Prisma Studio (Recommandé)

1. **Ouvrez Prisma Studio** :
```bash
cd ~/PointaFlex/backend
npx prisma studio
```

2. **Allez dans la table `User`**

3. **Trouvez l'utilisateur `employee@demo.com`**

4. **Vérifiez son email et son rôle**

5. **Pour réinitialiser le mot de passe**, exécutez le script TypeScript (voir Option 2)

### Option 2 : Script TypeScript

Exécutez ce script dans votre terminal WSL :

```bash
cd ~/PointaFlex/backend
npx ts-node scripts/fix-all-passwords.ts
```

Ce script va :
- ✅ Vérifier que tous les utilisateurs existent
- ✅ Créer les utilisateurs manquants
- ✅ Réinitialiser tous les mots de passe

### Option 3 : Vérification manuelle

Vérifiez d'abord si l'utilisateur existe :

```bash
cd ~/PointaFlex/backend
npx prisma studio
```

Puis dans Prisma Studio, cherchez `employee@demo.com` dans la table `User`.

## 📋 Identifiants attendus (après correction)

### SUPER_ADMIN
- **Email** : `admin@demo.com`
- **Mot de passe** : `Admin@123`

### ADMIN_RH
- **Email** : `rh@demo.com`
- **Mot de passe** : `Test123!`

### MANAGER
- **Email** : `manager@demo.com`
- **Mot de passe** : `Test123!`

### EMPLOYEE
- **Email** : `employee@demo.com`
- **Mot de passe** : `Test123!`

## 🔍 Vérification

Après avoir exécuté le script, testez la connexion :

1. Allez sur : http://172.17.112.163:3001/login
2. Connectez-vous avec : `employee@demo.com` / `Test123!`
3. Si ça ne fonctionne toujours pas, vérifiez les logs du backend pour voir l'erreur exacte

## 🆘 Si le problème persiste

1. **Vérifiez que l'utilisateur existe** dans la base de données
2. **Vérifiez que le tenant est correct** (l'utilisateur doit avoir un `tenantId`)
3. **Vérifiez que `isActive = true`**
4. **Regardez les logs du backend** lors de la tentative de connexion

---

**Note** : Les mots de passe sont hashés avec bcrypt, donc on ne peut pas les voir directement dans la base de données. Il faut utiliser le script TypeScript pour les réinitialiser.

