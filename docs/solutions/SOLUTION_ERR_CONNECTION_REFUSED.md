# 🔧 Solution à l'Erreur ERR_CONNECTION_REFUSED

## ❌ Problème
```
POST http://localhost:3000/api/v1/auth/login net::ERR_CONNECTION_REFUSED
```

## 🔍 Causes Possibles

1. **Backend non démarré** : Le serveur backend n'est pas en cours d'exécution
2. **Mauvaise URL** : Le frontend essaie de se connecter à `localhost:3000` au lieu de `172.17.112.163:3000`
3. **Port bloqué** : Le port 3000 est bloqué ou utilisé par un autre processus

## ✅ Solutions

### Solution 1 : Démarrer le Backend

**IMPORTANT** : Le backend doit être démarré avant de pouvoir se connecter !

```bash
cd ~/PointaFlex/backend
npm run start:dev
```

Attendez de voir :
```
🚀 Application is running on: http://localhost:3000
🌐 Network access: http://0.0.0.0:3000
```

### Solution 2 : Vérifier que le Backend est Accessible

Testez l'API directement depuis votre navigateur Windows :

```
http://172.17.112.163:3000/api/docs
```

Vous devriez voir la documentation Swagger. Si ça ne fonctionne pas, le backend n'est pas accessible.

### Solution 3 : Forcer l'URL de l'API (Recommandé)

Créez un fichier `.env.local` dans le dossier `frontend/` :

```bash
cd ~/PointaFlex/frontend
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://172.17.112.163:3000/api/v1
EOF
```

Puis **redémarrez le frontend** :

```bash
# Arrêter le frontend (Ctrl+C)
cd ~/PointaFlex/frontend
npm run dev
```

### Solution 4 : Vérifier les Ports

Vérifiez que les ports sont bien ouverts :

```bash
# Dans WSL
netstat -tulpn | grep -E ':(3000|3001)'
```

Vous devriez voir :
- Port 3000 : Backend (NestJS)
- Port 3001 : Frontend (Next.js)

## 🔄 Étapes Complètes de Redémarrage

### 1. Arrêter tous les serveurs

```bash
# Dans chaque terminal où tournent les serveurs, appuyez sur Ctrl+C
```

### 2. Démarrer le Backend

```bash
cd ~/PointaFlex/backend
npm run start:dev
```

**Attendez** que vous voyiez :
```
🚀 Application is running on: http://localhost:3000
```

### 3. Démarrer le Frontend

Dans un **nouveau terminal** :

```bash
cd ~/PointaFlex/frontend
npm run dev
```

**Attendez** que vous voyiez :
```
✓ Ready in XXXXms
```

### 4. Tester la Connexion

1. Accédez à : http://172.17.112.163:3001/login
2. Email : `employee@demo.com`
3. Mot de passe : `Test123!`

## 🐛 Diagnostic

### Vérifier que le Backend Répond

Dans la console du navigateur (F12), tapez :

```javascript
fetch('http://172.17.112.163:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Si vous obtenez une erreur de connexion, le backend n'est pas accessible.

### Vérifier l'URL Utilisée par le Frontend

Dans la console du navigateur, tapez :

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'Non défini - utilisation de la détection automatique');
```

## 📋 Checklist

Avant de tester la connexion :

- [ ] Backend démarré et accessible sur `http://172.17.112.163:3000`
- [ ] Frontend démarré et accessible sur `http://172.17.112.163:3001`
- [ ] Fichier `.env.local` créé dans `frontend/` avec `NEXT_PUBLIC_API_URL=http://172.17.112.163:3000/api/v1`
- [ ] Frontend redémarré après création de `.env.local`
- [ ] Pas d'erreur dans les logs du backend
- [ ] Pas d'erreur dans les logs du frontend

## 🆘 Si le Problème Persiste

1. **Vérifiez les logs du backend** : Y a-t-il des erreurs au démarrage ?
2. **Vérifiez les logs du frontend** : Y a-t-il des erreurs de compilation ?
3. **Testez l'API directement** : Utilisez Postman ou curl pour tester `http://172.17.112.163:3000/api/v1/auth/login`
4. **Vérifiez le firewall Windows** : Autorisez les ports 3000 et 3001

---

**Date de création** : 2025-12-11
**Version** : 1.0

