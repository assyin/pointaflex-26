# PRESENTATION POINTAFLEX
## Reunion Direction RH & Direction Generale
### Date: 21 Janvier 2026

---

# TABLE DES MATIERES

1. [Introduction & Vision](#1-introduction--vision)
2. [Architecture Globale](#2-architecture-globale)
3. [Flux Complet de Pointage](#3-flux-complet-de-pointage)
4. [Scenarios de Pointage & Anomalies](#4-scenarios-de-pointage--anomalies)
5. [Roles et Profils Utilisateurs](#5-roles-et-profils-utilisateurs)
6. [Modules Fonctionnels](#6-modules-fonctionnels)
7. [Questions pour RH](#7-questions-pour-rh)
8. [Besoins de Deploiement](#8-besoins-de-deploiement)
9. [Planning de Mise en Production](#9-planning-de-mise-en-production)

---

# 1. INTRODUCTION & VISION

## Qu'est-ce que PointaFlex?

**PointaFlex** est une solution SaaS complete de gestion de presence et de temps de travail, developpee pour repondre aux besoins specifiques de votre organisation.

### Objectifs Principaux

```
+------------------------------------------+
|           POINTAFLEX                      |
+------------------------------------------+
|  - Automatiser le suivi de presence      |
|  - Detecter les anomalies en temps reel   |
|  - Simplifier la gestion des plannings    |
|  - Optimiser le suivi des heures supp     |
|  - Faciliter la gestion des conges        |
|  - Fournir des rapports exploitables      |
+------------------------------------------+
```

### Benefices Attendus

| Benefice | Impact |
|----------|--------|
| Gain de temps RH | Reduction de 70% du temps de traitement manuel |
| Precision | Elimination des erreurs de saisie manuelle |
| Conformite | Respect automatique du Code du Travail marocain |
| Transparence | Visibilite temps reel pour tous les niveaux |
| Tracabilite | Historique complet et audit trail |

---

# 2. ARCHITECTURE GLOBALE

## Schema d'Architecture

```
                    +-------------------+
                    |   TERMINAUX       |
                    |   BIOMETRIQUES    |
                    |  (ZKTeco CP/CIT)  |
                    +--------+----------+
                             |
                             | Pointage (Empreinte/Badge)
                             v
+----------------+    +------+-------+    +------------------+
|                |    |              |    |                  |
|  APPLICATION   |<-->|   BACKEND    |<-->|   BASE DE        |
|   WEB/MOBILE   |    |   (API)      |    |   DONNEES        |
|                |    |              |    |   (PostgreSQL)   |
+----------------+    +--------------+    +------------------+
       ^                    |
       |                    v
       |            +-------+--------+
       |            |                |
       +----------->| NOTIFICATIONS  |
                    |    EMAIL       |
                    +----------------+
```

## Composants Techniques

| Composant | Technologie | Role |
|-----------|-------------|------|
| Frontend | Next.js / React | Interface utilisateur web |
| Backend | NestJS / Node.js | API et logique metier |
| Base de donnees | PostgreSQL (Supabase) | Stockage des donnees |
| Terminaux | ZKTeco | Capture biometrique |
| Hebergement | Cloud | Disponibilite 24/7 |

---

# 3. FLUX COMPLET DE POINTAGE

## 3.1 Flux Principal - Du Terminal a l'Application

```
ETAPE 1: POINTAGE PHYSIQUE
==========================

    Employe                    Terminal ZKTeco
       |                            |
       |   [Poser le doigt]         |
       +--------------------------->|
       |                            |
       |   [Validation empreinte]   |
       |<---------------------------+
       |                            |
       |   "Bip" + Affichage        |
       |   "Bonjour Ahmed"          |
       +<---------------------------+


ETAPE 2: TRANSMISSION AU SERVEUR
================================

    Terminal                    Backend PointaFlex
       |                              |
       | [Envoi automatique]          |
       | Matricule: 00123             |
       | Timestamp: 08:05:23          |
       | Type: Entree (IN)            |
       +----------------------------->|
       |                              |
       |   [Reception OK]             |
       |<-----------------------------+


ETAPE 3: TRAITEMENT INTELLIGENT
===============================

    Backend PointaFlex
         |
         v
    +----+----+
    |         |
    | 1. Verification employe existe?        |
    | 2. Anti-rebond (< 2 min = ignore)      |
    | 3. Recuperer planning du jour          |
    | 4. Detecter type: IN ou OUT            |
    | 5. Calculer retard/depart anticipe     |
    | 6. Detecter anomalies                  |
    | 7. Enregistrer en base                 |
    | 8. Notifier si anomalie                |
    |         |
    +---------+


ETAPE 4: RESULTAT
=================

    +------------------------------------------+
    | ENREGISTREMENT CREE                       |
    +------------------------------------------+
    | Employe: Ahmed BENALI                     |
    | Date: 21/01/2026                          |
    | Heure arrivee: 08:05                      |
    | Planning: 08:00 - 17:00                   |
    | Retard: 5 minutes                         |
    | Anomalie: RETARD (tolerance depassee)    |
    +------------------------------------------+
```

## 3.2 Diagramme de Decision du Type de Pointage

```
                    +------------------+
                    | Nouveau Pointage |
                    +--------+---------+
                             |
                             v
                    +--------+---------+
                    | Dernier pointage |
                    | du meme jour?    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
        +-----+-----+                 +-----+-----+
        |    NON    |                 |    OUI    |
        | (Premier) |                 | (Existe)  |
        +-----+-----+                 +-----+-----+
              |                             |
              v                             v
        +-----+-----+               +-------+-------+
        |   TYPE    |               | Dernier type? |
        |   = IN    |               +-------+-------+
        +-----------+                       |
                                 +----------+----------+
                                 |                     |
                                 v                     v
                           +-----+-----+         +-----+-----+
                           | IN        |         | OUT       |
                           +-----+-----+         +-----+-----+
                                 |                     |
                                 v                     v
                           +-----+-----+         +-----+-----+
                           | Nouveau   |         | Nouveau   |
                           | = OUT     |         | = IN      |
                           +-----------+         +-----------+
```

---

# 4. SCENARIOS DE POINTAGE & ANOMALIES

## 4.1 Tableau des Types d'Anomalies

| Code Anomalie | Nom Francais | Description | Gravite | Action Requise |
|---------------|--------------|-------------|---------|----------------|
| `LATE` | RETARD | Arrivee apres l'heure prevue (+ tolerance) | Moyenne | Justification |
| `EARLY_LEAVE` | DEPART ANTICIPE | Depart avant l'heure prevue (- tolerance) | Moyenne | Justification |
| `DOUBLE_IN` | DOUBLE ENTREE | 2 entrees consecutives sans sortie | Haute | Correction |
| `MISSING_IN` | ENTREE MANQUANTE | Sortie sans entree le meme jour | Haute | Correction |
| `MISSING_OUT` | SORTIE MANQUANTE | Entree sans sortie (fin de journee) | Moyenne | Correction auto/manuelle |
| `ABSENCE` | ABSENCE | Planning prevu mais aucun pointage | Haute | Justification |
| `ABSENCE_PARTIAL` | ABSENCE PARTIELLE | Retard > 2 heures | Haute | Justification |
| `WEEKEND_WORK` | TRAVAIL WEEKEND | Pointage samedi/dimanche sans planning | Info | Validation |
| `HOLIDAY_WORKED` | JOUR FERIE TRAVAILLE | Pointage un jour ferie | Info | Validation H.Supp |
| `UNPLANNED_PUNCH` | POINTAGE NON PLANIFIE | Pointage sans planning | Info | Investigation |
| `LEAVE_CONFLICT` | CONFLIT CONGE | Pointage pendant un conge approuve | Haute | Investigation |
| `INSUFFICIENT_REST` | REPOS INSUFFISANT | < 11h entre 2 postes | Critique | Alerte manager |

## 4.2 Scenarios Detailles avec Exemples

### SCENARIO 1: Journee Normale (Sans Anomalie)

```
EMPLOYE: Ahmed BENALI
PLANNING: 08:00 - 12:00 / 14:00 - 17:00
TOLERANCE RETARD: 10 minutes

POINTAGES:
  08:03 [IN]  --> OK (dans tolerance)
  12:05 [OUT] --> OK
  13:58 [IN]  --> OK
  17:02 [OUT] --> OK

RESULTAT:
  - Heures travaillees: 7h 56min
  - Anomalies: AUCUNE
  - Statut: VALIDE
```

### SCENARIO 2: Retard

```
EMPLOYE: Sara ALAMI
PLANNING: 08:00 - 17:00
TOLERANCE RETARD: 10 minutes

POINTAGES:
  08:25 [IN]  --> RETARD (25 min - tolerance 10 = 15 min retard)
  17:00 [OUT] --> OK

RESULTAT:
  - Heures travaillees: 8h 35min
  - Anomalie: RETARD (15 minutes)
  - Action: Notification au manager
  - Statut: EN ATTENTE VALIDATION

+--------------------------------------------+
| NOTIFICATION MANAGER                        |
+--------------------------------------------+
| Sara ALAMI est arrivee avec 15 minutes     |
| de retard le 21/01/2026.                   |
| Heure prevue: 08:00                        |
| Heure reelle: 08:25                        |
+--------------------------------------------+
```

### SCENARIO 3: Depart Anticipe

```
EMPLOYE: Karim FASSI
PLANNING: 08:00 - 17:00
TOLERANCE DEPART: 5 minutes

POINTAGES:
  07:55 [IN]  --> OK
  16:30 [OUT] --> DEPART ANTICIPE (30 min avant)

RESULTAT:
  - Heures travaillees: 8h 35min
  - Anomalie: EARLY_LEAVE (25 minutes)
  - Action: Justification requise
```

### SCENARIO 4: Double Entree (DOUBLE_IN)

```
EMPLOYE: Leila CHRAIBI
PLANNING: 08:00 - 17:00

POINTAGES:
  08:00 [IN]  --> OK
  08:45 [IN]  --> ANOMALIE! Double entree

ANALYSE DU SYSTEME:
  - Derniere action: IN a 08:00
  - Nouvelle action: IN a 08:45
  - Pas de OUT entre les deux
  - DIAGNOSTIC: Oubli de pointer la sortie precedemment

RESULTAT:
  - Anomalie: DOUBLE_IN
  - Suggestions:
    1. Supprimer le premier IN
    2. Supprimer le deuxieme IN
    3. Ajouter un OUT entre les deux

+--------------------------------------------+
| CORRECTION PROPOSEE PAR LE SYSTEME         |
+--------------------------------------------+
| Option recommandee: Ajouter OUT a 08:40    |
| (basee sur l'historique de l'employe)      |
| Confiance: 85%                             |
+--------------------------------------------+
```

### SCENARIO 5: Entree Manquante (MISSING_IN)

```
EMPLOYE: Omar BENJELLOUN
PLANNING: 08:00 - 17:00

POINTAGES:
  17:00 [OUT] --> ANOMALIE! Pas d'entree ce jour

ANALYSE:
  - Aucun IN enregistre pour le 21/01/2026
  - OUT a 17:00 sans IN correspondant

RESULTAT:
  - Anomalie: MISSING_IN
  - Possibilites:
    1. L'employe a oublie de pointer a l'entree
    2. Probleme technique au matin
    3. L'employe est entre par une autre porte

+--------------------------------------------+
| CORRECTION REQUISE                          |
+--------------------------------------------+
| Veuillez saisir l'heure d'entree:          |
| Suggestion: 08:00 (heure du planning)       |
| Confiance: 70%                             |
+--------------------------------------------+
```

### SCENARIO 6: Sortie Manquante (MISSING_OUT)

```
EMPLOYE: Fatima ZAHRA
PLANNING: 08:00 - 17:00

POINTAGES:
  08:00 [IN]  --> OK
  (Aucune sortie enregistree)

DETECTION:
  - Job nocturne a minuit detecte MISSING_OUT
  - Derniere action: IN a 08:00
  - Pas de OUT jusqu'a 23:59

RESULTAT:
  - Anomalie: MISSING_OUT
  - Action: Notification envoyee au manager

+--------------------------------------------+
| NOTIFICATION AUTOMATIQUE                    |
+--------------------------------------------+
| Fatima ZAHRA n'a pas pointe sa sortie      |
| le 21/01/2026.                             |
| Derniere action: Entree a 08:00            |
+--------------------------------------------+
```

### SCENARIO 7: Shift de Nuit (Cas Special)

```
EMPLOYE: Hassan MOUHIM
PLANNING NUIT: 22:00 - 06:00

POINTAGES:
  21/01/2026 22:05 [IN]  --> OK
  22/01/2026 06:10 [OUT] --> OK (lendemain)

ANALYSE INTELLIGENTE:
  - Entree: 21/01 a 22:05
  - Sortie: 22/01 a 06:10 (jour suivant)
  - Le systeme detecte le shift de nuit
  - Pas d'anomalie MISSING_IN pour la sortie du 22

RESULTAT:
  - Heures travaillees: 8h 05min
  - Anomalies: AUCUNE
  - Le systeme gere correctement le passage minuit
```

### SCENARIO 8: Travail le Weekend

```
EMPLOYE: Youssef KADIRI
PLANNING SEMAINE: Lundi-Vendredi
CONFIGURATION: workingDays = [1,2,3,4,5]

POINTAGES SAMEDI:
  09:00 [IN]  --> ANOMALIE
  14:00 [OUT] --> ANOMALIE

ANALYSE:
  - Samedi n'est pas un jour ouvre
  - Pas de planning explicite pour ce jour
  - Pas de conge recuperation approuve

RESULTAT:
  - Anomalie: WEEKEND_WORK
  - Action: Validation RH requise
  - Question: Heures supplementaires? Mission?
```

### SCENARIO 9: Conge vs Pointage (Conflit)

```
EMPLOYE: Nadia BENCHEKROUN
CONGE APPROUVE: 20/01 au 24/01/2026

POINTAGE DETECTE:
  21/01/2026 09:00 [IN]

ANALYSE:
  - Conge en cours du 20 au 24
  - Pointage detecte le 21

RESULTAT:
  - Anomalie: LEAVE_CONFLICT
  - Questions:
    1. Retour anticipe de conge?
    2. Erreur dans les dates de conge?
    3. Pointage par erreur?
```

### SCENARIO 10: Pause Dejeuner Implicite

```
EMPLOYE: Rachid TAZI
PLANNING: 08:00 - 17:00 (pause 12:00-14:00)
CONFIG: allowImplicitBreaks = true

POINTAGES:
  08:00 [IN]  --> OK
  12:15 [OUT] --> Debut pause (detecte automatiquement)
  13:45 [IN]  --> Fin pause (1h30 = dans fenetre 15min-3h)
  17:00 [OUT] --> OK

ANALYSE INTELLIGENTE:
  - OUT a 12:15, IN a 13:45 = 1h30 d'ecart
  - Fenetre pause: 15min - 3h
  - Le systeme detecte une pause implicite
  - PAS d'anomalie EARLY_LEAVE pour le OUT de 12:15

RESULTAT:
  - Heures travaillees: 8h (7h effectives)
  - Pause: 1h30
  - Anomalies: AUCUNE
```

## 4.3 Diagramme de Detection des Anomalies

```
                        +-------------------+
                        | NOUVEAU POINTAGE  |
                        +--------+----------+
                                 |
                                 v
                        +--------+----------+
                        | Pendant un conge? |
                        +--------+----------+
                                 |
                    +------------+------------+
                    |                         |
                    v                         v
              +-----+-----+            +------+------+
              |    OUI    |            |     NON    |
              +-----+-----+            +------+------+
                    |                         |
                    v                         v
            +-------+-------+        +--------+--------+
            | LEAVE_CONFLICT|        | Type = IN?      |
            +---------------+        +--------+--------+
                                             |
                              +--------------+--------------+
                              |                             |
                              v                             v
                        +-----+-----+                 +-----+-----+
                        |    OUI    |                 |    NON    |
                        | (Entree)  |                 |  (Sortie) |
                        +-----+-----+                 +-----+-----+
                              |                             |
                              v                             v
                    +---------+---------+         +---------+---------+
                    | Dernier = IN?     |         | Entree ce jour?   |
                    +---------+---------+         +---------+---------+
                              |                             |
               +--------------+                  +----------+----------+
               |              |                  |                     |
               v              v                  v                     v
         +-----+----+   +-----+----+       +-----+----+          +-----+----+
         |   OUI   |   |   NON    |       |   OUI   |          |   NON    |
         +-----+----+   +----------+       +----------+          +-----+----+
               |                                                       |
               v                                                       v
         +-----+-------+                                    +----------+--------+
         | DOUBLE_IN   |                                    | MISSING_IN        |
         +-------------+                                    +-------------------+
```

---

# 5. ROLES ET PROFILS UTILISATEURS

## 5.1 Hierarchie des Roles

```
                    +------------------+
                    |   SUPER_ADMIN    |
                    | (Administrateur  |
                    |    Systeme)      |
                    +--------+---------+
                             |
                             v
                    +--------+---------+
                    |    ADMIN_RH      |
                    | (Administrateur  |
                    |      RH)         |
                    +--------+---------+
                             |
                             v
                    +--------+---------+
                    |     MANAGER      |
                    |  (Responsable    |
                    |   d'equipe)      |
                    +--------+---------+
                             |
                             v
                    +--------+---------+
                    |    EMPLOYEE      |
                    |   (Employe)      |
                    +------------------+
```

## 5.2 Matrice des Permissions par Role

### SUPER_ADMIN (77 permissions)
| Module | Permissions |
|--------|-------------|
| Employes | Voir tous, Creer, Modifier, Supprimer, Importer, Exporter |
| Pointages | Voir tous, Corriger, Valider, Supprimer, Exporter |
| Plannings | Creer, Modifier, Supprimer pour tous |
| Conges | Voir tous, Approuver, Rejeter, Gerer types |
| H. Supplementaires | Voir tous, Approuver, Convertir |
| Rapports | Tous les rapports, Export |
| Parametres | Configuration complete du systeme |
| Utilisateurs | Creer, Modifier, Supprimer, Assigner roles |

### ADMIN_RH (68 permissions)
| Module | Permissions |
|--------|-------------|
| Employes | Voir tous, Creer, Modifier, Supprimer, Importer, Exporter |
| Pointages | Voir tous, Corriger, Valider, Exporter |
| Plannings | Creer, Modifier, Supprimer pour tous |
| Conges | Voir tous, Approuver, Rejeter |
| H. Supplementaires | Voir tous, Approuver |
| Rapports | Tous les rapports, Export |
| Parametres | Sites, Departements, Equipes, Jours feries |

### MANAGER (19 permissions)
| Module | Permissions |
|--------|-------------|
| Employes | Voir son equipe uniquement |
| Pointages | Voir equipe, Corriger equipe, Voir anomalies |
| Plannings | Creer/Modifier pour son equipe |
| Conges | Voir equipe, Approuver/Rejeter equipe |
| H. Supplementaires | Voir equipe, Approuver equipe |
| Rapports | Rapports equipe, Export |

### EMPLOYEE (9 permissions)
| Module | Permissions |
|--------|-------------|
| Profil | Voir ses informations |
| Pointages | Voir ses pointages, Pointer (IN/OUT) |
| Planning | Voir son planning |
| Conges | Demander, Modifier sa demande |
| H. Supplementaires | Voir ses heures |
| Rapports | Voir son rapport presence |

## 5.3 Cas d'Utilisation par Role

### EMPLOYE: Journee Type
```
1. Arrivee au bureau
   --> Pointer sur le terminal
   --> Verification sur l'application (optionnel)

2. Consultation de son planning
   --> Voir les horaires de la semaine
   --> Voir les jours de conge

3. Demande de conge
   --> Soumettre une demande
   --> Joindre un justificatif si besoin
   --> Suivre le statut

4. Fin de journee
   --> Pointer la sortie
   --> Verifier ses heures sur l'application
```

### MANAGER: Journee Type
```
1. Matin: Consultation du tableau de bord
   --> Voir qui est present/absent
   --> Voir les alertes (retards, anomalies)

2. Traitement des demandes
   --> Approuver/Rejeter les conges
   --> Valider les heures supplementaires
   --> Corriger les anomalies de pointage

3. Planification
   --> Creer/Modifier les plannings de l'equipe
   --> Gerer les remplacements

4. Rapports
   --> Exporter le rapport hebdomadaire
   --> Analyser les tendances
```

### ADMIN RH: Taches Principales
```
1. Gestion des employes
   --> Creer nouveaux employes
   --> Enroler les empreintes
   --> Affecter aux equipes/sites

2. Configuration
   --> Definir les shifts (horaires)
   --> Gerer les jours feries
   --> Parametrer les tolerances

3. Supervision globale
   --> Voir toutes les anomalies
   --> Generer les rapports de paie
   --> Exporter les donnees

4. Support
   --> Corriger les erreurs de pointage
   --> Gerer les cas speciaux
```

---

# 6. MODULES FONCTIONNELS

## 6.1 Vue d'Ensemble des Modules

```
+------------------------------------------------------------------+
|                         POINTAFLEX                                |
+------------------------------------------------------------------+
|                                                                   |
|  +------------+  +------------+  +------------+  +------------+   |
|  |            |  |            |  |            |  |            |   |
|  | DASHBOARD  |  | POINTAGE   |  | PLANNING   |  |  CONGES    |   |
|  |            |  |            |  |            |  |            |   |
|  +------------+  +------------+  +------------+  +------------+   |
|                                                                   |
|  +------------+  +------------+  +------------+  +------------+   |
|  |  HEURES    |  |            |  |            |  |            |   |
|  |  SUPP.     |  | RAPPORTS   |  | EMPLOYES   |  | TERMINAUX  |   |
|  |            |  |            |  |            |  |            |   |
|  +------------+  +------------+  +------------+  +------------+   |
|                                                                   |
|  +------------+  +------------+  +------------+  +------------+   |
|  | STRUCTURE  |  |            |  |  EMAILS &  |  |            |   |
|  |    RH      |  | PARAMETRES |  |  NOTIFS    |  |   AUDIT    |   |
|  |            |  |            |  |            |  |            |   |
|  +------------+  +------------+  +------------+  +------------+   |
|                                                                   |
+------------------------------------------------------------------+
```

## 6.2 Detail des Modules

### MODULE 1: DASHBOARD (Tableau de Bord)

**Description:** Vue d'ensemble en temps reel de la situation

**Fonctionnalites:**
- Statistiques de presence du jour
- Alertes et anomalies en cours
- Graphiques de tendances
- Acces rapide aux actions urgentes

**Metriques Affichees:**
```
+------------------+  +------------------+  +------------------+
|   PRESENTS       |  |   ABSENTS        |  |   EN RETARD      |
|      45          |  |       3          |  |       2          |
|    (93.7%)       |  |    (6.3%)        |  |    (4.2%)        |
+------------------+  +------------------+  +------------------+

+------------------+  +------------------+  +------------------+
|   EN CONGE       |  |   ANOMALIES      |  |   H. SUPP        |
|       5          |  |       7          |  |     12.5h        |
|                  |  |  A traiter       |  |  Cette semaine   |
+------------------+  +------------------+  +------------------+
```

### MODULE 2: POINTAGE (Attendance)

**Description:** Gestion complete des pointages et anomalies

**Fonctionnalites:**
- Vue liste des pointages
- Filtres avances (date, employe, site, anomalie)
- Correction des anomalies
- Validation en masse
- Export Excel/CSV
- Historique des modifications

**Interface:**
```
+--------------------------------------------------------------------+
| POINTAGES DU 21/01/2026                            [Exporter] [+]  |
+--------------------------------------------------------------------+
| Filtre: [Tous les sites v] [Tous les dept v] [Toutes anomalies v]  |
+--------------------------------------------------------------------+
| Employe      | Entree  | Sortie  | Heures  | Anomalie    | Action  |
+--------------------------------------------------------------------+
| Ahmed B.     | 08:05   | 17:02   | 8h 57m  | -           | [Voir]  |
| Sara A.      | 08:25   | 17:00   | 8h 35m  | RETARD      | [Corr.] |
| Karim F.     | 07:55   | 16:30   | 8h 35m  | DEPART ANT. | [Corr.] |
| Leila C.     | 08:00   | -       | -       | MISSING_OUT | [Corr.] |
+--------------------------------------------------------------------+
```

### MODULE 3: PLANNING (Schedules)

**Description:** Creation et gestion des plannings

**Fonctionnalites:**
- Vue calendrier (jour/semaine/mois)
- Creation de planning individuel ou en masse
- Affectation des shifts
- Gestion des remplacements
- Suspension automatique pendant les conges

**Vues Disponibles:**
```
VUE SEMAINE:
+-------+-------+-------+-------+-------+-------+-------+
|  Lun  |  Mar  |  Mer  |  Jeu  |  Ven  |  Sam  |  Dim  |
+-------+-------+-------+-------+-------+-------+-------+
| 08-17 | 08-17 | 08-17 | 08-17 | 08-17 |  ---  |  ---  |
+-------+-------+-------+-------+-------+-------+-------+

VUE EQUIPE:
+----------+-------+-------+-------+-------+-------+
| Employe  |  Lun  |  Mar  |  Mer  |  Jeu  |  Ven  |
+----------+-------+-------+-------+-------+-------+
| Ahmed    | Matin | Matin | Matin | Matin | Matin |
| Sara     | Soir  | Soir  | Soir  | Repos | Repos |
| Karim    | Nuit  | Nuit  | Repos | Nuit  | Nuit  |
+----------+-------+-------+-------+-------+-------+
```

### MODULE 4: CONGES (Leaves)

**Description:** Gestion complete du cycle des conges

**Types de Conges:**
- Conge annuel
- Conge maladie
- Conge maternite/paternite
- Conge sans solde
- Recuperation
- Mission
- Teletravail

**Workflow:**
```
   EMPLOYE                MANAGER               ADMIN RH
      |                      |                      |
      | Demande conge        |                      |
      +--------------------->|                      |
      |                      |                      |
      |                      | Approuve/Rejette     |
      |                      +--------------------->|
      |                      |                      |
      |                      |                      | (Si rejet manager)
      |                      |<---------------------+ Validation finale
      |                      |                      |
      |<---------------------+                      |
      | Notification                                |
```

### MODULE 5: HEURES SUPPLEMENTAIRES (Overtime)

**Description:** Suivi et validation des heures supplementaires

**Fonctionnalites:**
- Detection automatique des heures supp
- Seuil configurable (ex: > 30 min apres la fin)
- Workflow d'approbation
- Conversion en jours de recuperation
- Calcul des majorations

**Taux de Majoration (Code du Travail Marocain):**
```
+----------------------------------+
| JOUR NORMAL                       |
| 6h-21h: +25%                      |
| 21h-6h: +50%                      |
+----------------------------------+
| WEEKEND / JOUR FERIE              |
| 6h-21h: +50%                      |
| 21h-6h: +100%                     |
+----------------------------------+
```

### MODULE 6: RAPPORTS (Reports)

**Description:** Generation de rapports et analyses

**Types de Rapports:**
- Rapport de presence journalier
- Rapport de presence mensuel
- Rapport des anomalies
- Rapport des heures supplementaires
- Rapport des absences
- Rapport pour la paie
- Rapport personnalise

**Formats d'Export:**
- Excel (.xlsx)
- CSV
- PDF (a venir)

### MODULE 7: GESTION DES EMPLOYES

**Description:** Administration du personnel

**Fonctionnalites:**
- Fiche employe complete
- Enrolement biometrique
- Affectation site/departement/equipe
- Historique des modifications
- Import/Export en masse

### MODULE 8: TERMINAUX (Devices)

**Description:** Gestion des pointeuses biometriques

**Fonctionnalites:**
- Configuration des terminaux
- Surveillance de l'etat de connexion
- Liste blanche IP
- Logs d'audit des communications
- Synchronisation des employes

### MODULE 9: STRUCTURE RH

**Description:** Organisation de l'entreprise

**Elements:**
- Sites (localisations)
- Departements
- Equipes
- Postes/Fonctions
- Hierarchie manageriale

### MODULE 10: NOTIFICATIONS EMAIL

**Description:** Alertes automatiques par email

**Notifications Disponibles:**
- Retard detecte
- Absence detectee
- Sortie manquante
- Demande de conge a approuver
- Heures supp a valider
- Pointage en anomalie

---

# 7. QUESTIONS POUR RH

## 7.1 Questions sur les Regles Metier

### TOLERANCES ET SEUILS

| # | Question | Options Suggerees | Decision |
|---|----------|-------------------|----------|
| 1 | Quelle tolerance pour les retards? | 5 min / 10 min / 15 min | _________ |
| 2 | Quelle tolerance pour les departs anticipes? | 5 min / 10 min / 15 min | _________ |
| 3 | A partir de combien d'heures de retard considere-t-on une demi-journee d'absence? | 2h / 3h / 4h | _________ |
| 4 | Fenetre anti-rebond (ignorer double pointage)? | 2 min / 4 min / 5 min | _________ |

### HEURES SUPPLEMENTAIRES

| # | Question | Options Suggerees | Decision |
|---|----------|-------------------|----------|
| 5 | A partir de combien de minutes apres la fin du shift compte-t-on les heures supp? | 15 min / 30 min / 45 min | _________ |
| 6 | Applique-t-on les majorations legales (25%, 50%, 100%)? | Oui / Non / Personnalise | _________ |
| 7 | Les heures supp du weekend sont-elles automatiquement majorees? | Oui / Non | _________ |
| 8 | Peut-on convertir les heures supp en jours de recuperation? | Oui / Non | _________ |
| 9 | Si oui, quel est le taux de conversion? | 1:1 / 1:1.25 / 1:1.5 | _________ |

### PAUSES

| # | Question | Options Suggerees | Decision |
|---|----------|-------------------|----------|
| 10 | Les employes doivent-ils pointer pour la pause dejeuner? | Oui (explicite) / Non (implicite) | _________ |
| 11 | Si implicite, quelle duree standard de pause? | 1h / 1h30 / 2h | _________ |
| 12 | Fenetre de pause autorisee? | 11h-14h / 12h-14h / 12h-15h | _________ |

### REPOS MINIMUM

| # | Question | Options Suggerees | Decision |
|---|----------|-------------------|----------|
| 13 | Respecte-t-on le repos minimum entre 2 postes (11h legales)? | Oui strict / Oui avec alertes / Non | _________ |
| 14 | Pour les shifts de nuit, repos minimum different? | 11h / 12h / 13h | _________ |
| 15 | Que faire en cas de non-respect? | Bloquer / Alerter / Ignorer | _________ |

### SHIFTS DE NUIT

| # | Question | Options Suggerees | Decision |
|---|----------|-------------------|----------|
| 16 | Avez-vous des shifts de nuit (passage minuit)? | Oui / Non | _________ |
| 17 | Si oui, quels sont les horaires types? | 22h-6h / 20h-4h / Autre | _________ |
| 18 | Prime de nuit applicable? | Oui / Non | _________ |

## 7.2 Questions sur le Workflow

### APPROBATIONS

| # | Question | Options Suggerees | Decision |
|---|----------|-------------------|----------|
| 19 | Qui approuve les conges? | Manager seul / Manager + RH / RH seul | _________ |
| 20 | Qui approuve les heures supp? | Manager seul / Manager + RH / RH seul | _________ |
| 21 | Qui peut corriger les anomalies? | Manager / RH / Les deux | _________ |
| 22 | Delai maximum pour corriger une anomalie? | 24h / 48h / 1 semaine | _________ |

### NOTIFICATIONS

| # | Question | Options Suggerees | Decision |
|---|----------|-------------------|----------|
| 23 | Notifier le manager en cas de retard? | Immediat / Fin de journee / Non | _________ |
| 24 | Notifier le manager en cas d'absence? | A 9h / A 10h / Fin de journee | _________ |
| 25 | Notifier l'employe de ses propres anomalies? | Oui / Non | _________ |
| 26 | Escalade a RH si non traite sous X jours? | 2 jours / 3 jours / 5 jours | _________ |

## 7.3 Questions sur l'Organisation

### STRUCTURE

| # | Question | Reponse |
|---|----------|---------|
| 27 | Combien de sites/localisations? | _________ |
| 28 | Combien de departements? | _________ |
| 29 | Combien d'equipes? | _________ |
| 30 | Combien de managers (responsables)? | _________ |
| 31 | Un manager peut-il gerer plusieurs sites? | _________ |
| 32 | Hierarchie: Site > Departement > Equipe? | _________ |

### SHIFTS

| # | Question | Reponse |
|---|----------|---------|
| 33 | Combien de types de shifts differents? | _________ |
| 34 | Horaires du shift "Matin"? | _________ |
| 35 | Horaires du shift "Apres-midi"? | _________ |
| 36 | Horaires du shift "Nuit" (si applicable)? | _________ |
| 37 | Y a-t-il des shifts speciaux (weekend, feries)? | _________ |

## 7.4 Questions sur les Cas Speciaux

| # | Question | Options | Decision |
|---|----------|---------|----------|
| 38 | Que faire si un employe pointe pendant son conge? | Annuler conge / Alerter / Ignorer | _________ |
| 39 | Autoriser le teletravail? | Oui / Non | _________ |
| 40 | Si oui, comment pointer en teletravail? | App mobile / Pas de pointage / Horaire fixe | _________ |
| 41 | Autoriser les missions externes? | Oui / Non | _________ |
| 42 | Si oui, comment gerer le pointage en mission? | Declaration / Pas de pointage | _________ |
| 43 | Que faire pour un oubli de pointage repete? | Avertissement / Sanction auto / Rien | _________ |

---

# 8. BESOINS DE DEPLOIEMENT

## 8.1 Infrastructure Technique

### MATERIEL REQUIS

```
+------------------------------------------------------------------+
|                    INFRASTRUCTURE TECHNIQUE                        |
+------------------------------------------------------------------+

TERMINAUX BIOMETRIQUES (Deja en place)
+------------------------+
| Terminal CP (ZKTeco)   |  IP: 192.168.16.174
| Terminal CIT (ZKTeco)  |  IP: 192.168.16.175
+------------------------+
        |
        | Reseau local
        v
+------------------------+
| SERVEUR / CLOUD        |
| - Backend API          |
| - Base de donnees      |
| - Interface Web        |
+------------------------+
        |
        | Internet
        v
+------------------------+
| UTILISATEURS           |
| - Navigateur Web       |
| - (Futur: App Mobile)  |
+------------------------+
```

### CONFIGURATION RESEAU

| Element | Requis | Statut |
|---------|--------|--------|
| IP fixe pour terminaux | Oui | OK |
| Acces reseau local -> serveur | Oui | A verifier |
| Port 3000 ouvert (API) | Oui | A configurer |
| Port 3001 ouvert (Frontend) | Oui | A configurer |
| Certificat SSL (HTTPS) | Recommande | A obtenir |
| Nom de domaine | Recommande | A definir |

### OPTIONS D'HEBERGEMENT

| Option | Avantages | Inconvenients | Cout Estime |
|--------|-----------|---------------|-------------|
| **Serveur Local** | Controle total, Pas de latence | Maintenance, Securite | Materiel + Electricite |
| **Cloud (Supabase)** | Scalable, Backups auto | Dependance Internet | ~50-200 MAD/mois |
| **VPS (OVH, Hetzner)** | Equilibre cout/controle | Config manuelle | ~100-300 MAD/mois |

## 8.2 Formation

### PLAN DE FORMATION

```
+------------------------------------------------------------------+
|                      PLAN DE FORMATION                            |
+------------------------------------------------------------------+

PHASE 1: ADMINISTRATEURS (2 jours)
+------------------------------------------------------------------+
| Jour 1: Configuration                                             |
| - Parametrage du systeme                                          |
| - Gestion des employes                                            |
| - Configuration des shifts                                        |
| - Gestion des terminaux                                           |
+------------------------------------------------------------------+
| Jour 2: Operations avancees                                       |
| - Gestion des anomalies                                           |
| - Rapports et exports                                             |
| - Cas speciaux et troubleshooting                                 |
+------------------------------------------------------------------+

PHASE 2: MANAGERS (1 jour)
+------------------------------------------------------------------+
| - Tableau de bord manager                                         |
| - Validation des anomalies                                        |
| - Approbation conges et heures supp                               |
| - Creation de plannings                                           |
| - Generation de rapports equipe                                   |
+------------------------------------------------------------------+

PHASE 3: EMPLOYES (2 heures)
+------------------------------------------------------------------+
| - Utilisation du terminal                                         |
| - Consultation de son planning                                    |
| - Demande de conge                                                |
| - Verification de ses pointages                                   |
+------------------------------------------------------------------+
```

### SUPPORTS DE FORMATION

| Support | Description | Format |
|---------|-------------|--------|
| Guide Utilisateur Employe | Manuel simple de 10 pages | PDF |
| Guide Manager | Manuel intermediaire de 20 pages | PDF |
| Guide Admin RH | Manuel complet de 50 pages | PDF |
| Videos tutorielles | 10 videos courtes (2-5 min) | MP4/YouTube |
| FAQ | Questions frequentes | Web |
| Support en ligne | Chat/Email | Continu |

## 8.3 Ressources Humaines pour le Deploiement

### EQUIPE PROJET

| Role | Responsabilite | Profil |
|------|----------------|--------|
| **Chef de Projet** | Coordination, Planning | RH Senior / IT Manager |
| **Admin Systeme** | Configuration technique | IT |
| **Referent RH** | Regles metier, Validation | RH |
| **Super Utilisateur** | Formation, Support N1 | RH / Manager |

### PLANNING RESSOURCES

```
SEMAINE 1: Preparation
+------------------------------------------------------------------+
| - Installation/Configuration serveur        | Admin Systeme (3j) |
| - Configuration terminaux                   | Admin Systeme (1j) |
| - Import des employes                       | Admin + RH (1j)    |
| - Creation des shifts et plannings          | RH (2j)            |
+------------------------------------------------------------------+

SEMAINE 2: Tests
+------------------------------------------------------------------+
| - Tests avec groupe pilote (10 employes)    | Equipe (5j)        |
| - Correction des anomalies                  | Admin + RH (3j)    |
| - Ajustements parametres                    | Admin (2j)         |
+------------------------------------------------------------------+

SEMAINE 3: Formation
+------------------------------------------------------------------+
| - Formation Admins                          | (2j)               |
| - Formation Managers                        | (1j)               |
| - Formation Employes (par groupes)          | (2j)               |
+------------------------------------------------------------------+

SEMAINE 4: Go Live
+------------------------------------------------------------------+
| - Deploiement general                       | Equipe (1j)        |
| - Support intensif                          | Equipe (5j)        |
| - Suivi et ajustements                      | Continu            |
+------------------------------------------------------------------+
```

## 8.4 Checklist Pre-Deploiement

### TECHNIQUE

- [ ] Terminaux configures et connectes
- [ ] Serveur installe et accessible
- [ ] Base de donnees configuree
- [ ] Certificat SSL installe
- [ ] Backup automatique configure
- [ ] Tests de charge effectues

### DONNEES

- [ ] Liste des employes prete (Excel)
- [ ] Empreintes enrollees sur terminaux
- [ ] Structure organisationnelle definie
- [ ] Shifts/Horaires definis
- [ ] Jours feries 2026 saisis
- [ ] Plannings initiaux crees

### HUMAIN

- [ ] Responsable projet designe
- [ ] Admins formes
- [ ] Managers formes
- [ ] Communication aux employes effectuee
- [ ] Support de niveau 1 identifie

### DOCUMENTATION

- [ ] Guides utilisateurs disponibles
- [ ] FAQ preparee
- [ ] Procedure de secours documentee
- [ ] Contacts support communiques

---

# 9. PLANNING DE MISE EN PRODUCTION

## 9.1 Timeline Suggeree

```
+------------------------------------------------------------------+
|                    ROADMAP DEPLOIEMENT                            |
+------------------------------------------------------------------+

JANVIER 2026
+------------------------------------------------------------------+
| S3 (20-24): Finalisation technique & Tests internes              |
| S4 (27-31): Import donnees & Configuration                       |
+------------------------------------------------------------------+

FEVRIER 2026
+------------------------------------------------------------------+
| S1 (03-07): Groupe pilote (10-15 employes)                       |
| S2 (10-14): Corrections & Formations                             |
| S3 (17-21): Deploiement progressif (50% employes)                |
| S4 (24-28): Deploiement complet (100% employes)                  |
+------------------------------------------------------------------+

MARS 2026
+------------------------------------------------------------------+
| S1 (03-07): Stabilisation & Support intensif                     |
| S2-S4: Mode operationnel normal                                  |
+------------------------------------------------------------------+
```

## 9.2 Indicateurs de Succes (KPIs)

| KPI | Objectif | Mesure |
|-----|----------|--------|
| Taux de pointage | > 95% | Pointages / Jours travailles |
| Anomalies corrigees < 24h | > 90% | Anomalies traitees / Total |
| Satisfaction utilisateur | > 80% | Enquete |
| Temps traitement RH | -50% | Comparaison avant/apres |
| Erreurs de paie | -80% | Erreurs liees aux heures |

## 9.3 Risques et Mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| Resistance au changement | Moyenne | Haut | Communication, Formation |
| Problemes techniques | Faible | Haut | Tests, Support reactif |
| Donnees incorrectes | Moyenne | Moyen | Validation pre-import |
| Surcharge support | Haute | Moyen | Formation approfondie |
| Panne terminal | Faible | Haut | Terminal de backup |

---

# ANNEXES

## A. Glossaire

| Terme | Definition |
|-------|------------|
| **Anomalie** | Ecart detecte entre le pointage et les regles definies |
| **Shift** | Plage horaire de travail definie (ex: 8h-17h) |
| **Planning** | Affectation d'un shift a un employe pour une date |
| **Pointage** | Enregistrement d'entree ou sortie d'un employe |
| **Terminal** | Appareil biometrique de pointage |
| **Tenant** | Organisation/Entreprise dans le systeme multi-tenant |
| **RBAC** | Role-Based Access Control (Controle d'acces par roles) |

## B. Contacts

| Role | Nom | Email | Tel |
|------|-----|-------|-----|
| Support Technique | _________ | _________ | _________ |
| Admin RH | _________ | _________ | _________ |
| Chef de Projet | _________ | _________ | _________ |

## C. Documents Associes

- Guide Utilisateur Employe (a creer)
- Guide Manager (a creer)
- Guide Admin RH (a creer)
- Specifications Techniques
- PV de Reception

---

**Document prepare pour la reunion du 21/01/2026**

*PointaFlex - Solution de Gestion de Presence*
