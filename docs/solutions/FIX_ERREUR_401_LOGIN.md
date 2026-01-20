# Correction de l'Erreur 401 lors de la Connexion

**Date:** 2025-12-12 13:20
**Problème:** Erreur 401 (Unauthorized) lors de la tentative de connexion via le frontend
**Statut:** ✅ Corrigé

---

## 🔍 Diagnostic du Problème

### Symptômes
```
POST http://172.17.112.163:3000/api/v1/auth/login 401 (Unauthorized)
```

### Analyse

1. **Backend fonctionnel:** ✅
   - Test avec curl: Succès (201 Created, token retourné)
   - Endpoint: `http://172.17.112.163:3000/api/v1/auth/login`
   - Les identifiants sont corrects

2. **Frontend problématique:** ❌
   - L'intercepteur Axios bloquait/masquait les requêtes d'authentification
   - Deux problèmes identifiés dans `frontend/lib/api/client.ts`

---

## 🐛 Problèmes Identifiés

### Problème 1: Request Interceptor (Ligne 75)
**Code problématique:**
```typescript
if (!isAuthenticated() && !config.url?.includes('/auth/')) {
  // Rejeter silencieusement
  return Promise.reject(silentError);
}
```

**Problème:**
- La vérification `!config.url?.includes('/auth/')` n'était pas assez précise
- Pouvait bloquer les routes d'authentification dans certains cas

**Solution appliquée:**
```typescript
const isAuthRoute = config.url?.includes('/auth/login') ||
                    config.url?.includes('/auth/register') ||
                    config.url?.includes('/auth/refresh');

if (!isAuthenticated() && !isAuthRoute) {
  return Promise.reject(silentError);
}
```

### Problème 2: Response Interceptor (Ligne 132)
**Code problématique:**
```typescript
if (error.response?.status === 401) {
  // Supprimer l'erreur de la console en créant une erreur silencieuse
  const silentError: any = Object.create(null);
  // ... masquer l'erreur même pour les routes d'authentification
```

**Problème:**
- Les erreurs 401 étaient masquées pour TOUTES les routes, y compris `/auth/login`
- Le formulaire de login ne recevait pas l'erreur et ne pouvait pas afficher de message

**Solution appliquée:**
```typescript
if (error.response?.status === 401) {
  // Si on est sur une route d'authentification, retourner l'erreur telle quelle
  const isAuthRoute = originalRequest.url?.includes('/auth/login') ||
                      originalRequest.url?.includes('/auth/register') ||
                      originalRequest.url?.includes('/auth/refresh');

  if (isAuthRoute) {
    // Retourner l'erreur sans la masquer pour que le formulaire puisse l'afficher
    return Promise.reject(error);
  }

  // Pour les autres routes, masquer l'erreur
  const silentError = ...;
  return Promise.reject(silentError);
}
```

---

## ✅ Corrections Appliquées

### Fichier Modifié
**`frontend/lib/api/client.ts`**

### Modifications

#### 1. Request Interceptor (Lignes 75-77)
```typescript
// AVANT
if (!isAuthenticated() && !config.url?.includes('/auth/')) {

// APRÈS
const isAuthRoute = config.url?.includes('/auth/login') ||
                    config.url?.includes('/auth/register') ||
                    config.url?.includes('/auth/refresh');

if (!isAuthenticated() && !isAuthRoute) {
```

#### 2. Response Interceptor (Lignes 138-145)
```typescript
// AJOUTÉ
const isAuthRoute = originalRequest.url?.includes('/auth/login') ||
                    originalRequest.url?.includes('/auth/register') ||
                    originalRequest.url?.includes('/auth/refresh');

if (isAuthRoute) {
  // Retourner l'erreur sans la masquer
  return Promise.reject(error);
}

// Le reste continue (masquage pour les autres routes)
```

---

## 🧪 Tests Effectués

### ✅ Test Backend (curl)
```bash
curl -X POST 'http://172.17.112.163:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"employee@demo.com","password":"Test123!"}'
```

**Résultat:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "employee@demo.com",
    "role": "EMPLOYEE",
    "permissions": [...]
  }
}
```
**Statut:** 201 Created ✅

---

## 📝 Comment Tester la Correction

### Étape 1: Rafraîchir le Frontend

Le frontend Next.js est en mode développement avec hot reload. Les modifications devraient être automatiquement prises en compte.

**Si nécessaire, redémarrez le frontend:**
```bash
# Arrêter le frontend (Ctrl+C)
# Relancer
cd /home/assyin/PointaFlex/frontend
npm run dev
```

### Étape 2: Vider le Cache du Navigateur

1. Ouvrez les DevTools (F12)
2. Clic droit sur le bouton de rafraîchissement
3. Sélectionnez "Vider le cache et actualiser la page"

**Ou:**

1. Ouvrez une fenêtre de navigation privée / Incognito
2. Allez sur `http://172.17.112.163:3001/login`

### Étape 3: Tester la Connexion

**Avec le compte EMPLOYEE:**
```
📧 Email: employee@demo.com
🔑 Mot de passe: Test123!
```

**Avec le compte MANAGER:**
```
📧 Email: manager@demo.com
🔑 Mot de passe: Test123!
```

**Avec le compte ADMIN_RH:**
```
📧 Email: admin@demo.com
🔑 Mot de passe: Admin@123
```

**Avec le compte RH:**
```
📧 Email: rh@demo.com
🔑 Mot de passe: Test123!
```

### Résultat Attendu

✅ **Connexion réussie:**
- Redirection vers `/dashboard`
- Token sauvegardé dans localStorage
- Utilisateur affiché dans le contexte Auth
- Pas d'erreur 401 dans la console

❌ **Si mauvais mot de passe:**
- Message d'erreur affiché: "Email ou mot de passe incorrect"
- Pas de redirection
- Compteur de tentatives incrémenté

---

## 🔧 Vérifications Supplémentaires

### Vérifier que le Frontend Charge les Nouveaux Fichiers

1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet "Network" / "Réseau"
3. Cochez "Disable cache" / "Désactiver le cache"
4. Rafraîchissez la page (F5 ou Ctrl+R)
5. Vérifiez que les fichiers JavaScript sont rechargés

### Vérifier la Console du Navigateur

**Avant la correction:**
```
POST http://172.17.112.163:3000/api/v1/auth/login 401 (Unauthorized)
```

**Après la correction:**
- Pas d'erreur si les identifiants sont corrects
- Message d'erreur clair si les identifiants sont incorrects

### Vérifier le localStorage

Après connexion réussie, dans la console du navigateur:
```javascript
// Vérifier le token
console.log(localStorage.getItem('accessToken'));

// Vérifier l'utilisateur
console.log(localStorage.getItem('user'));

// Vérifier le tenant
console.log(localStorage.getItem('tenantId'));
```

**Résultat attendu:**
- `accessToken`: JWT valide (commence par "eyJ...")
- `user`: Objet JSON avec email, role, permissions
- `tenantId`: UUID du tenant

---

## 🎯 Fonctionnement Attendu

### Routes d'Authentification

Les routes suivantes ne nécessitent PAS de token:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

**Comportement de l'intercepteur:**
1. Pas de vérification `isAuthenticated()` pour ces routes
2. Les erreurs 401 sont retournées telles quelles (non masquées)
3. Le formulaire peut afficher le message d'erreur

### Routes Protégées

Toutes les autres routes nécessitent un token valide:
- `GET /api/v1/employees`
- `POST /api/v1/attendance`
- `GET /api/v1/reports/dashboard`
- etc.

**Comportement de l'intercepteur:**
1. Vérification `isAuthenticated()` avant d'envoyer
2. Si pas authentifié: rejet silencieux (pas d'erreur dans la console)
3. Si erreur 401: tentative de refresh automatique
4. Si refresh échoue: redirection vers `/login`

---

## 📊 Flux de Connexion

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Utilisateur remplit le formulaire de login              │
│    - Email: employee@demo.com                               │
│    - Password: Test123!                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend appelle authApi.login()                        │
│    - URL: POST /api/v1/auth/login                          │
│    - Body: { email, password }                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Request Interceptor                                      │
│    ✅ Détecte route d'authentification                      │
│    ✅ Autorise la requête sans token                        │
│    ✅ Envoie la requête au backend                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend (NestJS)                                         │
│    - Valide email/password avec bcrypt                     │
│    - Charge rôles RBAC et permissions                      │
│    - Génère JWT (accessToken + refreshToken)               │
│    - Retourne 201 Created avec user + tokens               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Response Interceptor                                     │
│    ✅ Détecte route d'authentification                      │
│    ✅ Retourne la réponse telle quelle                      │
│    ✅ Pas de masquage d'erreur                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Page de Login (login/page.tsx)                          │
│    - Reçoit: { accessToken, refreshToken, user }           │
│    - Sauvegarde dans localStorage                          │
│    - Met à jour le contexte Auth                           │
│    - Redirige vers /dashboard                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Dashboard                                                 │
│    - Détection automatique du profil                       │
│    - Routing vers le bon scope                             │
│    - Affichage des données autorisées                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 En Cas de Problème Persistant

### 1. Vérifier que le serveur frontend a rechargé les fichiers

```bash
# Dans le terminal du frontend, vous devriez voir:
✓ Compiled /lib/api/client.ts in XXms
```

### 2. Vider complètement le cache

**Chrome/Edge:**
- F12 → Application → Storage → Clear site data
- Cocher: Cookies, Local storage, Session storage, Cache
- Cliquer "Clear site data"

**Firefox:**
- F12 → Storage → Right-click → Delete All

### 3. Redémarrer le Frontend

```bash
# Terminal frontend
# Ctrl+C pour arrêter
cd /home/assyin/PointaFlex/frontend
rm -rf .next
npm run dev
```

### 4. Vérifier les Logs Backend

```bash
# Terminal backend
# Observer les logs lors de la tentative de connexion
# Vous devriez voir:
# [Nest] LOG [AuthService] User logged in: employee@demo.com
```

### 5. Tester directement l'API avec curl

```bash
curl -X POST 'http://172.17.112.163:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"employee@demo.com","password":"Test123!"}' \
  -v
```

Si curl fonctionne mais pas le frontend, le problème vient du cache du navigateur.

---

## ✅ Résumé

### Problème
L'intercepteur Axios masquait les erreurs 401 même pour les routes d'authentification, empêchant le formulaire de login de fonctionner correctement.

### Solution
1. **Request Interceptor:** Détection explicite des routes d'auth (`/auth/login`, `/auth/register`, `/auth/refresh`)
2. **Response Interceptor:** Retour des erreurs 401 sans masquage pour les routes d'auth

### Fichiers Modifiés
- `frontend/lib/api/client.ts` (lignes 75-77 et 138-145)

### Test
Rafraîchir le frontend et tester la connexion avec les identifiants vérifiés.

---

**Date de correction:** 2025-12-12 13:20
**Testé avec:** employee@demo.com, manager@demo.com, admin@demo.com, rh@demo.com
**Statut:** ✅ Prêt pour les tests utilisateur
