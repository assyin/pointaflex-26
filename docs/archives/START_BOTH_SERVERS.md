# 🚀 Guide de Démarrage Complet - Backend + Frontend

## 📋 Vue d'Ensemble

- **Backend**: Port 3000 (http://localhost:3000)
- **Frontend**: Port 3001 (http://localhost:3001)

## 🎯 Démarrage Rapide

### Terminal 1 - Backend

```bash
cd backend
chmod +x restart-now.sh
./restart-now.sh
```

Ou:
```bash
cd backend
npm run restart:now
```

**Attendez** de voir:
```
🚀 Application is running on: http://localhost:3000
```

### Terminal 2 - Frontend

```bash
cd frontend
chmod +x restart-frontend.sh
./restart-frontend.sh
```

Ou:
```bash
cd frontend
npm run restart
```

**Attendez** de voir:
```
✓ Ready in XXXXms
```

## 🌐 Accès depuis Windows (WSL)

### Configuration du Port Forwarding

**Dans PowerShell (Administrateur):**

```powershell
# 1. Obtenir l'IP WSL (dans WSL)
# hostname -I | awk '{print $1}'

# 2. Dans PowerShell Admin, remplacez <WSL_IP> par l'IP obtenue
$wslIP = "<WSL_IP>"  # Exemple: "172.17.112.163"

# 3. Configurer le port forwarding pour le backend (port 3000)
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIP

# 4. Configurer le port forwarding pour le frontend (port 3001)
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIP

# 5. Ajouter les règles de pare-feu
New-NetFirewallRule -DisplayName "WSL Backend" -Direction Inbound -LocalPort 3000 -Action Allow -Protocol TCP -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "WSL Frontend" -Direction Inbound -LocalPort 3001 -Action Allow -Protocol TCP -ErrorAction SilentlyContinue

# 6. Vérifier la configuration
netsh interface portproxy show all
```

### URLs d'Accès depuis Windows

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/docs
- **Backend API**: http://localhost:3000/api/v1

## 🔍 Diagnostic

### Vérifier le Backend

```bash
cd backend
chmod +x check-server.sh
./check-server.sh
```

### Vérifier le Frontend

```bash
cd frontend
chmod +x check-frontend.sh
./check-frontend.sh
```

### Test de Connexion

**Backend:**
```bash
curl http://localhost:3000/api/docs
```

**Frontend:**
```bash
curl http://localhost:3001
```

## 🛠️ Scripts Disponibles

### Backend

- `npm run restart:now` - Redémarrage rapide
- `npm run restart` - Redémarrage complet
- `npm run test:server` - Test de connexion

### Frontend

- `npm run restart` - Redémarrage
- `npm run check` - Diagnostic
- `npm run dev` - Démarrage simple

## ⚠️ Problèmes Courants

### Le backend n'est pas accessible

1. Vérifiez que le backend écoute sur `0.0.0.0:3000`
2. Configurez le port forwarding (voir ci-dessus)
3. Vérifiez les règles de pare-feu

### Le frontend n'est pas accessible

1. Vérifiez que le frontend écoute sur `0.0.0.0:3001`
2. Configurez le port forwarding pour le port 3001
3. Vérifiez que le backend est accessible

### Erreur de connexion API

1. Vérifiez que le backend est démarré
2. Vérifiez le fichier `.env.local` du frontend
3. Vérifiez les logs du frontend pour les erreurs CORS

## 📝 Notes

- Les deux serveurs doivent être démarrés pour que l'application fonctionne
- Le frontend dépend du backend
- Redémarrez les deux serveurs après modification de la configuration
- Les ports 3000 et 3001 doivent être libres

