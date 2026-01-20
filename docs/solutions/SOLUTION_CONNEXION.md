# 🔧 Solution au Problème de Connexion

## ❌ Problème
Malgré la réinitialisation des mots de passe, l'erreur "Email ou mot de passe incorrect" persiste.

## 🔍 Diagnostic

Exécutez ces scripts dans l'ordre pour diagnostiquer le problème :

### Étape 1 : Tester la connexion directement

```bash
cd ~/PointaFlex/backend
npx ts-node scripts/test-login.ts
```

Ce script va :
- ✅ Vérifier si l'utilisateur existe
- ✅ Vérifier si le mot de passe est correct
- ✅ Détecter les doublons d'email
- ✅ Réinitialiser le mot de passe si nécessaire

### Étape 2 : Réinitialiser spécifiquement employee@demo.com

```bash
cd ~/PointaFlex/backend
npx ts-node scripts/fix-password-employee.ts
```

Ce script va :
- ✅ Forcer la réinitialisation du mot de passe
- ✅ S'assurer que `isActive = true`
- ✅ Vérifier que le mot de passe fonctionne

### Étape 3 : Redémarrer le backend

**IMPORTANT** : Après avoir modifié les mots de passe, vous devez redémarrer le backend !

```bash
# Arrêter le backend (Ctrl+C dans le terminal où il tourne)
# Puis redémarrer :
cd ~/PointaFlex/backend
npm run start:dev
```

## 🐛 Causes Possibles

### 1. Backend non redémarré
Le backend peut avoir mis en cache l'ancien hash du mot de passe.

**Solution** : Redémarrer le backend après la réinitialisation.

### 2. Doublons d'email
Si plusieurs utilisateurs ont le même email, `findFirst()` peut retourner le mauvais utilisateur.

**Solution** : Le script `test-login.ts` détectera et affichera les doublons.

### 3. Problème avec bcrypt
Le hash peut ne pas être correctement stocké ou comparé.

**Solution** : Le script `fix-password-employee.ts` force une nouvelle génération du hash.

### 4. Utilisateur inactif
Si `isActive = false`, la connexion échouera.

**Solution** : Le script `fix-password-employee.ts` s'assure que `isActive = true`.

## ✅ Solution Rapide (Tout en un)

Exécutez ces commandes dans l'ordre :

```bash
cd ~/PointaFlex/backend

# 1. Tester et diagnostiquer
npx ts-node scripts/test-login.ts

# 2. Forcer la réinitialisation
npx ts-node scripts/fix-password-employee.ts

# 3. Redémarrer le backend (dans un autre terminal)
# Arrêtez le backend actuel (Ctrl+C)
# Puis redémarrez :
npm run start:dev
```

## 🧪 Test de Connexion Directe via API

Après avoir redémarré le backend, testez la connexion directement :

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@demo.com","password":"Test123!"}'
```

Si ça fonctionne, vous devriez recevoir un `accessToken`.

## 📋 Checklist

Avant de tester la connexion dans le frontend :

- [ ] Script `test-login.ts` exécuté avec succès
- [ ] Script `fix-password-employee.ts` exécuté avec succès
- [ ] Backend redémarré
- [ ] Test API direct réussi (curl)
- [ ] Frontend accessible
- [ ] Tentative de connexion dans le frontend

## 🆘 Si le problème persiste

1. **Vérifiez les logs du backend** lors de la tentative de connexion
2. **Vérifiez la variable d'environnement** `DATABASE_URL` dans `.env`
3. **Vérifiez que Prisma Client est à jour** : `npx prisma generate`
4. **Vérifiez que la base de données est accessible**

---

**Date de création** : 2025-12-11
**Version** : 1.0

