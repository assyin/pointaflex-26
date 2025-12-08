# Solution pour l'erreur 500 sur les fichiers statiques Next.js

## Problème
```
GET http://localhost:3001/_next/static/chunks/app-pages-internals.js 500 (Internal Server Error)
GET http://localhost:3001/_next/static/chunks/main-app.js 500 (Internal Server Error)
```

## Solutions (dans l'ordre)

### 1. Arrêter complètement le serveur
- Appuyez sur `Ctrl+C` dans le terminal où Next.js s'exécute
- Attendez que le processus se termine complètement

### 2. Nettoyer le cache Next.js
```bash
cd frontend
rm -rf .next
rm -rf node_modules/.cache
```

Sur Windows (PowerShell) :
```bash
cd frontend
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
if (Test-Path node_modules\.cache) { Remove-Item -Recurse -Force node_modules\.cache }
```

### 3. Vérifier les erreurs de compilation
```bash
cd frontend
npm run build
```

Si des erreurs apparaissent, corrigez-les avant de continuer.

### 4. Redémarrer le serveur
```bash
cd frontend
npm run dev
```

### 5. Si le problème persiste

#### Vérifier les logs du serveur
Regardez le terminal où Next.js s'exécute pour voir les erreurs exactes.

#### Vérifier les variables d'environnement
Assurez-vous que `.env.local` existe et contient :
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

#### Réinstaller les dépendances
```bash
cd frontend
rm -rf node_modules
npm install
```

#### Vérifier la version de Node.js
```bash
node --version
```
Next.js 14 nécessite Node.js 18.17 ou supérieur.

### 6. Solution alternative : Changer le port
Si le port 3001 est occupé ou corrompu :
```bash
cd frontend
npm run dev -- -p 3002
```

Puis accédez à `http://localhost:3002`

