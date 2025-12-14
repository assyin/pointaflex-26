# 🧪 Guide de Test - Générateur de Données Complet

## 📋 Scénario de Test Simple

### Objectif
Tester la génération complète de données avec un volume réduit pour valider rapidement toutes les fonctionnalités.

---

## 🚀 Étape 1 : Préparation

### 1.1 Vérifier l'environnement
- ✅ Backend démarré et accessible
- ✅ Frontend démarré et accessible
- ✅ Base de données connectée
- ✅ Utilisateur connecté avec rôle `SUPER_ADMIN` ou `ADMIN_RH`

### 1.2 Accéder à l'interface
```
http://192.168.79.102:3001/admin/data-generator-all
```

### 1.3 Vérifier les permissions RBAC
Si vous obtenez une erreur 403, exécutez :
```bash
cd backend
npm run init:rbac
```

---

## 🎯 Étape 2 : Configuration de Test (Petit Volume)

### Configuration Recommandée pour Test Rapide

#### **Onglet 1 : Structure** 🏢
- **Sites** : `2`
- **Départements** : `3`
- **Positions** : `5`
- **Équipes** : `2`
- ✅ **Assigner des managers** : coché

#### **Onglet 1 : RBAC - Utilisateurs**
- **SUPER_ADMIN** : `1`
- **ADMIN_RH** : `1`
- **MANAGER** : `2`
- **EMPLOYEE** : `10`

#### **Onglet 1 : Employés**
- **Nombre d'employés** : `10`
- ✅ **Lier aux utilisateurs RBAC** : coché
- ✅ **Assigner aux structures** : coché

#### **Onglet 2 : Horaires** ⏰
- ✅ **Créer shifts par défaut** : coché
- ✅ **Assigner aux employés** : coché
- ✅ **Générer jours fériés marocains** : coché
- **Année de début** : `2024`
- **Année de fin** : `2025`
- **Date de début planning** : `Aujourd'hui`
- **Date de fin planning** : `+30 jours`
- **Couverture** : `100%`
- ✅ **Exclure jours fériés** : coché
- ✅ **Exclure weekends** : coché

#### **Onglet 3 : Absences** 📅
- **Pourcentage d'employés avec congés** : `30%`
- **Nombre moyen de jours** : `3`
- ✅ **Approbation automatique** : décoché
- **PENDING** : `20%`
- **MANAGER_APPROVED** : `30%`
- **APPROVED** : `50%`
- **REJECTED** : `0%`

#### **Onglet 4 : Pointages** 📊
- **Date de début** : `-7 jours` (il y a 7 jours)
- **Date de fin** : `Aujourd'hui`
- **Normal** : `70%`
- **Retard** : `15%`
- **Départ anticipé** : `5%`
- **Anomalies** : `5%`
- **Mission** : `3%`
- **Absence** : `2%`
- ✅ **Exclure jours fériés** : coché
- ✅ **Exclure weekends** : coché
- ✅ **Générer heures sup (via pointages)** : coché

#### **Onglet 4 : Heures Supplémentaires (Directes)**
- **Nombre d'overtime** : `5`
- **Nombre moyen d'heures** : `2`
- **PENDING** : `30%`
- **APPROVED** : `60%`
- **REJECTED** : `10%`

#### **Onglet 4 : Récupération**
- **Nombre de recovery** : `3`
- ✅ **Convertir depuis overtime** : coché
- **Taux de conversion** : `20%`

#### **Onglet 5 : Équipements** 📱
- **Nombre par site** : `1`
- **Nombre de remplacements** : `3`
- **PENDING** : `20%`
- **APPROVED** : `70%`
- **REJECTED** : `10%`
- **Nombre de notifications** : `10`

#### **Onglet 6 : Options** ⚙️
- ✅ **Marquer toutes les données comme générées** : coché
- ✅ **Utiliser des transactions** : coché
- ❌ **Arrêter en cas d'erreur** : décoché

---

## 🎬 Étape 3 : Exécution du Test

### 3.1 Lancer la Génération
1. Cliquer sur le bouton **"Générer tout"**
2. Attendre la fin de la génération (généralement 10-30 secondes pour ce volume)
3. Observer la barre de progression et les messages

### 3.2 Vérifier les Résultats
Après la génération, vous devriez voir :

#### **Statistiques Générales**
- ✅ **Entités créées** : ~200-300 entités
- ✅ **Durée** : < 60 secondes
- ✅ **Étapes complétées** : 20-24 étapes

#### **Comptes Utilisateurs Créés** 👤
- ✅ Section "Comptes Utilisateurs Créés" visible
- ✅ Liste des utilisateurs avec :
  - Email (format : `prenom.nom@test.local`)
  - Mot de passe : `Password123!`
  - Rôle (SUPER_ADMIN, ADMIN_RH, MANAGER, EMPLOYEE)
- ✅ Possibilité de copier les identifiants

#### **Par Type d'Entité**
Vérifier que les entités suivantes sont créées :
- ✅ **Site** : 2
- ✅ **Department** : 3
- ✅ **Position** : 5
- ✅ **Team** : 2
- ✅ **User** : 14 (1+1+2+10)
- ✅ **Employee** : 10
- ✅ **Shift** : 3 (Matin, Soir, Nuit)
- ✅ **Holiday** : ~15-20 (jours fériés marocains)
- ✅ **Schedule** : ~200-300 (plannings)
- ✅ **LeaveType** : ~5-7 (types de congés)
- ✅ **Leave** : ~3-5 (demandes de congés)
- ✅ **Attendance** : ~50-70 (pointages)
- ✅ **Overtime** : ~5-10 (heures sup)
- ✅ **Recovery** : ~3 (récupération)
- ✅ **AttendanceDevice** : 2 (1 par site)
- ✅ **ShiftReplacement** : 3
- ✅ **Notification** : 10

---

## ✅ Étape 4 : Vérification des Données Générées

### 4.1 Vérifier la Structure Organisationnelle

#### **Sites** (`/structure-rh` ou `/settings`)
- ✅ 2 sites créés
- ✅ Noms réalistes (ex: "Site Casablanca", "Site Rabat")

#### **Départements** (`/structure-rh`)
- ✅ 3 départements créés
- ✅ Noms réalistes (ex: "Ressources Humaines", "Production", "Commercial")

#### **Positions** (`/structure-rh`)
- ✅ 5 positions créées
- ✅ Noms réalistes (ex: "Développeur", "Manager", "Assistant")

#### **Équipes** (`/teams`)
- ✅ 2 équipes créées
- ✅ Liées aux départements

### 4.2 Vérifier les Utilisateurs et Employés

#### **Utilisateurs** (via les identifiants affichés)
- ✅ Tester la connexion avec un compte créé :
  - Email : `prenom.nom@test.local`
  - Mot de passe : `Password123!`
- ✅ Vérifier que la connexion fonctionne
- ✅ Vérifier que le rôle est correct

#### **Employés** (`/employees`)
- ✅ 10 employés créés
- ✅ Assignés aux sites, départements, positions
- ✅ Liés aux utilisateurs RBAC (si option activée)
- ✅ Matricules uniques
- ✅ Données réalistes (noms, emails, téléphones)

### 4.3 Vérifier les Horaires

#### **Shifts** (`/shifts-planning`)
- ✅ 3 shifts par défaut créés :
  - Shift Matin (ex: 08:00 - 16:00)
  - Shift Soir (ex: 16:00 - 00:00)
  - Shift Nuit (ex: 00:00 - 08:00)
- ✅ Assignés aux employés

#### **Jours Fériés** (intégré dans les plannings)
- ✅ Jours fériés marocains créés pour 2024-2025
- ✅ Exclus des plannings (si option activée)

#### **Plannings** (`/shifts-planning`)
- ✅ Plannings créés pour les 30 prochains jours
- ✅ Assignés aux employés
- ✅ Excluent les weekends (si option activée)
- ✅ Excluent les jours fériés (si option activée)

### 4.4 Vérifier les Absences

#### **Types de Congés** (`/leaves`)
- ✅ Types de congés créés automatiquement :
  - Congé annuel
  - Congé maladie
  - Congé exceptionnel
  - etc.

#### **Demandes de Congés** (`/leaves`)
- ✅ ~3-5 demandes de congés créées
- ✅ Statuts variés (PENDING, MANAGER_APPROVED, APPROVED)
- ✅ Liées aux employés

### 4.5 Vérifier les Pointages

#### **Pointages** (`/attendance`)
- ✅ ~50-70 pointages créés pour les 7 derniers jours
- ✅ Distribution réaliste :
  - ~70% Normal
  - ~15% Retard
  - ~5% Départ anticipé
  - ~5% Anomalies
  - ~3% Mission
  - ~2% Absence
- ✅ Excluent les weekends (si option activée)
- ✅ Excluent les jours fériés (si option activée)

#### **Heures Supplémentaires** (`/overtime`)
- ✅ ~5-10 heures sup créées (via pointages)
- ✅ ~5 heures sup directes créées
- ✅ Statuts variés (PENDING, APPROVED, REJECTED)

#### **Récupération** (`/overtime` ou intégré)
- ✅ ~3 heures de récupération créées
- ✅ Converties depuis overtime (si option activée)

### 4.6 Vérifier les Équipements

#### **Terminaux** (`/terminals`)
- ✅ 2 terminaux créés (1 par site)
- ✅ Assignés aux sites
- ✅ Types variés (FINGERPRINT, RFID_BADGE, etc.)

#### **Remplacements** (intégré dans les shifts)
- ✅ ~3 remplacements créés
- ✅ Statuts variés (PENDING, APPROVED, REJECTED)

#### **Notifications** (intégré)
- ✅ 10 notifications créées
- ✅ Liées aux employés

---

## 🔍 Étape 5 : Tests de Validation

### 5.1 Test de Connexion avec Compte Généré
1. Copier un email et mot de passe depuis la section "Comptes Utilisateurs Créés"
2. Se déconnecter
3. Se reconnecter avec les identifiants copiés
4. ✅ Vérifier que la connexion fonctionne
5. ✅ Vérifier que le rôle est correct
6. ✅ Vérifier que l'utilisateur voit les bonnes données selon son rôle

### 5.2 Test de Cohérence des Données

#### **Vérifier les Relations**
- ✅ Les employés sont liés aux sites, départements, positions
- ✅ Les plannings sont liés aux employés et shifts
- ✅ Les pointages sont liés aux employés
- ✅ Les congés sont liés aux employés
- ✅ Les heures sup sont liées aux employés

#### **Vérifier les Hiérarchies**
- ✅ Les managers sont assignés (si option activée)
- ✅ Les employés ont des managers

### 5.3 Test de Performance
- ✅ Génération complète en < 60 secondes
- ✅ Pas d'erreurs dans la console
- ✅ Pas d'erreurs dans les logs backend

---

## 🧹 Étape 6 : Nettoyage (Optionnel)

### 6.1 Nettoyer les Données Générées
1. Cliquer sur **"Nettoyer tout"**
2. Confirmer la suppression
3. ✅ Vérifier que toutes les données générées sont supprimées
4. ✅ Vérifier que les données non générées (tenant, utilisateur connecté) sont préservées

### 6.2 Vérifier après Nettoyage
- ✅ Les employés générés sont supprimés
- ✅ Les pointages générés sont supprimés
- ✅ Les plannings générés sont supprimés
- ✅ Les utilisateurs générés sont supprimés
- ✅ Le tenant existe toujours
- ✅ L'utilisateur connecté existe toujours

---

## 📊 Checklist de Validation

### ✅ Génération
- [ ] Génération complète sans erreurs
- [ ] Statistiques affichées correctement
- [ ] Comptes utilisateurs affichés avec identifiants
- [ ] Toutes les étapes complétées

### ✅ Structure
- [ ] Sites créés
- [ ] Départements créés
- [ ] Positions créées
- [ ] Équipes créées

### ✅ Utilisateurs & Employés
- [ ] Utilisateurs créés
- [ ] Employés créés
- [ ] Liens entre utilisateurs et employés
- [ ] Assignation aux structures

### ✅ Horaires
- [ ] Shifts créés
- [ ] Jours fériés créés
- [ ] Plannings créés

### ✅ Absences
- [ ] Types de congés créés
- [ ] Demandes de congés créées

### ✅ Pointages
- [ ] Pointages créés
- [ ] Heures sup créées
- [ ] Récupération créée

### ✅ Équipements
- [ ] Terminaux créés
- [ ] Remplacements créés
- [ ] Notifications créées

### ✅ Tests Fonctionnels
- [ ] Connexion avec compte généré fonctionne
- [ ] Données visibles dans les interfaces
- [ ] Relations cohérentes
- [ ] Nettoyage fonctionne

---

## 🐛 Dépannage

### Problème : Erreur 403 (Forbidden)
**Solution** : Exécuter `npm run init:rbac` dans le backend

### Problème : Aucun utilisateur créé
**Vérifier** :
- Les rôles système existent (SUPER_ADMIN, ADMIN_RH, MANAGER, EMPLOYEE)
- Les permissions existent
- Les utilisateurs avec les mêmes emails n'existent pas déjà

### Problème : Erreurs de contraintes de clés étrangères
**Solution** : Vérifier que les dépendances sont créées dans le bon ordre (structure → utilisateurs → employés → autres)

### Problème : Génération très lente
**Solution** : Réduire les volumes (moins d'employés, moins de jours pour les pointages)

---

## 📝 Notes Importantes

1. **Mot de passe par défaut** : Tous les utilisateurs générés ont le mot de passe `Password123!`
2. **Emails** : Format `prenom.nom@test.local` ou `prenom.nom1@test.local` si doublon
3. **Isolation** : Toutes les données sont créées dans le tenant de l'utilisateur connecté
4. **Skip automatique** : Les utilisateurs existants sont automatiquement ignorés (pas d'erreur)
5. **Transactions** : Si activées, toutes les données sont créées dans une transaction (cohérence garantie)

---

## 🎯 Scénario de Test Rapide (5 minutes)

Pour un test ultra-rapide :

1. **Configuration minimale** :
   - 1 Site, 1 Département, 2 Positions, 1 Équipe
   - 1 SUPER_ADMIN, 1 ADMIN_RH, 1 MANAGER, 3 EMPLOYEE
   - 3 Employés
   - Shifts par défaut
   - 7 jours de pointages
   - 1 terminal

2. **Lancer la génération** → Attendre ~10 secondes

3. **Vérifier rapidement** :
   - Comptes utilisateurs affichés
   - 3 employés créés
   - Pointages créés
   - Connexion avec un compte généré

4. **Nettoyer** → Tout supprimer

**Temps total** : ~5 minutes

---

## ✅ Conclusion

Ce guide vous permet de tester complètement le générateur de données avec un volume réduit mais représentatif. Tous les modules sont testés et validés.

**Bon test ! 🚀**

