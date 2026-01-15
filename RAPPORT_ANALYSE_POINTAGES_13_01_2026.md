# RAPPORT D'ANALYSE - POINTAGES DU 13/01/2026

**Date d'analyse:** 13 janvier 2026 - 21:45
**Analyste:** Claude Code
**Tenant:** 340a6c2a-160e-4f4b-917e-6eea8fd5ff2d

---

## 1. RESUME GLOBAL

| Metrique | Valeur |
|----------|--------|
| **Total pointages** | 251 |
| **Employes concernes** | 134 |
| **Entrees (IN)** | 139 |
| **Sorties (OUT)** | 112 |
| **Premier pointage** | 02:41:33 |
| **Dernier pointage** | 20:16:41 |

### Repartition par Terminal

| Terminal | Device ID | Pointages | Pourcentage |
|----------|-----------|-----------|-------------|
| Pointeuse CIT | EJB8241100244 | 153 | 61% |
| Pointeuse CP | EJB8241100241 | 98 | 39% |

### Anomalies detectees

| Type d'anomalie | Nombre |
|-----------------|--------|
| MISSING_OUT | 138 |
| EARLY_LEAVE | 23 |
| ABSENCE_PARTIAL | 1 |
| DEBOUNCE_BLOCKED | 1 |
| Sans anomalie | 88 |

---

## 2. PROBLEMES CRITIQUES IDENTIFIES

### 2.1. FAUSSES ANOMALIES "MISSING_OUT" (PROBLEME MAJEUR)

#### Statistiques
- Total anomalies MISSING_OUT : **138**
- Avec sortie correspondante (FAUX POSITIFS) : **112 (81%)**
- Sans sortie reelle (VRAIS POSITIFS) : **26 (19%)**

#### Cause du probleme
Le systeme marque **chaque entree (IN)** comme `MISSING_OUT` au moment de l'enregistrement, mais **ne supprime pas l'anomalie quand la sortie (OUT) arrive plus tard**.

#### Exemples concrets

| Employe | Matricule | Sequence | Anomalie detectee | Realite |
|---------|-----------|----------|-------------------|---------|
| Marouane ACHOUBA | 01270 | IN 05:38 → OUT 17:36 | MISSING_OUT sur IN | Pattern parfait |
| Mohammed Amine BANANE | 01045 | IN 05:22 → OUT 18:19 | MISSING_OUT sur IN | Pattern parfait |
| Radouane JANDOUR | 01096 | IN 05:43 → OUT 07:35 → IN 17:15 → OUT 19:34 | 2x MISSING_OUT | 2 paires IN-OUT valides |
| M'hammed LAABID | 01688 | IN 06:21 → OUT 15:53 | MISSING_OUT sur IN | Pattern parfait |

#### Impact
- **81% des anomalies MISSING_OUT sont des faux positifs**
- Les managers voient des anomalies qui n'existent pas
- Perte de confiance dans le systeme

---

### 2.2. PAUSES DEJEUNER DETECTEES COMME "EARLY_LEAVE"

#### Statistiques
- Total anomalies EARLY_LEAVE : **23**

#### Probleme
Le systeme detecte incorrectement les **sorties de pause dejeuner** comme des departs anticipes.

#### Exemples

| Employe | Matricule | Sequence | Anomalie sur |
|---------|-----------|----------|--------------|
| Mohammed ELALAMI | 02255 | IN 05:55 → **OUT 12:32** → IN 13:24 | OUT 12:32 = EARLY_LEAVE |
| Ilyass AJANA | 03243 | IN ?? → **OUT 13:06** → IN ?? | OUT 13:06 = EARLY_LEAVE |

La sortie a 12:32 n'est PAS un depart anticipe mais une **pause dejeuner** (retour a 13:24).

#### Liste des EARLY_LEAVE detectes

| Matricule | Nom | Heure sortie |
|-----------|-----|--------------|
| 02140 | Ismail FOUAD | 06:00 |
| 02573 | Imad BENLKORCHI | 06:31 |
| 01096 | Radouane JANDOUR | 07:35 |
| 02255 | Mohammed ELALAMI | 12:32 |
| 03243 | Ilyass AJANA | 13:06 |
| 01066 | Hamid EL MEKKAOUI | 13:32 |
| 01019 | Mounir SMIRI | 13:37 |
| 02068 | Abdelkader LAGHRARI | 13:44 |
| 03255 | Mohammed EL KORCHI | 13:46 |
| 02050 | Mohamed HARMOUD | 14:02 |
| 01059 | Abdessamad ESSADI | 14:07 |
| 02276 | Abderrahim ISTIBCHAR | 14:07 |
| 02649 | Mohammed BELABEID | 14:08 |
| 03253 | Omar BELFKIR | 14:14 |
| 03070 | Majd EZZEMMOURI | 14:21 |
| 02424 | Mohamed MAJID | 14:39 |
| 02308 | Rachid BARKA | 14:42 |
| 01010 | El Mouloudi LAAROUSSI | 14:48 |
| 1091 | YASSINE AIT SAID | 15:00 |
| 01283 | Abdelilah ALOUANE | 15:00 |
| 02693 | Ilyass NAJED | 15:00 |
| 01170 | Ahmed EL MOUKET | 15:00 |
| 02626 | Oussama EL HASSANI | 15:02 |

---

### 2.3. POINTAGES SUSPECTS (Intervalles tres courts)

Ces pointages ont des intervalles anormalement courts, indiquant probablement des erreurs:

| Employe | Matricule | Type 1 | Heure 1 | Type 2 | Heure 2 | Intervalle | Probleme probable |
|---------|-----------|--------|---------|--------|---------|------------|-------------------|
| YASSINE AIT SAID | 1091 | IN | 14:59:42 | OUT | 15:00:01 | **19 sec** | Erreur de pointage |
| Ismail FOUAD | 02140 | IN | 05:59:03 | OUT | 06:00:30 | **1.5 min** | Double pointage accidentel |
| Omar EL JADID | 01207 | IN | 06:32:13 | OUT | 06:36:06 | **3.9 min** | Session anormale |
| Omar EL JADID | 01207 | IN | 17:33:41 | OUT | 17:38:18 | **4.6 min** | Session anormale |

---

### 2.4. SEQUENCE IN-IN (Sortie manquante reelle)

**1 cas detecte** de deux entrees consecutives sans sortie entre elles:

| Employe | Matricule | Sequence complete | Probleme |
|---------|-----------|-------------------|----------|
| YASSINE AIT SAID | 1091 | IN 07:41 → **IN 14:59** → OUT 15:00 | OUT manquant entre 07:41 et 14:59 |

L'employe a oublie de pointer sa sortie avant 14:59, ce qui a genere une anomalie ABSENCE_PARTIAL.

---

### 2.5. EMPLOYES SANS SORTIE (24 cas)

Ces employes ont pointe leur entree mais n'ont aucune sortie enregistree:

#### Arrives tot le matin (probables anomalies)

| Matricule | Nom | Heure entree |
|-----------|-----|--------------|
| 00961 | El Yazid EL FERRASSI | 05:01 |
| 03313 | Mehdi ECHIHI | 05:11 |
| 01102 | Adil BENLACHMI | 05:30 |
| 00963 | Rachid FANIRI | 05:30 |
| 01153 | Fouad HSAIN | 05:30 |
| 01163 | Hicham JAICHI | 05:30 |
| 01208 | Karim OUAGAG | 05:32 |
| 00948 | Younes BADDA | 05:42 |
| 01512 | Abdellah ZIANE | 06:13 |
| 03094 | Marouane EL AMRI | 07:33 |
| 02293 | Naoual CHELLALI | 08:14 |
| 01942 | EL Houssine KAANANE | 08:16 |
| 02368 | Ghizlan NAIM | 08:16 |
| 03044 | Leila BENFARHOUN | 08:16 |
| 03059 | Abderrafik OULFIL | 08:16 |
| 03247 | Achraf EL-MERAHY | 08:17 |
| 01087 | Hassan FAEZ | 08:26 |
| 02484 | Yasmine OUBLLAL | 08:29 |

#### Arrives l'apres-midi (pourraient encore travailler)

| Matricule | Nom | Heure entree |
|-----------|-----|--------------|
| 02930 | Amal HSASSA | 12:53 |
| 02555 | Younes AQROUROU | 12:58 |
| 00884 | Miloud EZROUTI | 12:58 |
| 02822 | Mohcine BENTAGHALYA | 13:00 |
| 03329 | Zakaria ESSADIK | 16:01 |
| 01935 | Bouchra EL ARARI | 16:10 |

---

## 3. DISTRIBUTION DES POINTAGES PAR HEURE

| Heure | Entrees (IN) | Sorties (OUT) | Total | Observation |
|-------|--------------|---------------|-------|-------------|
| 02:00 | 3 | 0 | 3 | Equipe de nuit |
| 03:00 | 3 | 0 | 3 | Equipe de nuit |
| 04:00 | 7 | 0 | 7 | Equipe tres matinale |
| 05:00 | 66 | 0 | 66 | **Pic d'arrivees** |
| 06:00 | 27 | 3 | 30 | Arrivees matinales |
| 07:00 | 11 | 1 | 12 | Arrivees standard |
| 08:00 | 8 | 0 | 8 | Arrivees bureau |
| 09:00 | 2 | 0 | 2 | Arrivees tardives |
| 12:00 | 3 | 1 | 4 | Pause dejeuner |
| 13:00 | 3 | 5 | 8 | Pause dejeuner |
| 14:00 | 1 | 9 | 10 | Departs mi-journee |
| 15:00 | 0 | 20 | 20 | Departs |
| 16:00 | 2 | 42 | 44 | **Pic de departs** |
| 17:00 | 2 | 13 | 15 | Departs |
| 18:00 | 0 | 9 | 9 | Departs tardifs |
| 19:00 | 1 | 8 | 9 | Departs tardifs |
| 20:00 | 0 | 1 | 1 | Dernier depart |

---

## 4. ANOMALIES PAR TERMINAL

| Terminal | MISSING_OUT | EARLY_LEAVE | ABSENCE_PARTIAL | DEBOUNCE_BLOCKED |
|----------|-------------|-------------|-----------------|------------------|
| Pointeuse CIT | 81 | 21 | 1 | 1 |
| Pointeuse CP | 57 | 2 | 0 | 0 |

---

## 5. STATISTIQUES DE QUALITE

| Categorie | Nombre | Pourcentage |
|-----------|--------|-------------|
| Employes avec pattern equilibre (IN=OUT) | 107 | 80% |
| Employes avec plus d'IN que d'OUT | 27 | 20% |
| Employes avec plus d'OUT que d'IN | 0 | 0% |

| Qualite des anomalies | Nombre | Pourcentage |
|-----------------------|--------|-------------|
| **Vraies anomalies MISSING_OUT** | 26 | 19% |
| **Fausses anomalies MISSING_OUT** | 112 | 81% |

---

## 6. CAUSES RACINES

### Probleme 1: Detection MISSING_OUT incorrecte

- **Cause**: L'anomalie est creee a l'arrivee et jamais nettoyee quand le OUT arrive
- **Localisation**: `attendance.service.ts` - fonction de detection d'anomalies
- **Impact**: 81% de faux positifs

### Probleme 2: EARLY_LEAVE sur pauses dejeuner

- **Cause**: Le systeme ne distingue pas pause dejeuner vs depart definitif
- **Localisation**: Logique de detection EARLY_LEAVE
- **Impact**: Pauses legitimess flagguees comme anomalies

### Probleme 3: Detection IN/OUT basee sur l'alternance simple

- **Cause**: Le script sync alterne IN/OUT sans considerer les erreurs utilisateur
- **Localisation**: `sync-cit.js` et `sync-cp.js`
- **Impact**: Mauvaise assignation de type dans certains cas

### Probleme 4: Pointages tres courts non filtres

- **Cause**: Pas de seuil minimum entre IN et OUT
- **Impact**: Sessions de quelques secondes enregistrees

---

## 7. RECOMMANDATIONS

### Urgent (A corriger immediatement)

1. **Corriger la logique MISSING_OUT**
   - Quand un OUT arrive, rechercher le dernier IN du meme employe le meme jour
   - Si trouve avec anomalie MISSING_OUT, supprimer cette anomalie
   - Fichier: `attendance.service.ts`

2. **Nettoyer les fausses anomalies existantes**
   - Script SQL pour supprimer les MISSING_OUT qui ont un OUT correspondant

### Important (A corriger cette semaine)

3. **Ajouter logique de pause dejeuner**
   - Si OUT entre 11h-14h ET IN dans les 2h suivantes → pas EARLY_LEAVE
   - Marquer plutot comme "PAUSE_DEJEUNER"

4. **Implementer seuil minimum IN-OUT**
   - Ignorer ou flaguer les sessions < 5 minutes comme "POINTAGE_SUSPECT"

### Amelioration (A planifier)

5. **Investigation des 24 employes sans sortie**
   - Verifier s'ils ont quitte sans pointer
   - Ou si le sync n'a pas capture leurs sorties

6. **Alertes temps reel**
   - Notifier si un employe est present depuis > 12h sans sortie

---

## 8. DONNEES BRUTES DE REFERENCE

### Employes avec patterns parfaits mais anomalies incorrectes

```
Matricule | Nom                    | Sequence                              | Anomalie incorrecte
01270     | Marouane ACHOUBA       | IN 05:38 → OUT 17:36                 | MISSING_OUT
01045     | Mohammed Amine BANANE  | IN 05:22 → OUT 18:19                 | MISSING_OUT
01688     | M'hammed LAABID        | IN 06:21 → OUT 15:53                 | MISSING_OUT
03345     | Hiba ELIDRISSI         | IN 05:10 → OUT 15:57                 | MISSING_OUT
02068     | Abdelkader LAGHRARI    | IN 05:59 → OUT 13:44                 | MISSING_OUT
01010     | El Mouloudi LAAROUSSI  | IN 04:53 → OUT 14:48                 | MISSING_OUT
01283     | Abdelilah ALOUANE      | IN 06:32 → OUT 15:00                 | MISSING_OUT
```

---

**Fin du rapport**

*Genere automatiquement par Claude Code - 13/01/2026*
