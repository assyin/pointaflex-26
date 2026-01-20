# Guide d'application de la migration - Suspension des plannings par congé

## Étape 1: Vérifier la connexion à la base de données

Assurez-vous que la base de données Supabase est accessible:

```bash
cd /home/assyin/PointaFlex/backend
npx prisma db pull
```

Si la commande échoue avec une erreur de connexion, vérifiez:
- Que le service Supabase est actif
- Que les credentials dans `.env` sont corrects
- Que le réseau/VPN est configuré correctement

## Étape 2: Appliquer la migration

Une fois la connexion établie, appliquez la migration:

### Option A: Migration automatique (recommandé)

```bash
cd /home/assyin/PointaFlex/backend
npx prisma migrate deploy
```

Cette commande appliquera toutes les migrations en attente, y compris la nouvelle migration de suspension.

### Option B: Migration manuelle

Si vous préférez appliquer la migration manuellement:

```bash
cd /home/assyin/PointaFlex/backend
npx prisma migrate resolve --applied 20251226130200_add_schedule_suspension_support
```

Puis exécutez le SQL directement sur votre base de données Supabase (via l'interface web ou psql).

## Étape 3: Vérifier la migration

Vérifiez que la migration a été appliquée correctement:

```bash
cd /home/assyin/PointaFlex/backend
npx prisma migrate status
```

Vous devriez voir que toutes les migrations sont appliquées.

## Étape 4: Régénérer le client Prisma

```bash
cd /home/assyin/PointaFlex/backend
npx prisma generate
```

## Étape 5: Redémarrer le backend

Redémarrez le serveur backend pour charger le nouveau Prisma Client:

```bash
# Si vous utilisez npm run dev
npm run start:dev

# Ou si vous utilisez pm2
pm2 restart backend
```

## Étape 6: Vérifier les logs

Vérifiez que le backend démarre sans erreur et que les nouveaux champs sont reconnus.

## Étape 7: Tests

Testez la fonctionnalité:

1. **Créez un congé et approuvez-le**
   - Allez sur http://localhost:3001/leaves
   - Créez un nouveau congé pour un employé qui a des plannings
   - Approuvez le congé (manager puis RH)
   - Vérifiez dans les logs: `[suspendSchedulesForLeave] X planning(s) suspendu(s)`

2. **Vérifiez l'affichage dans la planification**
   - Allez sur http://localhost:3001/shifts-planning
   - Sélectionnez la période qui contient le congé
   - Les plannings suspendus doivent apparaître en gris avec l'icône 🚫

3. **Testez la modification de dates**
   - Modifiez les dates du congé
   - Vérifiez que les plannings sont ajustés correctement

4. **Testez l'annulation**
   - Annulez le congé
   - Vérifiez que les plannings sont réactivés

## Résolution des problèmes

### La migration échoue avec "relation does not exist"

Cela peut se produire si une migration précédente a échoué. Résolution:

```bash
cd /home/assyin/PointaFlex/backend
npx prisma migrate resolve --rolled-back <nom_migration_problematique>
npx prisma migrate deploy
```

### Le type "ScheduleStatus" existe déjà

Si le type enum existe déjà, modifiez le fichier de migration pour utiliser `ALTER TYPE` au lieu de `CREATE TYPE`:

```sql
-- Au lieu de CREATE TYPE
ALTER TYPE "ScheduleStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED_BY_LEAVE';
```

### Erreur "column status cannot be cast automatically"

Si PostgreSQL ne peut pas convertir automatiquement, utilisez:

```sql
ALTER TABLE "Schedule"
  ALTER COLUMN "status" TYPE "ScheduleStatus"
  USING CASE
    WHEN "status" = 'PUBLISHED' THEN 'PUBLISHED'::"ScheduleStatus"
    WHEN "status" = 'DRAFT' THEN 'DRAFT'::"ScheduleStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"ScheduleStatus"
    ELSE 'PUBLISHED'::"ScheduleStatus"
  END;
```

## Contact

En cas de problème, consultez:
- `/home/assyin/PointaFlex/IMPLEMENTATION_SUSPENSION_PLANNING_CONGES.md` pour la documentation complète
- Les logs du backend pour diagnostiquer les erreurs
- La console du navigateur pour les erreurs frontend
