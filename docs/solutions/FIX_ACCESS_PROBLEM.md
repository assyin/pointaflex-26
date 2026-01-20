# 🔧 Solution au Problème d'Accès

## ❌ Problème
Malgré que l'utilisateur existe et que le mot de passe est valide, la connexion échoue avec "Email ou mot de passe incorrect" quand on accède via `http://172.17.112.163:3001/login`.

## 🔍 Cause Identifiée

Le problème vient de **deux configurations** :

1. **Frontend** : L'URL de l'API n'est pas correctement configurée pour l'accès depuis Windows via l'IP WSL
2. **Backend CORS** : Le backend n'autorise que `localhost:3001`, pas `172.17.112.163:3001`

## ✅ Solution Appliquée

### 1. Configuration CORS du Backend (✅ Corrigé)

Le backend accepte maintenant :
- `http://localhost:3001`
- `http://127.0.0.1:3001`
- `http://172.17.112.163:3001`
- Toutes les IPs locales en développement (172.17.x.x)

### 2. Détection Automatique de l'URL API (✅ Corrigé)

Le frontend détecte maintenant automatiquement l'URL de l'API selon :
- Si vous accédez via `http://172.17.112.163:3001` → API sur `http://172.17.112.163:3000/api/v1`
- Si vous accédez via `http://localhost:3001` → API sur `http://localhost:3000/api/v1`

### 3. Configuration Manuelle (Optionnel)

Si vous voulez forcer une URL spécifique, créez un fichier `.env.local` dans le dossier `frontend/` :

```bash
cd ~/PointaFlex/frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://172.17.112.163:3000/api/v1
EOF
```

## 🔄 Redémarrage Requis

**IMPORTANT** : Après ces modifications, vous devez redémarrer **les deux serveurs** :

### 1. Redémarrer le Backend

```bash
# Arrêter le backend (Ctrl+C)
cd ~/PointaFlex/backend
npm run start:dev
```

### 2. Redémarrer le Frontend

```bash
# Arrêter le frontend (Ctrl+C)
cd ~/PointaFlex/frontend
npm run dev
```

## 🧪 Test de Connexion

Après le redémarrage, testez :

1. **Accédez à** : http://172.17.112.163:3001/login
2. **Email** : `employee@demo.com`
3. **Mot de passe** : `Test123!`
4. **Cliquez sur "Se connecter"**

## 🔍 Vérification dans la Console du Navigateur

Ouvrez la console du navigateur (F12) et vérifiez :

1. **Requête de login** : Elle doit aller vers `http://172.17.112.163:3000/api/v1/auth/login`
2. **Pas d'erreur CORS** : Vous ne devriez pas voir d'erreur "CORS policy"
3. **Réponse 200** : La requête doit retourner un `accessToken`

## 🐛 Si le Problème Persiste

### Vérifier l'URL de l'API dans le Frontend

Dans la console du navigateur, tapez :
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL);
```

Si c'est `undefined`, l'application utilisera la détection automatique.

### Vérifier les Logs du Backend

Regardez les logs du backend lors de la tentative de connexion. Vous devriez voir :
```
POST /api/v1/auth/login
```

### Tester l'API Directement

Testez la connexion directement via curl :

```bash
curl -X POST http://172.17.112.163:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@demo.com","password":"Test123!"}'
```

Si ça fonctionne, vous devriez recevoir un `accessToken`.

## 📋 Checklist

Avant de tester :

- [ ] Backend redémarré
- [ ] Frontend redémarré
- [ ] Backend accessible sur `http://172.17.112.163:3000`
- [ ] Frontend accessible sur `http://172.17.112.163:3001`
- [ ] Pas d'erreur CORS dans la console
- [ ] Requête API va vers la bonne URL

---

**Date de création** : 2025-12-11
**Version** : 1.0

