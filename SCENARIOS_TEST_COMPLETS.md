# Scénarios de Test Complets - PointageFlex

**Date de création :** 2025-01-17  
**Version :** 1.0  
**Objectif :** Scénarios de test end-to-end pour toutes les interfaces de l'application

---

## 📋 TABLE DES MATIÈRES

1. [Prérequis et Configuration Initiale](#1-prérequis-et-configuration-initiale)
2. [Scénario 1 : Configuration de la Structure RH](#2-scénario-1-configuration-de-la-structure-rh)
3. [Scénario 2 : Gestion des Utilisateurs et Rôles](#3-scénario-2-gestion-des-utilisateurs-et-rôles)
4. [Scénario 3 : Gestion des Employés](#4-scénario-3-gestion-des-employés)
5. [Scénario 4 : Configuration des Horaires et Plannings](#5-scénario-4-configuration-des-horaires-et-plannings)
6. [Scénario 5 : Pointages et Présence](#6-scénario-5-pointages-et-présence)
7. [Scénario 6 : Gestion des Congés](#7-scénario-6-gestion-des-congés)
8. [Scénario 7 : Heures Supplémentaires](#8-scénario-7-heures-supplémentaires)
9. [Scénario 8 : Rapports et Exports](#9-scénario-8-rapports-et-exports)
10. [Scénario 9 : Audit et Traçabilité](#10-scénario-9-audit-et-traçabilité)
11. [Scénario 10 : Paramètres et Configuration](#11-scénario-10-paramètres-et-configuration)
12. [Scénario 11 : Tests Multi-Rôles](#12-scénario-11-tests-multi-rôles)

---

## 1. PRÉREQUIS ET CONFIGURATION INITIALE

### 1.1 Comptes de Test à Créer

Avant de commencer, créer les comptes suivants via l'interface ou directement en base de données :

| Email | Rôle | Mot de passe | Description |
|-------|------|--------------|-------------|
| `superadmin@test.com` | SUPER_ADMIN | `Test123!` | Super administrateur |
| `admin@test.com` | ADMIN_RH | `Test123!` | Administrateur RH |
| `manager@test.com` | MANAGER | `Test123!` | Manager d'équipe |
| `employee1@test.com` | EMPLOYEE | `Test123!` | Employé test 1 |
| `employee2@test.com` | EMPLOYEE | `Test123!` | Employé test 2 |

### 1.2 Données de Test

**Sites :**
- Site Principal (Casablanca)
- Site Secondaire (Rabat)
- Site Usine (Tanger)

**Départements :**
- Ressources Humaines
- Production
- Qualité
- Logistique
- Informatique

**Équipes :**
- Équipe Production A (Production)
- Équipe Production B (Production)
- Équipe Qualité (Qualité)
- Équipe Logistique (Logistique)

**Postes :**
- Directeur RH
- Manager Production
- Opérateur Production
- Contrôleur Qualité
- Chauffeur Livraison
- Développeur

---

## 2. SCÉNARIO 1 : CONFIGURATION DE LA STRUCTURE RH

**Objectif :** Configurer la structure organisationnelle de l'entreprise  
**Utilisateur :** `admin@test.com` (ADMIN_RH)  
**Durée estimée :** 30 minutes

### 2.1 Connexion et Navigation

**Étapes :**
1. ✅ Ouvrir `http://localhost:3001`
2. ✅ Se connecter avec `admin@test.com` / `Test123!`
3. ✅ Vérifier la redirection vers le dashboard
4. ✅ Vérifier l'affichage du profil (nom, avatar) en haut à droite

**Résultat attendu :**
- Connexion réussie
- Dashboard affiché avec les statistiques
- Menu de navigation visible

---

### 2.2 Création des Sites

**Étapes :**
1. ✅ Naviguer vers **Structure RH** → **Sites**
2. ✅ Cliquer sur **"Ajouter un site"**
3. ✅ Remplir le formulaire :
   - **Nom :** Site Principal
   - **Adresse :** 123 Avenue Mohammed V, Casablanca
   - **Ville :** Casablanca
   - **Pays :** Maroc
   - **Téléphone :** +212 522 123456
4. ✅ Cliquer sur **"Enregistrer"**
5. ✅ Répéter pour :
   - Site Secondaire (Rabat)
   - Site Usine (Tanger)

**Résultat attendu :**
- 3 sites créés et visibles dans la liste
- Possibilité de modifier/supprimer chaque site

---

### 2.3 Création des Départements

**Étapes :**
1. ✅ Naviguer vers **Structure RH** → **Départements**
2. ✅ Cliquer sur **"Ajouter un département"**
3. ✅ Remplir le formulaire :
   - **Nom :** Ressources Humaines
   - **Description :** Gestion des ressources humaines
   - **Site :** Site Principal
4. ✅ Cliquer sur **"Enregistrer"**
5. ✅ Répéter pour tous les départements (Production, Qualité, Logistique, Informatique)

**Résultat attendu :**
- 5 départements créés
- Chaque département associé à un site
- Liste des départements affichée correctement

---

### 2.4 Création des Postes

**Étapes :**
1. ✅ Naviguer vers **Structure RH** → **Postes**
2. ✅ Cliquer sur **"Ajouter un poste"**
3. ✅ Remplir le formulaire :
   - **Nom :** Directeur RH
   - **Département :** Ressources Humaines
   - **Description :** Direction des ressources humaines
4. ✅ Cliquer sur **"Enregistrer"**
5. ✅ Répéter pour tous les postes

**Résultat attendu :**
- Tous les postes créés
- Chaque poste associé à un département
- Liste des postes affichée correctement

---

### 2.5 Création des Équipes

**Étapes :**
1. ✅ Naviguer vers **Structure RH** → **Équipes**
2. ✅ Cliquer sur **"Ajouter une équipe"**
3. ✅ Remplir le formulaire :
   - **Nom :** Équipe Production A
   - **Département :** Production
   - **Site :** Site Principal
   - **Manager :** (à sélectionner après création du manager)
4. ✅ Cliquer sur **"Enregistrer"**
5. ✅ Répéter pour toutes les équipes

**Résultat attendu :**
- Toutes les équipes créées
- Chaque équipe associée à un département et un site
- Liste des équipes affichée correctement

---

## 3. SCÉNARIO 2 : GESTION DES UTILISATEURS ET RÔLES

**Objectif :** Créer et gérer les utilisateurs avec leurs rôles  
**Utilisateur :** `admin@test.com` (ADMIN_RH)  
**Durée estimée :** 45 minutes

### 3.1 Création d'un Utilisateur Manager

**Étapes :**
1. ✅ Naviguer vers **RBAC** → **Utilisateurs**
2. ✅ Cliquer sur **"Ajouter un utilisateur"**
3. ✅ Remplir le formulaire :
   - **Email :** `manager@test.com`
   - **Prénom :** Manager
   - **Nom :** Test
   - **Téléphone :** +212 612 345678
   - **Mot de passe :** `Test123!`
   - **Confirmer mot de passe :** `Test123!`
   - **Rôle :** MANAGER
   - **Actif :** Oui
4. ✅ Cliquer sur **"Enregistrer"**

**Résultat attendu :**
- Utilisateur créé avec succès
- Message de confirmation affiché
- Utilisateur visible dans la liste

---

### 3.2 Attribution de Rôles et Permissions

**Étapes :**
1. ✅ Dans la liste des utilisateurs, cliquer sur **"Modifier"** pour `manager@test.com`
2. ✅ Aller dans l'onglet **"Rôles et Permissions"**
3. ✅ Vérifier que le rôle MANAGER est attribué
4. ✅ Vérifier les permissions associées :
   - `employee.view_team`
   - `attendance.view_team`
   - `leave.approve`
   - `overtime.approve`
5. ✅ Modifier les permissions si nécessaire
6. ✅ Cliquer sur **"Enregistrer"**

**Résultat attendu :**
- Rôle MANAGER correctement attribué
- Permissions visibles et modifiables
- Modifications sauvegardées

---

### 3.3 Création d'Utilisateurs Employés

**Étapes :**
1. ✅ Créer `employee1@test.com` avec le rôle EMPLOYEE
2. ✅ Créer `employee2@test.com` avec le rôle EMPLOYEE
3. ✅ Vérifier que chaque utilisateur a les permissions appropriées :
   - `employee.view_own`
   - `attendance.view_own`
   - `leave.view_own`
   - `overtime.view_own`

**Résultat attendu :**
- 2 utilisateurs employés créés
- Permissions limitées à leurs propres données
- Utilisateurs actifs et prêts à utiliser

---

### 3.4 Test de Connexion avec Différents Rôles

**Étapes :**
1. ✅ Se déconnecter
2. ✅ Se connecter avec `manager@test.com` / `Test123!`
3. ✅ Vérifier le dashboard (doit être différent de l'admin)
4. ✅ Vérifier les menus disponibles (doivent être limités)
5. ✅ Se déconnecter
6. ✅ Se connecter avec `employee1@test.com` / `Test123!`
7. ✅ Vérifier le dashboard (doit être encore plus limité)
8. ✅ Vérifier les menus disponibles (doivent être très limités)

**Résultat attendu :**
- Chaque rôle voit uniquement les fonctionnalités autorisées
- Dashboard adapté selon le rôle
- Navigation restreinte selon les permissions

---

## 4. SCÉNARIO 3 : GESTION DES EMPLOYÉS

**Objectif :** Créer et gérer les employés  
**Utilisateur :** `admin@test.com` (ADMIN_RH)  
**Durée estimée :** 60 minutes

### 4.1 Création d'un Employé Complet

**Étapes :**
1. ✅ Naviguer vers **Employés** → **Liste des employés**
2. ✅ Cliquer sur **"Ajouter un employé"**
3. ✅ Remplir l'onglet **"Informations personnelles"** :
   - **Matricule :** EMP001
   - **Prénom :** Ahmed
   - **Nom :** BENALI
   - **Email :** `ahmed.benali@test.com`
   - **Téléphone :** +212 612 345678
   - **Date de naissance :** 01/01/1990
   - **Sexe :** Masculin
   - **Adresse :** 123 Rue Hassan II, Casablanca
4. ✅ Passer à l'onglet **"Affectation"** :
   - **Site :** Site Principal
   - **Département :** Production
   - **Équipe :** Équipe Production A
   - **Poste :** Opérateur Production
   - **Date d'embauche :** 01/01/2024
   - **Type de contrat :** CDI
   - **Statut :** Actif
5. ✅ Passer à l'onglet **"Horaires"** :
   - **Shift par défaut :** Matin (08:00 - 16:00)
   - **Jours de travail :** Lundi à Samedi
6. ✅ Cliquer sur **"Enregistrer"**

**Résultat attendu :**
- Employé créé avec succès
- Toutes les informations enregistrées
- Employé visible dans la liste avec toutes les informations

---

### 4.2 Création de Plusieurs Employés

**Étapes :**
1. ✅ Créer 5 employés supplémentaires avec des affectations différentes :
   - **Fatima ALAMI** (EMP002) - Manager Production - Équipe Production A
   - **Mohamed IDRISSI** (EMP003) - Contrôleur Qualité - Équipe Qualité
   - **Sanae BENNANI** (EMP004) - Chauffeur Livraison - Équipe Logistique
   - **Youssef AMRANI** (EMP005) - Développeur - Département Informatique
   - **Aicha CHAKIR** (EMP006) - Opérateur Production - Équipe Production B

**Résultat attendu :**
- 6 employés au total créés
- Chaque employé avec des affectations différentes
- Liste des employés affichant tous les détails

---

### 4.3 Association Utilisateur-Employé

**Étapes :**
1. ✅ Pour l'employé **Ahmed BENALI** (EMP001), aller dans **"Modifier"**
2. ✅ Aller dans l'onglet **"Compte utilisateur"**
3. ✅ Sélectionner l'utilisateur `employee1@test.com`
4. ✅ Cliquer sur **"Associer"**
5. ✅ Répéter pour d'autres employés

**Résultat attendu :**
- Employé associé à un compte utilisateur
- L'utilisateur peut se connecter et voir ses données
- Association visible dans les deux sens

---

### 4.4 Import d'Employés (Excel/CSV)

**Étapes :**
1. ✅ Naviguer vers **Employés** → **Import**
2. ✅ Télécharger le modèle Excel
3. ✅ Remplir le modèle avec 10 employés
4. ✅ Importer le fichier
5. ✅ Vérifier les erreurs éventuelles
6. ✅ Corriger et réimporter si nécessaire
7. ✅ Vérifier que tous les employés sont importés

**Résultat attendu :**
- Modèle Excel téléchargé
- Import réussi avec validation
- Tous les employés importés correctement
- Erreurs affichées clairement si présentes

---

### 4.5 Export d'Employés

**Étapes :**
1. ✅ Naviguer vers **Employés** → **Liste des employés**
2. ✅ Appliquer des filtres (ex: Département = Production)
3. ✅ Cliquer sur **"Exporter"** → **Excel**
4. ✅ Vérifier le fichier téléchargé
5. ✅ Vérifier que seuls les employés filtrés sont exportés
6. ✅ Tester l'export CSV

**Résultat attendu :**
- Export Excel généré avec succès
- Fichier contient toutes les colonnes
- Filtres respectés dans l'export
- Format CSV également fonctionnel

---

### 4.6 Recherche et Filtres

**Étapes :**
1. ✅ Utiliser la barre de recherche pour chercher "Ahmed"
2. ✅ Vérifier que l'employé apparaît
3. ✅ Filtrer par **Département :** Production
4. ✅ Vérifier que seuls les employés de Production apparaissent
5. ✅ Filtrer par **Site :** Site Principal
6. ✅ Filtrer par **Statut :** Actif
7. ✅ Combiner plusieurs filtres

**Résultat attendu :**
- Recherche fonctionnelle
- Filtres appliqués correctement
- Combinaison de filtres fonctionnelle
- Résultats mis à jour en temps réel

---

## 5. SCÉNARIO 4 : CONFIGURATION DES HORAIRES ET PLANNINGS

**Objectif :** Configurer les shifts et créer des plannings  
**Utilisateur :** `admin@test.com` (ADMIN_RH)  
**Durée estimée :** 45 minutes

### 5.1 Création des Shifts

**Étapes :**
1. ✅ Naviguer vers **Horaires & Planning** → **Shifts**
2. ✅ Cliquer sur **"Ajouter un shift"**
3. ✅ Créer les shifts suivants :
   - **Matin :** 08:00 - 16:00
   - **Soir :** 16:00 - 00:00
   - **Nuit :** 00:00 - 08:00
   - **Personnalisé :** 09:00 - 17:00 (pour les managers)
4. ✅ Pour chaque shift, configurer :
   - Nom
   - Heure de début
   - Heure de fin
   - Pause (60 minutes)
   - Jours de travail

**Résultat attendu :**
- 4 shifts créés
- Chaque shift avec ses horaires configurés
- Shifts visibles dans la liste

---

### 5.2 Création d'un Planning Hebdomadaire

**Étapes :**
1. ✅ Naviguer vers **Horaires & Planning** → **Planning**
2. ✅ Sélectionner la semaine du 01/01/2024 au 07/01/2024
3. ✅ Cliquer sur **"Créer un planning"**
4. ✅ Pour chaque jour, assigner des shifts :
   - **Lundi :** Ahmed BENALI (Matin), Fatima ALAMI (Personnalisé)
   - **Mardi :** Ahmed BENALI (Matin), Mohamed IDRISSI (Matin)
   - **Mercredi :** Ahmed BENALI (Matin), Sanae BENNANI (Matin)
   - **Jeudi :** Ahmed BENALI (Matin), Youssef AMRANI (Personnalisé)
   - **Vendredi :** Ahmed BENALI (Matin), Aicha CHAKIR (Matin)
   - **Samedi :** Ahmed BENALI (Matin)
5. ✅ Cliquer sur **"Enregistrer"**

**Résultat attendu :**
- Planning créé pour la semaine
- Tous les shifts assignés
- Planning visible dans la vue calendrier

---

### 5.3 Création d'un Planning Mensuel

**Étapes :**
1. ✅ Naviguer vers **Horaires & Planning** → **Planning**
2. ✅ Basculer en vue mensuelle
3. ✅ Sélectionner le mois de Janvier 2024
4. ✅ Créer un planning pour tout le mois
5. ✅ Utiliser la fonction **"Copier la semaine"** pour accélérer
6. ✅ Ajuster les jours fériés si nécessaire

**Résultat attendu :**
- Planning mensuel créé
- Fonction de copie fonctionnelle
- Jours fériés pris en compte

---

### 5.4 Gestion des Remplacements

**Étapes :**
1. ✅ Dans le planning, cliquer sur un shift d'Ahmed BENALI
2. ✅ Cliquer sur **"Remplacer"**
3. ✅ Sélectionner un remplaçant (ex: Aicha CHAKIR)
4. ✅ Ajouter une raison : "Congé maladie"
5. ✅ Soumettre pour approbation
6. ✅ Se connecter en tant que manager
7. ✅ Aller dans **Planning** → **Remplacements en attente**
8. ✅ Approuver le remplacement

**Résultat attendu :**
- Remplacement créé
- Workflow d'approbation fonctionnel
- Manager peut approuver/rejeter
- Planning mis à jour après approbation

---

## 6. SCÉNARIO 5 : POINTAGES ET PRÉSENCE

**Objectif :** Tester le système de pointage et la gestion des présences  
**Utilisateurs :** `employee1@test.com`, `admin@test.com`, `manager@test.com`  
**Durée estimée :** 60 minutes

### 6.1 Pointage Manuel par un Employé

**Étapes :**
1. ✅ Se connecter avec `employee1@test.com`
2. ✅ Naviguer vers **Pointages** → **Pointage manuel**
3. ✅ Cliquer sur **"Pointer l'entrée"**
4. ✅ Vérifier que l'heure est enregistrée
5. ✅ Attendre quelques minutes
6. ✅ Cliquer sur **"Pointer la sortie"**
7. ✅ Vérifier que les heures travaillées sont calculées

**Résultat attendu :**
- Pointage enregistré avec succès
- Heure d'entrée et de sortie correctes
- Heures travaillées calculées automatiquement

---

### 6.2 Consultation des Pointages par l'Employé

**Étapes :**
1. ✅ Toujours connecté en tant qu'employé
2. ✅ Naviguer vers **Pointages** → **Mes pointages**
3. ✅ Vérifier que ses propres pointages sont visibles
4. ✅ Filtrer par date (semaine en cours)
5. ✅ Vérifier les détails de chaque pointage :
   - Date et heure
   - Type (IN/OUT)
   - Source (MANUAL)
   - Heures travaillées

**Résultat attendu :**
- Liste des pointages personnels affichée
- Filtres fonctionnels
- Détails complets visibles

---

### 6.3 Détection d'Anomalies (Retard)

**Étapes :**
1. ✅ Se connecter avec `employee1@test.com`
2. ✅ Pointer l'entrée à **09:15** (au lieu de 08:00)
3. ✅ Se déconnecter
4. ✅ Se connecter avec `admin@test.com`
5. ✅ Naviguer vers **Pointages** → **Anomalies**
6. ✅ Vérifier que le retard est détecté
7. ✅ Vérifier les détails :
   - Type d'anomalie : LATE
   - Minutes de retard : 75
   - Employé concerné

**Résultat attendu :**
- Anomalie détectée automatiquement
- Type correct (LATE)
- Minutes de retard calculées
- Visible dans la liste des anomalies

---

### 6.4 Correction d'un Pointage

**Étapes :**
1. ✅ Toujours connecté en tant qu'admin
2. ✅ Dans la liste des anomalies, cliquer sur le pointage avec retard
3. ✅ Cliquer sur **"Corriger"**
4. ✅ Modifier l'heure d'entrée à **08:00**
5. ✅ Ajouter une raison : "Erreur de saisie"
6. ✅ Cliquer sur **"Enregistrer"**
7. ✅ Vérifier que l'anomalie disparaît

**Résultat attendu :**
- Correction enregistrée
- Anomalie résolue
- Historique de correction tracé
- Raison enregistrée

---

### 6.5 Pointage avec Anomalie (Sortie Manquante)

**Étapes :**
1. ✅ Se connecter avec `employee2@test.com`
2. ✅ Pointer l'entrée à **08:00**
3. ✅ Ne pas pointer la sortie
4. ✅ Se déconnecter
5. ✅ Se connecter avec `admin@test.com`
6. ✅ Naviguer vers **Pointages** → **Anomalies**
7. ✅ Vérifier que l'anomalie MISSING_OUT est détectée
8. ✅ Corriger en ajoutant une sortie à **17:00**

**Résultat attendu :**
- Anomalie MISSING_OUT détectée
- Correction possible
- Heures travaillées recalculées

---

### 6.6 Filtres Avancés sur les Pointages

**Étapes :**
1. ✅ Connecté en tant qu'admin
2. ✅ Naviguer vers **Pointages**
3. ✅ Cliquer sur **"Filtres avancés"**
4. ✅ Appliquer les filtres suivants :
   - **Employé :** Ahmed BENALI
   - **Site :** Site Principal
   - **Département :** Production
   - **Type :** IN
   - **Anomalie :** LATE
   - **Date :** Semaine en cours
5. ✅ Vérifier les résultats
6. ✅ Réinitialiser les filtres

**Résultat attendu :**
- Tous les filtres fonctionnels
- Résultats filtrés correctement
- Réinitialisation fonctionnelle

---

### 6.7 Export des Pointages

**Étapes :**
1. ✅ Toujours dans **Pointages**
2. ✅ Appliquer des filtres (ex: Semaine en cours)
3. ✅ Cliquer sur **"Exporter"** → **Excel**
4. ✅ Vérifier le fichier téléchargé
5. ✅ Vérifier que toutes les colonnes sont présentes
6. ✅ Tester l'export CSV

**Résultat attendu :**
- Export Excel généré
- Toutes les colonnes incluses
- Filtres respectés
- Format CSV fonctionnel

---

## 7. SCÉNARIO 6 : GESTION DES CONGÉS

**Objectif :** Tester le workflow complet de gestion des congés  
**Utilisateurs :** `employee1@test.com`, `manager@test.com`, `admin@test.com`  
**Durée estimée :** 45 minutes

### 7.1 Demande de Congé par un Employé

**Étapes :**
1. ✅ Se connecter avec `employee1@test.com`
2. ✅ Naviguer vers **Congés** → **Mes demandes**
3. ✅ Cliquer sur **"Nouvelle demande"**
4. ✅ Remplir le formulaire :
   - **Type de congé :** Congé annuel
   - **Date de début :** 15/01/2024
   - **Date de fin :** 20/01/2024
   - **Nombre de jours :** 5
   - **Raison :** Vacances personnelles
   - **Justificatif :** (optionnel)
5. ✅ Cliquer sur **"Soumettre"**

**Résultat attendu :**
- Demande créée avec succès
- Statut : EN_ATTENTE
- Message de confirmation affiché

---

### 7.2 Validation par le Manager

**Étapes :**
1. ✅ Se déconnecter
2. ✅ Se connecter avec `manager@test.com`
3. ✅ Naviguer vers **Congés** → **Demandes en attente**
4. ✅ Vérifier que la demande de `employee1@test.com` apparaît
5. ✅ Cliquer sur la demande pour voir les détails
6. ✅ Cliquer sur **"Approuver"**
7. ✅ Ajouter un commentaire : "Approuvé, bonnes vacances !"
8. ✅ Confirmer l'approbation

**Résultat attendu :**
- Demande visible dans la liste des managers
- Détails complets affichés
- Approbation réussie
- Statut mis à jour : APPROVED
- Commentaire enregistré

---

### 7.3 Validation Finale par la RH

**Étapes :**
1. ✅ Se déconnecter
2. ✅ Se connecter avec `admin@test.com`
3. ✅ Naviguer vers **Congés** → **Demandes en attente**
4. ✅ Vérifier que la demande approuvée par le manager apparaît
5. ✅ Cliquer sur **"Approuver"** (validation finale)
6. ✅ Vérifier que le solde de congés de l'employé est mis à jour

**Résultat attendu :**
- Workflow à deux niveaux fonctionnel
- Validation finale réussie
- Solde de congés déduit automatiquement
- Statut final : APPROVED

---

### 7.4 Rejet d'une Demande

**Étapes :**
1. ✅ Se connecter avec `employee2@test.com`
2. ✅ Créer une demande de congé pour une période chargée
3. ✅ Se connecter avec `manager@test.com`
4. ✅ Rejeter la demande avec la raison : "Période trop chargée"
5. ✅ Vérifier que l'employé reçoit une notification
6. ✅ Se connecter avec `employee2@test.com`
7. ✅ Vérifier que la demande est marquée comme REJECTED

**Résultat attendu :**
- Rejet fonctionnel
- Raison enregistrée
- Notification envoyée
- Statut mis à jour

---

### 7.5 Consultation des Soldes de Congés

**Étapes :**
1. ✅ Se connecter avec `employee1@test.com`
2. ✅ Naviguer vers **Congés** → **Mes soldes**
3. ✅ Vérifier les soldes :
   - Congés annuels : 18 jours
   - Congés pris : 5 jours
   - Congés restants : 13 jours
4. ✅ Vérifier l'historique des congés

**Résultat attendu :**
- Soldes affichés correctement
- Calculs automatiques
- Historique complet visible

---

### 7.6 Gestion des Congés par l'Admin

**Étapes :**
1. ✅ Se connecter avec `admin@test.com`
2. ✅ Naviguer vers **Congés** → **Tous les congés**
3. ✅ Vérifier la liste complète
4. ✅ Filtrer par :
   - Statut (APPROVED, PENDING, REJECTED)
   - Employé
   - Type de congé
   - Période
5. ✅ Exporter la liste en Excel

**Résultat attendu :**
- Liste complète visible
- Filtres fonctionnels
- Export réussi

---

## 8. SCÉNARIO 7 : HEURES SUPPLÉMENTAIRES

**Objectif :** Tester la gestion des heures supplémentaires  
**Utilisateurs :** `employee1@test.com`, `manager@test.com`, `admin@test.com`  
**Durée estimée :** 40 minutes

### 8.1 Demande d'Heures Supplémentaires

**Étapes :**
1. ✅ Se connecter avec `employee1@test.com`
2. ✅ Naviguer vers **Heures Supplémentaires** → **Mes demandes**
3. ✅ Cliquer sur **"Nouvelle demande"**
4. ✅ Remplir le formulaire :
   - **Date :** 10/01/2024
   - **Heure de début :** 17:00
   - **Heure de fin :** 20:00
   - **Nombre d'heures :** 3
   - **Raison :** Fin de projet urgent
   - **Type :** Heures supplémentaires normales
5. ✅ Cliquer sur **"Soumettre"**

**Résultat attendu :**
- Demande créée
- Statut : PENDING
- Heures calculées automatiquement

---

### 8.2 Validation par le Manager

**Étapes :**
1. ✅ Se connecter avec `manager@test.com`
2. ✅ Naviguer vers **Heures Supplémentaires** → **Demandes en attente**
3. ✅ Voir la demande de `employee1@test.com`
4. ✅ Cliquer sur **"Approuver"**
5. ✅ Ajouter un commentaire
6. ✅ Confirmer

**Résultat attendu :**
- Approbation réussie
- Statut : APPROVED
- Heures enregistrées

---

### 8.3 Conversion en Récupération

**Étapes :**
1. ✅ Se connecter avec `admin@test.com`
2. ✅ Naviguer vers **Heures Supplémentaires** → **Toutes les demandes**
3. ✅ Trouver une demande approuvée
4. ✅ Cliquer sur **"Convertir en récupération"**
5. ✅ Vérifier le taux de conversion (1h sup = 1h récup)
6. ✅ Confirmer la conversion
7. ✅ Vérifier que les heures de récupération sont créditées

**Résultat attendu :**
- Conversion réussie
- Heures de récupération créditées
- Historique tracé

---

### 8.4 Consultation des Heures Supplémentaires

**Étapes :**
1. ✅ Se connecter avec `employee1@test.com`
2. ✅ Naviguer vers **Heures Supplémentaires** → **Mes heures**
3. ✅ Vérifier :
   - Total heures sup du mois
   - Heures approuvées
   - Heures en attente
   - Heures converties en récupération

**Résultat attendu :**
- Statistiques affichées
- Détails complets
- Historique visible

---

### 8.5 Filtres et Export

**Étapes :**
1. ✅ Se connecter avec `admin@test.com`
2. ✅ Naviguer vers **Heures Supplémentaires**
3. ✅ Appliquer des filtres :
   - Site
   - Département
   - Statut
   - Période
4. ✅ Exporter en Excel

**Résultat attendu :**
- Filtres fonctionnels
- Export réussi

---

## 9. SCÉNARIO 8 : RAPPORTS ET EXPORTS

**Objectif :** Tester tous les types de rapports et exports  
**Utilisateur :** `admin@test.com` (ADMIN_RH)  
**Durée estimée :** 60 minutes

### 9.1 Rapport de Présence

**Étapes :**
1. ✅ Se connecter avec `admin@test.com`
2. ✅ Naviguer vers **Rapports** → **Rapport de présence**
3. ✅ Configurer les filtres :
   - **Période :** Janvier 2024
   - **Site :** Site Principal
   - **Département :** Production
4. ✅ Cliquer sur **"Générer le rapport"**
5. ✅ Vérifier les statistiques :
   - Total pointages
   - Heures travaillées
   - Jours travaillés
   - Anomalies
6. ✅ Vérifier le tableau de données
7. ✅ Vérifier les graphiques (bar chart, pie chart)

**Résultat attendu :**
- Rapport généré avec succès
- Statistiques correctes
- Tableau de données complet
- Graphiques affichés

---

### 9.2 Export du Rapport de Présence

**Étapes :**
1. ✅ Toujours dans le rapport de présence
2. ✅ Cliquer sur **"Exporter"**
3. ✅ Configurer l'export :
   - **Format :** PDF
   - **Template :** Standard
   - **Colonnes :** Sélectionner les colonnes importantes
   - **Inclure résumé :** Oui
   - **Inclure graphiques :** Oui
4. ✅ Cliquer sur **"Exporter"**
5. ✅ Vérifier le téléchargement
6. ✅ Ouvrir le PDF et vérifier le contenu
7. ✅ Répéter avec Excel et CSV

**Résultat attendu :**
- Export PDF généré
- Résumé inclus
- Graphiques inclus
- Formats Excel et CSV fonctionnels

---

### 9.3 Rapport d'Heures Supplémentaires

**Étapes :**
1. ✅ Naviguer vers **Rapports** → **Rapport heures supplémentaires**
2. ✅ Configurer les filtres :
   - **Période :** Janvier 2024
   - **Département :** Production
3. ✅ Générer le rapport
4. ✅ Vérifier :
   - Total heures sup
   - Répartition par statut
   - Répartition par type
   - Graphiques

**Résultat attendu :**
- Rapport généré
- Statistiques correctes
- Visualisations affichées

---

### 9.4 Rapport d'Absences

**Étapes :**
1. ✅ Naviguer vers **Rapports** → **Rapport absences**
2. ✅ Configurer les filtres
3. ✅ Générer le rapport
4. ✅ Vérifier :
   - Total absences
   - Total retards
   - Jours de congé
   - Statistiques détaillées

**Résultat attendu :**
- Rapport complet
- Données correctes

---

### 9.5 Rapport de Paie

**Étapes :**
1. ✅ Naviguer vers **Rapports** → **Rapport paie**
2. ✅ Configurer les filtres
3. ✅ Générer le rapport
4. ✅ Vérifier :
   - Jours travaillés
   - Heures normales
   - Heures supplémentaires
   - Jours de congé
5. ✅ Exporter en Excel pour la paie

**Résultat attendu :**
- Rapport de paie généré
- Format compatible avec la paie
- Export Excel fonctionnel

---

### 9.6 Rapport de Planning

**Étapes :**
1. ✅ Naviguer vers **Rapports** → **Rapport planning**
2. ✅ Configurer les filtres
3. ✅ Générer le rapport
4. ✅ Vérifier :
   - Total shifts
   - Shifts assignés
   - Shifts ouverts
   - Couverture

**Résultat attendu :**
- Rapport généré
- Statistiques correctes

---

### 9.7 Comparaison de Périodes

**Étapes :**
1. ✅ Dans n'importe quel rapport, activer **"Comparaison"**
2. ✅ Sélectionner la période précédente (Décembre 2023)
3. ✅ Générer le rapport
4. ✅ Vérifier la vue de comparaison :
   - Période actuelle vs précédente
   - Différences calculées
   - Pourcentages de variation
   - Indicateurs visuels (flèches)

**Résultat attendu :**
- Comparaison affichée
- Différences calculées
- Visualisation claire

---

### 9.8 Historique des Rapports

**Étapes :**
1. ✅ Naviguer vers **Rapports** → **Historique**
2. ✅ Vérifier la liste des rapports générés
3. ✅ Cliquer sur **"Télécharger"** pour un rapport précédent
4. ✅ Vérifier que le téléchargement fonctionne

**Résultat attendu :**
- Historique visible
- Téléchargement fonctionnel

---

## 10. SCÉNARIO 9 : AUDIT ET TRAÇABILITÉ

**Objectif :** Tester le système d'audit et de traçabilité  
**Utilisateur :** `admin@test.com` (ADMIN_RH)  
**Durée estimée :** 30 minutes

### 10.1 Consultation du Journal d'Audit

**Étapes :**
1. ✅ Se connecter avec `admin@test.com`
2. ✅ Naviguer vers **Audit** → **Journal d'audit**
3. ✅ Vérifier la liste des actions :
   - Créations
   - Modifications
   - Suppressions
   - Connexions
4. ✅ Vérifier les détails de chaque action :
   - Utilisateur
   - Date et heure
   - Action
   - Entité
   - IP

**Résultat attendu :**
- Liste complète des actions
- Détails complets
- Traçabilité complète

---

### 10.2 Filtres sur le Journal d'Audit

**Étapes :**
1. ✅ Filtrer par **Action :** CREATE
2. ✅ Filtrer par **Entité :** EMPLOYEE
3. ✅ Filtrer par **Période :** Janvier 2024
4. ✅ Filtrer par **Utilisateur :** admin@test.com
5. ✅ Combiner plusieurs filtres

**Résultat attendu :**
- Filtres fonctionnels
- Résultats filtrés correctement

---

### 10.3 Vérification des Modifications

**Étapes :**
1. ✅ Dans le journal, trouver une action UPDATE
2. ✅ Cliquer sur **"Voir les détails"**
3. ✅ Vérifier les changements (avant/après)
4. ✅ Vérifier l'historique complet

**Résultat attendu :**
- Détails des modifications visibles
- Différences affichées
- Historique complet

---

### 10.4 Activités Suspectes

**Étapes :**
1. ✅ Naviguer vers **Audit** → **Activités suspectes**
2. ✅ Vérifier les alertes :
   - Tentatives de connexion échouées
   - Modifications massives
   - Accès non autorisés
3. ✅ Examiner chaque activité suspecte

**Résultat attendu :**
- Alertes générées
- Détails complets
- Actions recommandées

---

## 11. SCÉNARIO 10 : PARAMÈTRES ET CONFIGURATION

**Objectif :** Tester la configuration système  
**Utilisateur :** `admin@test.com` (ADMIN_RH)  
**Durée estimée :** 30 minutes

### 11.1 Paramètres du Tenant

**Étapes :**
1. ✅ Naviguer vers **Paramètres** → **Paramètres généraux**
2. ✅ Modifier les paramètres :
   - **Jours de travail par semaine :** 6
   - **Heures max par semaine :** 44
   - **Tolérance retard :** 15 minutes
   - **Durée pause :** 60 minutes
3. ✅ Enregistrer
4. ✅ Vérifier que les modifications sont appliquées

**Résultat attendu :**
- Paramètres modifiables
- Sauvegarde réussie
- Modifications appliquées

---

### 11.2 Paramètres de Congés

**Étapes :**
1. ✅ Naviguer vers **Paramètres** → **Congés**
2. ✅ Modifier :
   - **Jours de congé annuels :** 18
   - **Niveaux d'approbation :** 2
3. ✅ Enregistrer

**Résultat attendu :**
- Paramètres sauvegardés
- Appliqués aux nouveaux congés

---

### 11.3 Paramètres d'Heures Supplémentaires

**Étapes :**
1. ✅ Naviguer vers **Paramètres** → **Heures supplémentaires**
2. ✅ Modifier :
   - **Taux heures sup :** 1.25
   - **Taux shift nuit :** 1.50
   - **Taux conversion récupération :** 1.0
3. ✅ Enregistrer

**Résultat attendu :**
- Paramètres sauvegardés
- Calculs mis à jour

---

### 11.4 Gestion des Terminaux

**Étapes :**
1. ✅ Naviguer vers **Terminaux**
2. ✅ Cliquer sur **"Ajouter un terminal"**
3. ✅ Remplir :
   - **Nom :** Terminal Principal
   - **Type :** Biométrie
   - **Modèle :** ZKTeco IN01
   - **Adresse IP :** 192.168.1.100
   - **Site :** Site Principal
4. ✅ Enregistrer
5. ✅ Vérifier le statut (en ligne/hors ligne)

**Résultat attendu :**
- Terminal créé
- Statut visible
- Configuration enregistrée

---

### 11.5 Gestion des Jours Fériés

**Étapes :**
1. ✅ Naviguer vers **Paramètres** → **Jours fériés**
2. ✅ Cliquer sur **"Ajouter un jour férié"**
3. ✅ Ajouter :
   - **Date :** 01/01/2024
   - **Nom :** Jour de l'An
   - **Type :** Férié national
4. ✅ Enregistrer
5. ✅ Vérifier que le jour férié est pris en compte dans les plannings

**Résultat attendu :**
- Jour férié créé
- Prise en compte dans les calculs
- Visible dans les plannings

---

## 12. SCÉNARIO 11 : TESTS MULTI-RÔLES

**Objectif :** Vérifier les restrictions d'accès selon les rôles  
**Durée estimée :** 45 minutes

### 12.1 Test d'Accès SUPER_ADMIN

**Étapes :**
1. ✅ Se connecter avec `superadmin@test.com`
2. ✅ Vérifier l'accès à :
   - ✅ Gestion des tenants
   - ✅ Gestion des utilisateurs (tous les tenants)
   - ✅ Paramètres système
   - ❌ Données internes des tenants (doit être limité)

**Résultat attendu :**
- Accès complet à la gestion système
- Pas d'accès aux données internes des tenants

---

### 12.2 Test d'Accès ADMIN_RH

**Étapes :**
1. ✅ Se connecter avec `admin@test.com`
2. ✅ Vérifier l'accès à :
   - ✅ Tous les employés
   - ✅ Tous les pointages
   - ✅ Tous les congés
   - ✅ Tous les rapports
   - ✅ Gestion des utilisateurs (son tenant)
   - ✅ Paramètres tenant
   - ❌ Autres tenants (doit être limité)

**Résultat attendu :**
- Accès complet aux données de son tenant
- Pas d'accès aux autres tenants

---

### 12.3 Test d'Accès MANAGER

**Étapes :**
1. ✅ Se connecter avec `manager@test.com`
2. ✅ Vérifier l'accès à :
   - ✅ Employés de son équipe/département
   - ✅ Pointages de son équipe
   - ✅ Validation des congés de son équipe
   - ✅ Validation des heures sup de son équipe
   - ✅ Rapports de son périmètre
   - ❌ Tous les employés (doit être limité)
   - ❌ Paramètres tenant (doit être limité)

**Résultat attendu :**
- Accès limité à son périmètre
- Pas d'accès aux données hors périmètre

---

### 12.4 Test d'Accès EMPLOYEE

**Étapes :**
1. ✅ Se connecter avec `employee1@test.com`
2. ✅ Vérifier l'accès à :
   - ✅ Ses propres données
   - ✅ Ses pointages
   - ✅ Ses congés
   - ✅ Ses heures sup
   - ✅ Son planning
   - ❌ Données des autres employés (doit être bloqué)
   - ❌ Validation des congés (doit être bloqué)
   - ❌ Rapports complets (doit être limité)

**Résultat attendu :**
- Accès uniquement à ses propres données
- Toutes les autres fonctionnalités bloquées

---

### 12.5 Test de Permissions Granulaires

**Étapes :**
1. ✅ Se connecter avec `admin@test.com`
2. ✅ Créer un rôle personnalisé "SUPERVISOR"
3. ✅ Attribuer des permissions spécifiques :
   - `employee.view_team`
   - `attendance.view_team`
   - `leave.approve`
   - Mais PAS `employee.edit`
4. ✅ Attribuer ce rôle à un utilisateur
5. ✅ Se connecter avec cet utilisateur
6. ✅ Vérifier que seules les permissions attribuées sont actives

**Résultat attendu :**
- Rôle personnalisé créé
- Permissions respectées
- Restrictions appliquées

---

## 13. SCÉNARIO 12 : TESTS DE PERFORMANCE ET LIMITES

**Objectif :** Tester les limites et la performance  
**Durée estimée :** 30 minutes

### 13.1 Test avec Grand Volume de Données

**Étapes :**
1. ✅ Importer 100 employés
2. ✅ Créer des pointages pour tous sur 1 mois
3. ✅ Générer un rapport de présence pour tous
4. ✅ Vérifier le temps de génération
5. ✅ Vérifier que l'interface reste réactive

**Résultat attendu :**
- Import réussi
- Rapport généré (même si long)
- Interface réactive

---

### 13.2 Test de Pagination

**Étapes :**
1. ✅ Naviguer vers une liste avec beaucoup d'éléments (ex: Employés)
2. ✅ Vérifier la pagination
3. ✅ Naviguer entre les pages
4. ✅ Vérifier que les filtres sont conservés

**Résultat attendu :**
- Pagination fonctionnelle
- Navigation fluide
- Filtres conservés

---

### 13.3 Test de Recherche

**Étapes :**
1. ✅ Dans une liste, utiliser la recherche
2. ✅ Tester avec différents termes
3. ✅ Vérifier la rapidité de la recherche
4. ✅ Vérifier les résultats

**Résultat attendu :**
- Recherche rapide
- Résultats pertinents
- Pas de lag

---

## 14. CHECKLIST DE VALIDATION FINALE

### 14.1 Fonctionnalités Critiques

- [ ] Connexion/Déconnexion fonctionnelle
- [ ] Gestion des employés complète
- [ ] Pointages enregistrés et calculés
- [ ] Anomalies détectées et corrigées
- [ ] Congés avec workflow d'approbation
- [ ] Heures supplémentaires avec validation
- [ ] Rapports générés et exportés
- [ ] Audit complet et traçable

### 14.2 Sécurité

- [ ] Rôles et permissions respectés
- [ ] Accès restreint selon les rôles
- [ ] Données isolées par tenant
- [ ] Traçabilité complète

### 14.3 Performance

- [ ] Interface réactive
- [ ] Chargement rapide
- [ ] Exports fonctionnels
- [ ] Recherche rapide

### 14.4 UX

- [ ] Navigation intuitive
- [ ] Messages d'erreur clairs
- [ ] Confirmations appropriées
- [ ] Feedback utilisateur

---

## 15. DONNÉES DE TEST RECOMMANDÉES

### 15.1 Employés de Test

| Matricule | Nom | Prénom | Poste | Département | Équipe |
|-----------|-----|--------|-------|-------------|--------|
| EMP001 | BENALI | Ahmed | Opérateur Production | Production | Équipe A |
| EMP002 | ALAMI | Fatima | Manager Production | Production | Équipe A |
| EMP003 | IDRISSI | Mohamed | Contrôleur Qualité | Qualité | Équipe Qualité |
| EMP004 | BENNANI | Sanae | Chauffeur | Logistique | Équipe Logistique |
| EMP005 | AMRANI | Youssef | Développeur | Informatique | - |
| EMP006 | CHAKIR | Aicha | Opérateur Production | Production | Équipe B |

### 15.2 Pointages de Test

- **Semaine 1 (01-07/01/2024) :** Pointages normaux pour tous
- **Semaine 2 (08-14/01/2024) :** Pointages avec retards et anomalies
- **Semaine 3 (15-21/01/2024) :** Pointages avec congés

### 15.3 Congés de Test

- **Ahmed BENALI :** 15-20/01/2024 (5 jours)
- **Mohamed IDRISSI :** 10-12/01/2024 (3 jours)

### 15.4 Heures Supplémentaires de Test

- **Ahmed BENALI :** 3h le 10/01/2024
- **Sanae BENNANI :** 5h le 12/01/2024

---

## 16. RAPPORT DE TEST

### 16.1 Template de Rapport

Pour chaque scénario, documenter :

1. **Date de test :**
2. **Testeur :**
3. **Résultat :** ✅ Réussi / ❌ Échoué / ⚠️ Partiel
4. **Temps d'exécution :**
5. **Problèmes rencontrés :**
6. **Captures d'écran :**
7. **Commentaires :**

### 16.2 Exemple de Rapport

```
Scénario : 3.1 - Création d'un Employé Complet
Date : 17/01/2024
Testeur : [Nom]
Résultat : ✅ Réussi
Temps : 5 minutes
Problèmes : Aucun
Commentaires : Tous les champs ont été remplis correctement, 
l'employé a été créé avec succès.
```

---

## 17. BUGS CONNUS ET WORKAROUNDS

### 17.1 Bugs Identifiés

| Bug | Description | Workaround | Priorité |
|-----|-------------|------------|----------|
| - | - | - | - |

### 17.2 Améliorations Suggérées

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| - | - | - |

---

## 18. CONCLUSION

Ce document fournit un scénario de test complet et logique pour toutes les interfaces de PointageFlex. Suivez les scénarios dans l'ordre pour une expérience de test cohérente, ou testez des modules spécifiques selon vos besoins.

**Bon test ! 🚀**

---

**Document créé le :** 2025-01-17  
**Version :** 1.0  
**Dernière mise à jour :** 2025-01-17

