# Configuration Base de Données PointaFlex

## Environnements

### BDD DEV (Développement)
- **Région**: EU North 1 (Stockholm)
- **Host**: `aws-1-eu-north-1.pooler.supabase.com`
- **Port Pooler**: 6543
- **Port Direct**: 5432
- **User**: `postgres.apeyodpxnxxwdxwcnqmo`
- **Password**: `MAMPAPOLino0102`
- **Supabase URL**: https://apeyodpxnxxwdxwcnqmo.supabase.co

### BDD PROD (Production)
- **Région**: EU West 1 (Ireland)
- **Host**: `aws-1-eu-west-1.pooler.supabase.com`
- **Port Pooler**: 6543
- **Port Direct**: 5432
- **User**: `postgres.whkvetcntohgiofovqgg`
- **Password**: `LfBVdgkSMAsDe4t5`
- **Supabase URL**: https://whkvetcntohgiofovqgg.supabase.co

---

## Fichiers d'environnement

| Fichier | Environnement | Usage |
|---------|---------------|-------|
| `.env` | DEV (par défaut) | Développement local |
| `.env.development` | DEV | Backup config dev |
| `.env.production` | PROD | Production |

---

## Commandes utiles

### Démarrer en mode DEV (par défaut)
```bash
cd /home/assyin/PointaFlex/backend
npm run start:dev
```

### Démarrer en mode PROD
```bash
cd /home/assyin/PointaFlex/backend
cp .env.production .env
npm run start:prod
```

### Revenir en mode DEV
```bash
cd /home/assyin/PointaFlex/backend
cp .env.development .env
npm run start:dev
```

### Migrer le schéma vers PROD
```bash
cd /home/assyin/PointaFlex/backend
cp .env.production .env
npx prisma db push
cp .env.development .env  # Revenir à DEV
```

---

## Connexion directe aux bases

### Connexion DEV
```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres
```

### Connexion PROD
```bash
PGPASSWORD='LfBVdgkSMAsDe4t5' psql -h aws-1-eu-west-1.pooler.supabase.com -p 6543 -U postgres.whkvetcntohgiofovqgg -d postgres
```

---

## Données migrées vers PROD (15/01/2026)

| Table | Enregistrements |
|-------|-----------------|
| Tenant | 2 |
| TenantSettings | 2 |
| User | 7 |
| Role | 7 |
| Permission | 80 |
| RolePermission | 304 |
| Shift | 6 |
| Department | 3 |
| Position | 17 |
| Site | 1 |
| Holiday | 33 |
| LeaveType | 14 |
