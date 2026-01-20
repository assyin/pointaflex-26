# 🌐 Accéder aux serveurs WSL depuis Windows

## ✅ Les serveurs sont démarrés !

Les serveurs tournent dans WSL :
- **Backend** : Port 3000 ✅
- **Frontend** : Port 3001 ✅

## 🔍 Problème : Accès depuis Windows

Si vous êtes sur Windows et que vous ne pouvez pas accéder à `localhost:3001`, c'est probablement un problème de réseau WSL.

## Solutions

### Solution 1 : Utiliser l'adresse IP de WSL (Recommandé)

1. **Trouvez l'adresse IP de WSL** :
```bash
# Dans WSL
hostname -I
```

2. **Accédez avec cette IP** :
- Backend : `http://[IP_WSL]:3000`
- Frontend : `http://[IP_WSL]:3001`

### Solution 2 : Utiliser localhost (si configuré)

Essayez ces URLs :
- Frontend : http://localhost:3001
- Backend : http://localhost:3000
- API Docs : http://localhost:3000/api/docs

### Solution 3 : Vérifier la configuration WSL

Si `localhost` ne fonctionne pas, vous devez configurer le port forwarding :

1. **Dans PowerShell Windows (en tant qu'administrateur)** :
```powershell
# Forwarder le port 3000 (backend)
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=[IP_WSL]

# Forwarder le port 3001 (frontend)
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=[IP_WSL]
```

Remplacez `[IP_WSL]` par l'adresse IP obtenue avec `hostname -I` dans WSL.

### Solution 4 : Utiliser le navigateur dans WSL

Si vous avez WSL avec interface graphique :
```bash
# Dans WSL
wslview http://localhost:3001
```

## 🔧 Vérification rapide

Testez si les serveurs répondent depuis WSL :

```bash
# Test backend
curl http://localhost:3000/api/v1

# Test frontend
curl http://localhost:3001
```

Si ces commandes fonctionnent dans WSL mais pas depuis Windows, c'est un problème de réseau WSL.

## 📝 Commandes utiles

### Voir les processus en cours
```bash
ps aux | grep -E 'node|npm' | grep -v grep
```

### Voir les ports ouverts
```bash
netstat -tulpn | grep -E ':(3000|3001)'
```

### Arrêter les serveurs
```bash
pkill -9 node
```

### Redémarrer les serveurs
```bash
cd ~/PointaFlex
./start-all-servers.sh
```

## 🎯 Accès direct recommandé

Une fois que vous avez l'IP de WSL, utilisez :
- **Frontend** : `http://[IP_WSL]:3001`
- **Backend API** : `http://[IP_WSL]:3000`
- **Swagger** : `http://[IP_WSL]:3000/api/docs`

---

**Note** : Les serveurs sont bien démarrés. Le problème est uniquement l'accès depuis Windows vers WSL.

