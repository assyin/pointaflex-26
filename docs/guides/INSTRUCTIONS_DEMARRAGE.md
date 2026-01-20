# 🚀 Instructions de démarrage - SERVEURS

## ⚡ Démarrage rapide (Recommandé)

**Dans votre terminal WSL**, exécutez :

```bash
cd ~/PointaFlex
chmod +x start-all-servers.sh
./start-all-servers.sh
```

Ce script va :
1. ✅ Arrêter tous les processus Node.js existants
2. ✅ Démarrer le backend sur le port 3000
3. ✅ Démarrer le frontend sur le port 3001
4. ✅ Vous donner les adresses d'accès

## 🌐 Adresses d'accès

Une fois les serveurs démarrés, utilisez ces adresses :

### Depuis Windows (recommandé) :
- **Frontend** : http://172.17.112.163:3001
- **Backend** : http://172.17.112.163:3000
- **API Docs** : http://172.17.112.163:3000/api/docs
- **Page Profile** : http://172.17.112.163:3001/profile

### Depuis WSL :
- **Frontend** : http://localhost:3001
- **Backend** : http://localhost:3000

## 🔧 Démarrage manuel (si le script ne fonctionne pas)

### Terminal 1 - Backend :
```bash
cd ~/PointaFlex/backend
pkill -9 node 2>/dev/null
npm run start:dev
```

### Terminal 2 - Frontend :
```bash
cd ~/PointaFlex/frontend
pkill -9 node 2>/dev/null
npm run dev
```

## ✅ Vérification

Vous devriez voir ces messages :

**Backend** :
```
🚀 Application is running on: http://localhost:3000
🌐 Network access: http://0.0.0.0:3000
📚 Swagger docs: http://localhost:3000/api/docs
```

**Frontend** :
```
- Local:        http://localhost:3001
- ready started server on 0.0.0.0:3001
```

## 🛑 Arrêter les serveurs

```bash
pkill -9 node
```

## ⚠️ Si les serveurs ne démarrent pas

1. **Vérifiez que les ports sont libres** :
```bash
netstat -tulpn | grep -E ':(3000|3001)'
```

2. **Vérifiez les erreurs dans les terminaux**

3. **Redémarrez WSL** :
```powershell
# Dans PowerShell Windows
wsl --shutdown
```

Puis relancez WSL et redémarrez les serveurs.

---

**💡 Astuce** : Gardez les terminaux ouverts pour voir les logs en temps réel !

