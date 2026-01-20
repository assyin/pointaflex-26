# ✅ Solution pour accéder à l'application

## 🌐 Adresse IP de votre WSL

Votre WSL a l'adresse IP : **172.17.112.163**

## 🔗 URLs pour accéder à l'application

### Depuis Windows :

1. **Frontend** : http://172.17.112.163:3001
2. **Backend API** : http://172.17.112.163:3000
3. **Swagger Docs** : http://172.17.112.163:3000/api/docs

### Depuis WSL (si vous avez une interface graphique) :

1. **Frontend** : http://localhost:3001
2. **Backend API** : http://localhost:3000

## 🚀 Redémarrage manuel des serveurs

Si les serveurs ne répondent pas, redémarrez-les :

### Dans un terminal WSL :

```bash
# 1. Arrêter tous les processus Node.js
pkill -9 node

# 2. Attendre 2 secondes
sleep 2

# 3. Démarrer le backend (dans un terminal)
cd ~/PointaFlex/backend
npm run start:dev

# 4. Démarrer le frontend (dans un autre terminal)
cd ~/PointaFlex/frontend
npm run dev
```

## ✅ Vérification

Une fois les serveurs démarrés, vous devriez voir :

**Backend** :
```
🚀 Application is running on: http://localhost:3000
```

**Frontend** :
```
- Local:        http://localhost:3001
- ready started server on 0.0.0.0:3001
```

## 🎯 Accès à la page Profile

Une fois connecté à l'application :
- Allez sur : http://172.17.112.163:3001/profile
- Ou cliquez sur votre avatar dans le menu

## ⚠️ Si ça ne fonctionne toujours pas

1. **Vérifiez que les serveurs tournent** :
```bash
ps aux | grep node | grep -v grep
netstat -tulpn | grep -E ':(3000|3001)'
```

2. **Vérifiez les erreurs** :
```bash
# Regardez les terminaux où tournent les serveurs
# Cherchez les messages d'erreur en rouge
```

3. **Essayez de redémarrer WSL** :
```powershell
# Dans PowerShell Windows
wsl --shutdown
```
Puis relancez WSL et redémarrez les serveurs.

---

**Important** : Utilisez l'adresse IP **172.17.112.163** au lieu de `localhost` depuis Windows !

