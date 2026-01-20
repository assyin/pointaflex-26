# 📦 GUIDE RAPIDE - BACKUP POINTAFLEX

## ✅ Backup Réussi!

**Date:** 2025-11-25 14:54:32
**Emplacement:** `/home/assyin/PointaFlex/backups/backup_20251125_145432`
**Taille:** 2.4M

---

## 📋 Ce qui a été sauvegardé

### ✅ Code Source
- ✅ Backend NestJS complet (src, prisma, config)
- ✅ Frontend Next.js complet (app, components, lib)
- ✅ Fichiers de configuration (.env)
- ✅ Schema Prisma et migrations
- ✅ package.json (backend + frontend)

### ⚠️ Base de Données PostgreSQL
**ATTENTION:** La sauvegarde automatique de la base de données a échoué en raison d'une incompatibilité de version:
- Serveur Supabase: PostgreSQL 17.6
- Client local pg_dump: PostgreSQL 16.10

**Solution:** Voir section "Backup Manuel de la Base de Données" ci-dessous.

---

## 🔄 Commandes de Backup

### Backup Complet
```bash
cd /home/assyin/PointaFlex
./scripts/backup.sh
```

### Lister les Backups
```bash
./scripts/list-backups.sh
```

### Restaurer un Backup
```bash
./scripts/restore.sh backup_20251125_145432
```

---

## 💾 Backup Manuel de la Base de Données

### Option 1: Via Supabase Dashboard (RECOMMANDÉ ⭐)
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Database → Backups
4. Cliquez sur "Create Backup"

### Option 2: Via Docker
```bash
docker run --rm \
  -e PGPASSWORD='MAMPAPOLino0102' \
  postgres:17 \
  pg_dump -h aws-1-eu-north-1.pooler.supabase.com \
          -p 5432 \
          -U postgres.apeyodpxnxxwdxwcnqmo \
          -d postgres \
          -F c > database.dump
```

---

## 🔧 Restauration Rapide

```bash
cd /home/assyin/PointaFlex
./scripts/restore.sh backup_20251125_145432
```

---

## 📂 Contenu du Backup

```
backups/backup_20251125_145432/
├── backend/           ← Code source NestJS
├── frontend/          ← Code source Next.js
├── backup_info.txt    ← Métadonnées
└── RESTORE_INSTRUCTIONS.md
```

---

## ⚡ Backup Automatique Quotidien

```bash
# Ajouter au crontab
crontab -e

# Ajouter cette ligne (backup à 2h du matin)
0 2 * * * /home/assyin/PointaFlex/scripts/backup.sh >> /home/assyin/backup.log 2>&1
```

---

## 🔐 Sécurité

⚠️ **Les backups contiennent des informations sensibles:**
- Fichiers .env avec JWT secrets
- Database credentials
- Code source complet

**Ne partagez JAMAIS les backups publiquement!**

---

## ✅ Checklist

- [x] Code source backend sauvegardé
- [x] Code source frontend sauvegardé
- [x] Configuration (.env) sauvegardée
- [x] Schema Prisma sauvegardé
- [ ] Base de données (à faire via Supabase Dashboard)

---

**Date:** 2025-11-25
