# Rapport d'Analyse des Pointages
## Periode: 12 - 16 Janvier 2026

---

## 1. Resume Executif

| Metrique | Valeur |
|----------|--------|
| **Total Pointages** | 1 370 |
| **Employes Concernes** | 183 |
| **Periode** | 12/01/2026 04:08 - 16/01/2026 22:13 |
| **Jours Analyses** | 5 jours |
| **Jour Ferie** | 14/01/2026 (Nouvel An Amazigh) |

---

## 2. Distribution IN/OUT

| Type | Nombre | Pourcentage |
|------|--------|-------------|
| **IN (Entrees)** | 768 | 56.06% |
| **OUT (Sorties)** | 602 | 43.94% |
| **Ecart** | **166** | - |

### Probleme Identifie
L'ecart de 166 entre les entrees et sorties indique un **desequilibre significatif**. Cela signifie que 166 employes ont pointe une entree sans sortie correspondante (ou inversement).

---

## 3. Statistiques par Jour

| Jour | Total | IN | OUT | Employes | Remarque |
|------|-------|----|----|----------|----------|
| 12/01/2026 (Dim) | 248 | 150 | 98 | 150 | Jour normal |
| 13/01/2026 (Lun) | 301 | 149 | 152 | 158 | Jour normal |
| **14/01/2026 (Mar)** | **65** | **18** | **47** | **53** | **JOUR FERIE** |
| 15/01/2026 (Mer) | 270 | 161 | 109 | 160 | Jour normal |
| 16/01/2026 (Jeu) | 486 | 290 | 196 | 183 | Activite elevee |

### Observations
- Le 14 janvier (Nouvel An Amazigh) montre une **activite reduite** (65 pointages vs moyenne de ~270)
- 53 employes ont travaille le jour ferie
- Le 16 janvier montre la plus haute activite avec 486 pointages

---

## 4. Anomalies Detectees

### 4.1 Resume Global des Anomalies

| Type d'Anomalie | Nombre | Description |
|-----------------|--------|-------------|
| **ABSENCE** | 183 | Employes absents sans justification |
| **EARLY_LEAVE** | 114 | Departs anticipes avant fin de shift |
| **ABSENCE_PARTIAL** | 55 | Absences partielles (demi-journee) |
| **JOUR_FERIE_TRAVAILLE** | 50 | Travail effectue le jour ferie |
| **LATE** | 30 | Retards a l'arrivee |
| **DEBOUNCE_BLOCKED** | 28 | Pointages bloques (anti-doublon) |
| **MISSING_IN** | 9 | Entrees manquantes |
| **MISSING_OUT** | 9 | Sorties manquantes |
| **DOUBLE_IN** | 1 | Double entree detectee |

### 4.2 Anomalies par Jour

| Jour | Anomalies Principales |
|------|----------------------|
| 12/01 | EARLY_LEAVE (13), ABSENCE_PARTIAL (8), LATE (6) |
| 13/01 | EARLY_LEAVE (37), ABSENCE_PARTIAL (17), LATE (9) |
| 14/01 | **JOUR_FERIE_TRAVAILLE (50)**, LATE (9), ABSENCE_PARTIAL (3) |
| 15/01 | EARLY_LEAVE (21), ABSENCE_PARTIAL (13), LATE (6) |
| 16/01 | **ABSENCE (181)**, EARLY_LEAVE (42), **DEBOUNCE_BLOCKED (27)** |

---

## 5. Problemes de Sequences IN/OUT

### 5.1 Statistiques des Sequences Consecutives

| Probleme | Nombre | Severite |
|----------|--------|----------|
| **DOUBLE_IN** (IN suivi de IN) | 121 | CRITIQUE |
| **DOUBLE_OUT** (OUT suivi de OUT) | 19 | MODEREE |
| **Total** | **140** | - |

### 5.2 Employes les Plus Affectes

| Matricule | Nom | Double IN | Double OUT | Total |
|-----------|-----|-----------|------------|-------|
| 01207 | Omar EL JADID | 2 | 1 | 3 |
| 01010 | El Mouloudi LAAROUSSI | 2 | 0 | 2 |
| 00963 | Rachid FANIRI | 2 | 0 | 2 |
| 02365 | Hamza EL HACHIMI | 2 | 0 | 2 |
| 03329 | Zakaria ESSADIK | 2 | 0 | 2 |
| 01066 | Hamid EL MEKKAOUI | 2 | 0 | 2 |
| 03313 | Mehdi ECHIHI | 2 | 0 | 2 |
| 01040 | Abdelmalk BOUBAZ | 2 | 0 | 2 |
| 00971 | El Mahjoub BOUJDID | 2 | 0 | 2 |
| 00889 | Adil GHANDAOUI | 2 | 0 | 2 |

### 5.3 Exemples de Sequences Problematiques

**Hamza EL HACHIMI (02365)**:
```
IN (12 04:09) → OUT (12 16:26) → IN (12 16:28) → IN (13 06:56) → OUT (13 16:26) →
IN (15 04:00) → OUT (15 16:26) → IN (16 06:59) → IN (16 07:00) → OUT (16 16:40)
```
- Probleme: IN (12 16:28) suivi de IN (13 06:56) - sortie manquante le 12/01

**Omar EL JADID (01207)**:
```
IN (12 06:34) → OUT (13 06:32) → IN (13 06:36) → OUT (13 17:33) → IN (13 17:38) →
IN (15 06:29) → IN (16 06:30) → OUT (16 06:30) → OUT (16 18:51)
```
- Probleme: IN (13 17:38) suivi de IN (15 06:29) - sortie manquante le 13/01

---

## 6. Analyse des Terminaux

### 6.1 Distribution par Terminal

| Terminal | Device ID | Pointages | Pourcentage |
|----------|-----------|-----------|-------------|
| **Pointeuse CP** | EJB8241100241 | 1 187 | 86.6% |
| Pointeuse CIT | EJB8241100244 | 0 | 0% |
| Pointeuse Portable | A6F5211460142 | 0 | 0% |
| **Sans Device** | - | 183 | 13.4% |

### Probleme Majeur
Les terminaux **CIT** et **Portable** n'ont enregistre **AUCUN pointage**. Cela peut indiquer:
- Probleme de synchronisation des terminaux
- Terminaux hors ligne
- Configuration incorrecte de l'API

Les 183 pointages sans device sont probablement des **pointages virtuels/fallback** generes par le systeme.

---

## 7. Distribution Horaire

| Heure | Total | IN | OUT | Observation |
|-------|-------|----|----|-------------|
| 02:00 | 27 | 0 | 27 | Shift Nuit - Sorties |
| 03:00 | 12 | 9 | 3 | Shift Nuit |
| 04:00 | 48 | 40 | 8 | Debut Shift Matin |
| **05:00** | **241** | **178** | 63 | **Pic d'Entrees Matin** |
| **06:00** | **247** | **214** | 33 | **Pic d'Entrees Matin** |
| 07:00 | 113 | 92 | 21 | Entrees continues |
| 08:00 | 22 | 5 | 17 | Fin entrees matin |
| 12:00-13:00 | 54 | 27 | 27 | Pause dejeuner |
| **16:00** | **202** | 71 | **131** | **Pic de Sorties** |
| **17:00** | 85 | 8 | **77** | **Sorties continues** |
| 18:00-19:00 | 96 | 14 | 82 | Sorties continues |
| 22:00 | 59 | 39 | 20 | Debut Shift Nuit |

---

## 8. Heures Supplementaires

### 8.1 Resume par Jour

| Jour | Nb Employes | Total Heures | Moyenne/Employe |
|------|-------------|--------------|-----------------|
| 13/01/2026 | 31 | 103.25h | 3.33h |
| 14/01/2026 | 33 | 193.50h | 5.86h |
| 16/01/2026 | 34 | 54.50h | 1.60h |

**Note**: Le 14/01 (jour ferie) montre la plus haute moyenne d'heures supplementaires (5.86h) ce qui correspond au travail effectue pendant le jour ferie.

### 8.2 Top 15 Employes en Heures Supplementaires

| # | Matricule | Nom | Total Heures | Nb Jours |
|---|-----------|-----|--------------|----------|
| 1 | 02484 | Yasmine OUBLLAL | 13.00h | 3 |
| 2 | 01087 | Hassan FAEZ | 13.00h | 3 |
| 3 | 02293 | Naoual CHELLALI | 12.75h | 3 |
| 4 | 03044 | Leila BENFARHOUN | 12.75h | 3 |
| 5 | 01942 | EL Houssine KAANANE | 12.75h | 3 |
| 6 | 03059 | Abderrafik OULFIL | 12.50h | 3 |
| 7 | 02368 | Ghizlan NAIM | 12.50h | 3 |
| 8 | 03247 | Achraf EL-MERAHY | 12.50h | 3 |
| 9 | 01811 | Essadik HAKIMI | 12.00h | 3 |
| 10 | 02367 | Houda BAYANI | 12.00h | 3 |
| 11 | 01090 | Abdelouahid EL HAJAMI | 11.75h | 3 |
| 12 | 02528 | Meryem BENZAROU | 11.50h | 3 |
| 13 | 02768 | Hayat ELKHAYARI | 11.25h | 3 |
| 14 | 02696 | Zineb ZAKARYA | 11.00h | 3 |
| 15 | 03345 | Hiba ELIDRISSI | 11.00h | 3 |

---

## 9. Configuration des Shifts

| Shift | Debut | Fin | Pause | Nuit |
|-------|-------|-----|-------|------|
| CIT Matin | 07:00 | 16:00 | 11:00 | Non |
| Matin GAB Superviseur | 07:00 | 14:00 | 10:00 | Non |
| GAB MATIN | 07:30 | 16:30 | 11:00 | Non |
| Matin | 08:00 | 17:00 | 12:00 | Non |
| Apres-midi | 14:00 | 23:00 | 18:00 | Non |
| Soir GAB Superviseur | 14:00 | 21:00 | 17:00 | Non |
| **Soir** | 17:00 | 02:00 | 22:00 | **Oui** |
| **Nuit** | 23:00 | 07:00 | 03:00 | **Oui** |

---

## 10. Problemes Critiques a Corriger

### 10.1 PRIORITE HAUTE

| # | Probleme | Impact | Solution Proposee |
|---|----------|--------|-------------------|
| 1 | **121 DOUBLE_IN detectes** | Calcul incorrect des heures | Ameliorer l'algorithme de detection |
| 2 | **Terminaux CIT/Portable a 0 pointages** | Donnees incompletes | Verifier synchronisation terminaux |
| 3 | **183 ABSENCE le 16/01** | Metriques faussees | Verifier si c'est un jour special |
| 4 | **28 DEBOUNCE_BLOCKED** | Pointages perdus | Ajuster le delai anti-doublon |

### 10.2 PRIORITE MOYENNE

| # | Probleme | Impact | Solution Proposee |
|---|----------|--------|-------------------|
| 5 | **166 ecart IN/OUT** | Heures travaillees incompletes | Ajouter pointages virtuels manquants |
| 6 | **114 EARLY_LEAVE** | Possible abus ou urgences | Analyser les motifs |
| 7 | **9 MISSING_IN + 9 MISSING_OUT** | Donnees incompletes | Correction manuelle requise |

### 10.3 PRIORITE BASSE

| # | Probleme | Impact | Solution Proposee |
|---|----------|--------|-------------------|
| 8 | **30 LATE** | Impact minimal | Rapport pour managers |
| 9 | **55 ABSENCE_PARTIAL** | Normal | Verifier justifications |

---

## 11. Recommandations

### 11.1 Actions Immediates

1. **Verifier les terminaux CIT et Portable**
   - S'assurer qu'ils sont en ligne
   - Verifier la configuration de l'API webhook
   - Tester la connectivite reseau

2. **Corriger l'algorithme DOUBLE_IN**
   - Le systeme detecte correctement les DOUBLE_IN mais ne les corrige pas
   - Implementer une logique de correction automatique

3. **Ajuster le debounce**
   - Le delai anti-doublon semble trop strict (28 pointages bloques)
   - Reduire le delai ou l'adapter par type de punch

### 11.2 Actions a Moyen Terme

1. **Synchroniser les 3 terminaux**
   - Executer `record-all.bat` sur Windows pour recuperer les donnees
   - Utiliser `replay-all.bat` pour importer tous les pointages

2. **Mettre en place des alertes**
   - Notification quand un terminal n'envoie pas de donnees
   - Alerte pour les ecarts IN/OUT superieurs a 10%

3. **Validation manageriale**
   - Tous les 1370 pointages sont en statut `NONE` (non valides)
   - Mettre en place un workflow de validation

---

## 12. Conclusion

L'analyse des pointages du 12 au 16 janvier 2026 revele plusieurs problemes:

1. **Donnees incompletes**: Seul le terminal CP envoie des donnees (86.6%)
2. **Algorithme a ameliorer**: 121 sequences DOUBLE_IN detectees
3. **Desequilibre IN/OUT**: 166 pointages manquants
4. **Jour ferie**: 50 employes ont travaille le 14 janvier (Nouvel An Amazigh)

Le systeme de detection IN/OUT fonctionne globalement bien avec les shifts configures, mais necessite des corrections pour les cas edge (shifts de nuit, debounce, terminaux multiples).

---

**Rapport genere le**: 17/01/2026
**Systeme**: PointaFlex v1.0
**Analyste**: Claude Code
