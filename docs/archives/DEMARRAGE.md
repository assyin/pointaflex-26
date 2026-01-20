# 🚀 Guide de Démarrage - PointageFlex

## Option 1 : Démarrage via PowerShell (Recommandé ✅)

### Étape 1 : Ouvrir PowerShell
- Appuyez sur `Windows + X`
- Cliquez sur **"Windows PowerShell"** ou **"Terminal"**

### Étape 2 : Naviguer vers le projet
```powershell
cd \\wsl.localhost\Ubuntu\home\assyin\PointaFlex\backend
```

### Étape 3 : Exécuter le script de démarrage
```powershell
# Autoriser l'exécution de scripts (une seule fois)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Lancer le backend
.\start-backend.ps1
```

### Alternative : Sans script
```powershell
npm run start:dev
```

---

## Option 2 : Démarrage via CMD

### Étape 1 : Ouvrir l'Invite de commandes
- Appuyez sur `Windows + R`
- Tapez `cmd` et appuyez sur Entrée

### Étape 2 : Naviguer et démarrer
```cmd
cd \\wsl.localhost\Ubuntu\home\assyin\PointaFlex\backend
npm run start:dev
```

---

## Option 3 : Depuis l'Explorateur Windows

### Méthode Simple
1. Ouvrez l'Explorateur Windows
2. Dans la barre d'adresse, tapez :
   ```
   \\wsl.localhost\Ubuntu\home\assyin\PointaFlex\backend
   ```
3. Appuyez sur Entrée
4. Dans la barre d'adresse du dossier, tapez `cmd` et appuyez sur Entrée
5. Dans la fenêtre CMD qui s'ouvre, tapez :
   ```
   npm run start:dev
   ```

---

## ✅ Vérification du Démarrage

Une fois le serveur démarré, vous devriez voir :

```
🚀 Application is running on: http://localhost:3000
📚 Swagger docs: http://localhost:3000/api/docs
```

### Tester le Backend

**1. Ouvrir Swagger**
- URL : http://localhost:3000/api/docs
- Vous verrez tous les endpoints disponibles

**2. Test de santé**
```bash
curl http://localhost:3000/api/v1
```

**3. Créer votre premier tenant**
- Allez sur Swagger : http://localhost:3000/api/docs
- Trouvez `POST /api/v1/auth/register`
- Cliquez sur "Try it out"
- Remplissez les informations et exécutez

---

## 🔧 Résolution de Problèmes

### Erreur : "Cannot find module"
```powershell
npm install
```

### Erreur : "Port 3000 already in use"
```powershell
# Trouver le processus utilisant le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacez PID par le numéro trouvé)
taskkill /PID <PID> /F
```

### Erreur : "Can't reach database server"
- Vérifiez votre connexion internet
- Vérifiez que votre projet Supabase est actif
- Vérifiez le fichier `.env` (DATABASE_URL et DIRECT_URL)

---

## 📦 Démarrage des Deux Serveurs

### Terminal 1 - Backend (PowerShell)
```powershell
cd \\wsl.localhost\Ubuntu\home\assyin\PointaFlex\backend
npm run start:dev
```

### Terminal 2 - Frontend (PowerShell ou WSL)
```powershell
# PowerShell
cd \\wsl.localhost\Ubuntu\home\assyin\PointaFlex\frontend
npm run dev

# OU dans WSL
cd /home/assyin/PointaFlex/frontend
npm run dev
```

---

## 🌐 URLs de l'Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/api/docs |
| Supabase Dashboard | https://supabase.com/dashboard |

---

## 💡 Commandes Utiles

```powershell
# Démarrer le backend
npm run start:dev

# Démarrer en mode production
npm run build
npm run start:prod

# Voir les logs Prisma
npx prisma studio

# Générer le client Prisma
npx prisma generate

# Pousser le schéma vers Supabase
npx prisma db push
```

---

## ✨ Prêt !

Une fois les deux serveurs démarrés :
- **Frontend** : http://localhost:3001
- **Backend** : http://localhost:3000
- **Swagger** : http://localhost:3000/api/docs

Vous pouvez maintenant :
1. S'inscrire en tant que nouveau tenant
2. Se connecter
3. Utiliser l'application PointageFlex

**Bon développement ! 🚀**
