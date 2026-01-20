# 🔐 Instructions de Backup - PointaFlex

## 🚀 Création d'un Backup

### Méthode Rapide (Recommandée)
```bash
cd /home/assyin/PointaFlex/backend
node scripts/create-backup.js
```

Cette commande créera automatiquement :
- ✅ Backup de la base de données (format JSON par table)
- ✅ Fichier compressé `.tar.gz` dans le dossier `backups/`
- ✅ Rapport détaillé avec statistiques

### Backup Manuel du Code Source
```bash
cd /home/assyin/PointaFlex
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar --exclude='node_modules' --exclude='dist' --exclude='.next' \
    --exclude='backups' --exclude='.git' \
    -czf "backups/code_backup_${TIMESTAMP}.tar.gz" \
    backend/ frontend/ *.md
```

---

## 📥 Restauration d'un Backup

### 1. Extraire le Backup
```bash
cd /home/assyin/PointaFlex/backups
tar -xzf backup_YYYY-MM-DD_HH-MM-SS.tar.gz
```

### 2. Restaurer la Base de Données
```bash
cd /home/assyin/PointaFlex/backend
node scripts/restore-backup.js ../backups/backup_YYYY-MM-DD_HH-MM-SS
```

### 3. Restaurer le Code (si nécessaire)
```bash
cd /home/assyin/PointaFlex
tar -xzf backups/code_backup_YYYYMMDD_HHMMSS.tar.gz
cd backend && npm install
cd ../frontend && npm install
```

---

## 📋 Liste des Backups

Voir tous les backups disponibles :
```bash
ls -lh /home/assyin/PointaFlex/backups/
```

Voir le contenu d'un backup :
```bash
tar -tzf backups/backup_YYYY-MM-DD_HH-MM-SS.tar.gz
```

---

## ⏰ Backups Automatiques (Recommandé)

### Configuration d'un Cron Job

Créer un backup quotidien à 2h du matin :
```bash
crontab -e
```

Ajouter la ligne :
```
0 2 * * * cd /home/assyin/PointaFlex/backend && node scripts/create-backup.js >> /home/assyin/PointaFlex/backups/cron.log 2>&1
```

### Nettoyer les Vieux Backups

Supprimer les backups de plus de 30 jours :
```bash
find /home/assyin/PointaFlex/backups/ -name "*.tar.gz" -mtime +30 -delete
```

---

## 📊 Vérification du Backup

### Consulter le Rapport
```bash
cat /home/assyin/PointaFlex/backups/BACKUP_REPORT.md
```

### Vérifier le Contenu d'un Backup
```bash
# Extraire temporairement
cd /tmp
tar -xzf /home/assyin/PointaFlex/backups/backup_YYYY-MM-DD.tar.gz
cat backup_*/backup_stats.json
cat backup_*/README.md
```

---

## 🔒 Sécurité

### Chiffrer un Backup
```bash
# Chiffrer avec GPG
gpg --symmetric --cipher-algo AES256 backup_YYYY-MM-DD.tar.gz

# Déchiffrer
gpg --decrypt backup_YYYY-MM-DD.tar.gz.gpg > backup_YYYY-MM-DD.tar.gz
```

### Copier vers un Stockage Externe
```bash
# Vers un serveur distant (SSH)
scp backups/backup_YYYY-MM-DD.tar.gz user@remote:/path/to/backups/

# Vers un service cloud (exemple avec rclone)
rclone copy backups/backup_YYYY-MM-DD.tar.gz remote:backups/
```

---

## ⚠️ Important

1. **Testez régulièrement la restauration** de vos backups
2. **Conservez plusieurs versions** (quotidien, hebdomadaire, mensuel)
3. **Stockez les backups hors site** pour la redondance
4. **Chiffrez les backups** contenant des données sensibles
5. **Documentez vos procédures** de backup et restauration

---

## 📞 Dépannage

### Le script de backup échoue
```bash
# Vérifier la connexion à la base de données
cd backend
npx prisma db pull

# Vérifier les permissions
ls -la backups/
```

### Espace disque insuffisant
```bash
# Vérifier l'espace disponible
df -h

# Nettoyer les vieux backups
rm backups/backup_OLD_DATE_*.tar.gz
```

### Restauration partielle
Pour restaurer seulement certaines tables, modifiez le script `restore-backup.js` et commentez les tables non désirées dans `restoreOrder`.

---

**Dernière mise à jour:** 16 décembre 2025
