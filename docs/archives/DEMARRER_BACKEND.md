# 🚀 Démarrer le Backend - URGENT

## ❌ Problème Actuel

L'erreur `ERR_CONNECTION_REFUSED` indique que **le backend n'est pas démarré**.

Seul le frontend est en cours d'exécution.

## ✅ Solution : Démarrer le Backend

### Étape 1 : Ouvrir un Nouveau Terminal

Ouvrez un **nouveau terminal WSL** (ne fermez pas celui du frontend).

### Étape 2 : Démarrer le Backend

```bash
cd ~/PointaFlex/backend
npm run start:dev
```

### Étape 3 : Attendre le Démarrage

Vous devriez voir :
```
🚀 Application is running on: http://localhost:3000
🌐 Network access: http://0.0.0.0:3000
📚 Swagger docs: http://localhost:3000/api/docs
```

### Étape 4 : Tester la Connexion

Une fois le backend démarré, retournez sur votre navigateur et essayez de vous connecter :

1. **URL** : http://172.17.112.163:3001/login
2. **Email** : `employee@demo.com`
3. **Mot de passe** : `Test123!`

## 🔍 Vérification

Pour vérifier que le backend est bien démarré :

```bash
# Dans un autre terminal
curl http://172.17.112.163:3000/api/docs
```

Vous devriez voir du HTML (la documentation Swagger).

## 📋 Résumé

**Actuellement en cours d'exécution** :
- ✅ Frontend : Port 3001
- ❌ Backend : **NON DÉMARRÉ** ← C'est le problème !

**Après démarrage du backend** :
- ✅ Frontend : Port 3001
- ✅ Backend : Port 3000

---

**Action requise** : Démarrer le backend maintenant !

