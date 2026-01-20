# 🚀 Démarrage Automatique des Serveurs

## ✅ Serveurs démarrés automatiquement !

Les serveurs backend et frontend ont été démarrés en arrière-plan.

### 📊 Accès aux serveurs

- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **API Documentation (Swagger)**: http://localhost:3000/api/docs

### 📝 Vérifier les logs

Pour voir les logs en temps réel :

```bash
# Logs backend
tail -f backend.log

# Logs frontend  
tail -f frontend.log
```

### 🛑 Arrêter les serveurs

```bash
# Arrêter tous les serveurs
pkill -9 node

# Ou arrêter un serveur spécifique
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:3001 | xargs kill -9  # Frontend
```

### 🔄 Redémarrer les serveurs

J'ai créé des scripts pour faciliter le démarrage :

#### Option 1 : Script tout-en-un (recommandé)
```bash
cd ~/PointaFlex
chmod +x start-all-servers.sh
./start-all-servers.sh
```

#### Option 2 : Scripts séparés
```bash
# Backend seul
cd ~/PointaFlex/backend
chmod +x start-server.sh
./start-server.sh

# Frontend seul (dans un autre terminal)
cd ~/PointaFlex/frontend
chmod +x start-server.sh
./start-server.sh
```

### ⚠️ Si le site est inaccessible

1. **Vérifiez que les serveurs tournent** :
```bash
netstat -tulpn | grep -E ':(3000|3001)'
```

2. **Vérifiez les logs pour les erreurs** :
```bash
tail -20 backend.log
tail -20 frontend.log
```

3. **Redémarrez les serveurs** :
```bash
pkill -9 node
cd ~/PointaFlex
./start-all-servers.sh
```

### 🔍 Vérifier l'état des serveurs

```bash
# Vérifier le backend
curl http://localhost:3000/api/v1/health

# Vérifier le frontend
curl http://localhost:3001
```

### 📱 Accéder à l'application

1. Ouvrez votre navigateur
2. Allez sur : **http://localhost:3001**
3. Vous serez redirigé vers la page de connexion
4. Connectez-vous avec vos identifiants

### 🎯 Page Profile

Une fois connecté, accédez à votre profil :
- **URL**: http://localhost:3001/profile
- Ou cliquez sur votre avatar dans le menu

---

**Note** : Les serveurs tournent en arrière-plan. Pour les voir en temps réel, utilisez les scripts `start-server.sh` dans des terminaux séparés.

