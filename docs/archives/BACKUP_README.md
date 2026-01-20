# 📦 Système de Backup & Restauration - PointaFlex

Ce document explique comment utiliser le système de backup et restauration complet pour PointaFlex.

---

## 🎯 Vue d'Ensemble

Le système de backup sauvegarde automatiquement:
- ✅ **Base de données PostgreSQL** (Supabase) - Toutes les tables et données
- ✅ **Code source** - Backend (NestJS) et Frontend (Next.js)
- ✅ **Configuration** - Fichiers .env et package.json
- ✅ **Schema Prisma** - Schema et toutes les migrations
- ✅ **Documentation** - Instructions de restauration incluses

---

## 📁 Structure des Scripts

```
PointaFlex/
├── scripts/
│   ├── backup.sh           # Script de sauvegarde complète
│   ├── restore.sh          # Script de restauration
│   └── list-backups.sh     # Lister les backups disponibles
└── backups/                # Répertoire des sauvegardes
    └── backup_YYYYMMDD_HHMMSS/
        ├── database.dump           # Dump PostgreSQL (format binaire)
        ├── database.sql            # Dump PostgreSQL (format SQL)
        ├── backend/                # Code backend
        ├── frontend/               # Code frontend
        ├── backup_info.txt         # Informations du backup
        └── RESTORE_INSTRUCTIONS.md # Instructions détaillées
```

---

## 🚀 Utilisation

### 1️⃣ Créer un Backup

#### Backup avec nom automatique (horodaté)

```bash
cd /home/assyin/PointaFlex
./scripts/backup.sh
```

Cela créera un backup nommé: `backup_20250123_143022`

#### Backup avec nom personnalisé

```bash
./scripts/backup.sh mon_backup_avant_maj
```

Cela créera un backup nommé: `mon_backup_avant_maj`

### 2️⃣ Lister les Backups Disponibles

```bash
./scripts/list-backups.sh
```

Affiche:
- Tous les backups disponibles
- Leur taille
- Leur date de création
- Leur contenu

### 3️⃣ Restaurer un Backup

```bash
./scripts/restore.sh backup_20250123_143022
```

⚠️ **ATTENTION**: Cette opération:
- Écrase votre base de données actuelle
- Remplace votre code source
- Remplace vos fichiers de configuration

**Vous devrez taper "OUI" en majuscules pour confirmer.**

---

## 🔒 Sécurité

### Avant de Restaurer

Le script de restauration crée automatiquement des **sauvegardes de sécurité** de vos fichiers actuels:

- `backend.before_restore_YYYYMMDD_HHMMSS`
- `frontend.before_restore_YYYYMMDD_HHMMSS`

Ces sauvegardes sont créées au même niveau que les répertoires originaux.

### Protection des Données Sensibles

Les fichiers suivants sont **exclus** automatiquement des backups:
- `node_modules/` (réinstallés lors de la restauration)
- `.next/` et `dist/` (régénérés)
- Fichiers `.log`
- `.env.local`

---

## 💾 Compression

Lors de la création d'un backup, vous pouvez choisir de le compresser en `.tar.gz`:

```bash
./scripts/backup.sh
# Le script vous demandera si vous voulez compresser
# Tapez "oui" pour créer une archive .tar.gz
```

**Avantages de la compression:**
- ✅ Économise 60-80% d'espace disque
- ✅ Plus facile à déplacer/copier
- ✅ Le script de restauration décompresse automatiquement

---

## 🛠️ Processus Détaillé

### Que fait le Script de Backup?

1. **Création du répertoire** de backup horodaté
2. **Sauvegarde de la base de données**:
   - Format binaire (`.dump`) pour restauration rapide
   - Format SQL (`.sql`) pour inspection manuelle
3. **Copie du code source** (backend + frontend)
4. **Copie de la configuration** (.env, package.json)
5. **Copie du schema Prisma** et migrations
6. **Génération des métadonnées** et instructions
7. **Compression optionnelle** en .tar.gz

### Que fait le Script de Restauration?

1. **Vérification** de l'existence du backup
2. **Décompression** automatique si nécessaire
3. **Confirmation** de l'utilisateur (double sécurité)
4. **Sauvegarde de sécurité** des fichiers actuels
5. **Restauration de la base de données**
6. **Restauration du code source**
7. **Réinstallation des dépendances** (npm install)
8. **Régénération Prisma** (prisma generate)
9. **Nettoyage** des fichiers temporaires
10. **Vérification** de l'intégrité

---

## 📊 Exemples d'Utilisation

### Backup Avant une Mise à Jour

```bash
# Créer un backup avant d'installer une mise à jour
./scripts/backup.sh backup_avant_update_v2
```

### Backup Quotidien Automatique

Ajoutez cette ligne à votre crontab pour un backup quotidien à 2h du matin:

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne:
0 2 * * * /home/assyin/PointaFlex/scripts/backup.sh backup_auto_$(date +\%Y\%m\%d)
```

### Backup Avant Migration Prisma

```bash
# Backup avant une migration risquée
./scripts/backup.sh backup_avant_migration_employes

# Faire la migration
cd backend
npx prisma migrate dev

# Si problème, restaurer:
cd ..
./scripts/restore.sh backup_avant_migration_employes
```

---

## 🔧 Dépannage

### Le backup échoue avec "pg_dump: command not found"

Installez PostgreSQL client:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

### Le backup est très volumineux

Les backups **n'incluent PAS** `node_modules`, `.next`, ou `dist`. Si le backup est volumineux:
- Utilisez la compression (peut réduire de 60-80%)
- Vérifiez qu'il n'y a pas de gros fichiers dans le projet

### La restauration échoue

1. Vérifiez que les applications sont arrêtées
2. Vérifiez les permissions des fichiers
3. Vérifiez la connexion à Supabase
4. Consultez les logs d'erreur détaillés

---

## 📋 Checklist de Backup Régulier

- [ ] **Quotidien**: Backup automatique (cron)
- [ ] **Avant modifications majeures**: Backup manuel
- [ ] **Avant migrations**: Backup manuel
- [ ] **Hebdomadaire**: Vérifier les backups
- [ ] **Mensuel**: Tester une restauration

---

## 🎓 Bonnes Pratiques

### 1. Testez Régulièrement la Restauration

```bash
# Une fois par mois, testez la restauration sur un environnement de test
./scripts/backup.sh backup_test_restore
# ... tester la restauration ...
```

### 2. Conservez Plusieurs Backups

- **Backups quotidiens**: 7 derniers jours
- **Backups hebdomadaires**: 4 dernières semaines
- **Backups mensuels**: 12 derniers mois

### 3. Stockage Externe

Copiez vos backups vers un stockage externe:

```bash
# Copier vers un disque externe
cp -r backups/backup_20250123_143022 /mnt/external/backups/

# Ou vers le cloud (exemple avec AWS S3)
aws s3 sync backups/ s3://mon-bucket/pointaflex-backups/
```

### 4. Vérification d'Intégrité

```bash
# Vérifier qu'un backup contient tous les fichiers nécessaires
ls -la backups/backup_20250123_143022/

# Devrait contenir:
# - database.dump
# - database.sql
# - backend/
# - frontend/
# - backup_info.txt
```

---

## ⚙️ Configuration Avancée

### Modifier les Exclusions

Éditez `scripts/backup.sh` et modifiez les options `--exclude` de rsync:

```bash
rsync -av --progress \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='mon_dossier_custom' \  # Ajouter vos exclusions
    "$BACKEND_DIR/" \
    "$BACKUP_DIR/backend/"
```

### Sauvegarder sur un Serveur Distant

Modifiez `scripts/backup.sh` pour envoyer le backup via SSH:

```bash
# À la fin du script
scp -r "$BACKUP_DIR" user@serveur-distant:/backups/
```

---

## 🆘 Support

En cas de problème:

1. **Consultez les logs** du script (affichés pendant l'exécution)
2. **Vérifiez les métadonnées** dans `backup_info.txt`
3. **Lisez les instructions** dans `RESTORE_INSTRUCTIONS.md`
4. **Testez manuellement** les commandes PostgreSQL

---

## 📝 Notes Importantes

- Les backups **incluent les mots de passe** (.env) - **Sécurisez-les!**
- La restauration **écrase les données** - **Faites attention!**
- Les backups **ne sont pas chiffrés** - **Chiffrez si nécessaire!**
- Testez toujours la restauration sur un **environnement de test** d'abord

---

## ✅ Résumé des Commandes

```bash
# Créer un backup
./scripts/backup.sh

# Créer un backup nommé
./scripts/backup.sh mon_backup

# Lister les backups
./scripts/list-backups.sh

# Restaurer un backup
./scripts/restore.sh backup_20250123_143022

# Supprimer un vieux backup
rm -rf backups/backup_20250120_100000
```

---

**💡 Conseil**: Configurez un backup automatique quotidien et testez la restauration au moins une fois par mois!
