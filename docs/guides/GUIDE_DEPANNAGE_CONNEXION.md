# 🔧 Guide de Dépannage - Problème de Connexion

## ❌ Erreur : "Email ou mot de passe incorrect"

Si vous obtenez cette erreur avec `employee@demo.com / Test123!`, suivez ces étapes :

---

## 🔍 Étape 1 : Vérifier si l'utilisateur existe

### Option A : Via Prisma Studio (Recommandé)

1. **Ouvrez un terminal WSL** et exécutez :
```bash
cd ~/PointaFlex/backend
npx prisma studio
```

2. **Dans Prisma Studio** (ouvre automatiquement dans votre navigateur) :
   - Cliquez sur la table `User`
   - Cherchez `employee@demo.com`
   - Vérifiez :
     - ✅ L'email existe
     - ✅ `isActive = true` (coche verte)
     - ✅ `tenantId` n'est pas vide
     - ✅ `role` est défini

### Option B : Via Script TypeScript

```bash
cd ~/PointaFlex/backend
npx ts-node scripts/check-user.ts
```

Ce script va afficher :
- ✅ Si l'utilisateur existe
- ✅ Son statut (actif/inactif)
- ✅ Son tenant
- ✅ Tous les utilisateurs de test

---

## 🔧 Étape 2 : Réinitialiser les mots de passe

Si l'utilisateur existe mais le mot de passe ne fonctionne pas :

### Exécutez le script de réinitialisation :

```bash
cd ~/PointaFlex/backend
npx ts-node scripts/fix-all-passwords.ts
```

Ce script va :
- ✅ Vérifier tous les utilisateurs
- ✅ Créer les utilisateurs manquants
- ✅ Réinitialiser tous les mots de passe

**Identifiants après réinitialisation** :
- `admin@demo.com` / `Admin@123`
- `employee@demo.com` / `Test123!`
- `manager@demo.com` / `Test123!`
- `rh@demo.com` / `Test123!`

---

## 🆕 Étape 3 : Créer l'utilisateur s'il n'existe pas

Si l'utilisateur n'existe pas, le script `fix-all-passwords.ts` va le créer automatiquement.

Sinon, vous pouvez créer manuellement via Prisma Studio :

1. **Ouvrez Prisma Studio** :
```bash
cd ~/PointaFlex/backend
npx prisma studio
```

2. **Dans la table `User`, cliquez sur "Add record"**

3. **Remplissez les champs** :
   - `email`: `employee@demo.com`
   - `password`: (laissez vide, on va le définir via script)
   - `firstName`: `Mohamed`
   - `lastName`: `Employee`
   - `role`: `EMPLOYEE`
   - `tenantId`: (sélectionnez votre tenant)
   - `isActive`: `true`

4. **Sauvegardez**

5. **Ensuite, exécutez le script de réinitialisation** :
```bash
npx ts-node scripts/fix-all-passwords.ts
```

---

## 🔐 Étape 4 : Vérifier le mot de passe dans le code

Si le problème persiste, vérifiez que le backend utilise bien `bcrypt` pour comparer les mots de passe.

Le code de vérification se trouve dans :
- `backend/src/modules/auth/auth.service.ts` (ligne ~145)

```typescript
const isPasswordValid = await bcrypt.compare(dto.password, user.password);
```

---

## 🐛 Étape 5 : Vérifier les logs du backend

1. **Ouvrez les logs du backend** (terminal où tourne le serveur)

2. **Tentez de vous connecter** avec `employee@demo.com / Test123!`

3. **Regardez les erreurs dans les logs** :
   - `Invalid credentials` = Email ou mot de passe incorrect
   - `Account is disabled` = `isActive = false`
   - `User not found` = L'utilisateur n'existe pas

---

## ✅ Solution Rapide (Tout réinitialiser)

Si rien ne fonctionne, réinitialisez tout :

```bash
cd ~/PointaFlex/backend

# 1. Vérifier les utilisateurs
npx ts-node scripts/check-user.ts

# 2. Réinitialiser tous les mots de passe
npx ts-node scripts/fix-all-passwords.ts

# 3. Vérifier à nouveau
npx ts-node scripts/check-user.ts
```

---

## 📋 Checklist de Vérification

Avant de tester la connexion, vérifiez :

- [ ] L'utilisateur existe dans la base de données
- [ ] `isActive = true`
- [ ] `tenantId` n'est pas `null`
- [ ] Le mot de passe a été réinitialisé récemment
- [ ] Le backend est en cours d'exécution
- [ ] La base de données est accessible
- [ ] Les variables d'environnement sont correctes (`.env`)

---

## 🎯 Test Final

Après avoir exécuté `fix-all-passwords.ts`, testez la connexion :

1. **Allez sur** : http://172.17.112.163:3001/login
2. **Email** : `employee@demo.com`
3. **Mot de passe** : `Test123!`
4. **Cliquez sur "Se connecter"**

Si ça ne fonctionne toujours pas :
- Vérifiez les logs du backend
- Vérifiez que le backend est bien démarré
- Vérifiez la connexion à la base de données

---

**Date de création** : 2025-12-11
**Version** : 1.0

