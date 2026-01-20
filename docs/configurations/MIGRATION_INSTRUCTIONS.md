# Instructions pour Appliquer la Migration Prisma - SiteManager

## ✅ Vérification du Schéma

Le schéma Prisma a été modifié avec succès. Le nouveau modèle `SiteManager` a été ajouté.

## 🚀 Commandes à Exécuter

### Depuis le répertoire `backend/`

**1. Vérifier le schéma :**
```bash
npx prisma format
```

**2. Appliquer la migration :**
```bash
npx prisma db push --accept-data-loss
```

**OU créer une migration versionnée :**
```bash
npx prisma migrate dev --name add_site_manager_table
```

**3. Régénérer le client Prisma :**
```bash
npx prisma generate
```

**4. Redémarrer le serveur backend**

## 📋 Résumé des Changements

### Nouveau Modèle Créé
- `SiteManager` : Table de liaison permettant plusieurs managers par site (un par département)

### Modèles Modifiés
- `Site` : Ajout de la relation `siteManagers SiteManager[]`
- `Employee` : Ajout de la relation `siteManagements SiteManager[]`
- `Department` : Ajout de la relation `siteManagers SiteManager[]`
- `Tenant` : Ajout de la relation `siteManagers SiteManager[]`

### Contrainte Unique
- `@@unique([siteId, departmentId])` : Un seul manager par département par site

## ⚠️ Notes Importantes

1. **Données existantes** : Si vous avez des sites avec `managerId` existants, ils continueront de fonctionner (rétrocompatibilité), mais le nouveau système `SiteManager` sera utilisé en priorité.

2. **Générateur de données** : Utilise maintenant automatiquement le nouveau système `SiteManager`.

3. **Vérification** : Après la migration, vérifiez que la table `SiteManager` a été créée dans votre base de données.

## 🔍 Vérification Post-Migration

Pour vérifier que la migration a réussi :

```sql
-- Vérifier que la table existe
SELECT * FROM "SiteManager" LIMIT 1;

-- Vérifier la structure
\d "SiteManager"  -- PostgreSQL
```

Ou via Prisma Studio :
```bash
npx prisma studio
```

## ✅ Checklist

- [ ] Schéma Prisma formaté sans erreurs
- [ ] Migration appliquée (`db push` ou `migrate dev`)
- [ ] Client Prisma régénéré
- [ ] Serveur backend redémarré
- [ ] Table `SiteManager` créée dans la base de données
- [ ] Test de génération de données effectué
