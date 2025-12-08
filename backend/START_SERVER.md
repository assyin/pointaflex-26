# Démarrer le serveur backend

## Problème avec les chemins WSL depuis Windows

Si vous obtenez l'erreur `'nest' n'est pas reconnu`, voici les solutions :

### Solution 1 : Utiliser npx (recommandé)
```bash
cd backend
npx nest start --watch
```

### Solution 2 : Installer les dépendances d'abord
```bash
cd backend
npm install
npm run start:dev
```

### Solution 3 : Exécuter depuis WSL directement
Ouvrez un terminal WSL (Ubuntu) et exécutez :
```bash
cd /home/jirosak/PointageFlex/backend
npm run start:dev
```

### Solution 4 : Utiliser le chemin complet vers nest
```bash
cd backend
./node_modules/.bin/nest start --watch
```

## Vérifier que les dépendances sont installées

```bash
cd backend
npm list @nestjs/cli
```

Si ce n'est pas installé :
```bash
npm install
```

