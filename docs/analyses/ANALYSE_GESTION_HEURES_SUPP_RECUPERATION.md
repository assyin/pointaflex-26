# Analyse Complète : Gestion des Heures Supplémentaires et Conversion en Récupération

## 📋 Table des Matières
1. [Contexte et Objectifs](#contexte-et-objectifs)
2. [État Actuel du Système](#état-actuel-du-système)
3. [Analyse des Besoins](#analyse-des-besoins)
4. [Architecture Proposée](#architecture-proposée)
5. [Modèles de Données](#modèles-de-données)
6. [Logique Métier](#logique-métier)
7. [Workflows et Scénarios](#workflows-et-scénarios)
8. [Règles de Gestion](#règles-de-gestion)
9. [Interface Utilisateur](#interface-utilisateur)
10. [Points d'Attention et Recommandations](#points-dattention-et-recommandations)

---

## 1. Contexte et Objectifs

### 1.1 Objectif Principal
Permettre aux managers de :
- **Visualiser** le cumul des heures supplémentaires approuvées pour chaque employé
- **Convertir** ce cumul en journées de récupération
- **Personnaliser** le nombre de jours de récupération selon le solde cumulé
- **Définir** les dates précises de récupération (une ou plusieurs journées)

### 1.2 Principe de Base
- Les heures supplémentaires approuvées s'accumulent dans un **solde cumulé**
- Quand le cumul atteint l'équivalent d'une **journée normale de travail**, le manager peut convertir en journées de récupération
- Le manager a la flexibilité de définir combien de jours attribuer selon le solde disponible

---

## 2. État Actuel du Système

### 2.1 Modèles Existants

#### **Model Overtime** (Heures Supplémentaires)
```prisma
model Overtime {
  id                  String         @id
  employeeId          String
  date                DateTime
  hours               Decimal         // Heures demandées
  approvedHours       Decimal?        // Heures approuvées par le manager
  status              OvertimeStatus // PENDING, APPROVED, REJECTED, RECOVERED, PAID
  convertedToRecovery Boolean         // Indique si converti en récupération
  recoveryId          String?        // Lien vers Recovery si converti
  // ... autres champs
}
```

#### **Model Recovery** (Heures de Récupération)
```prisma
model Recovery {
  id             String    @id
  employeeId     String
  hours          Decimal   // Heures totales de récupération
  usedHours      Decimal   // Heures utilisées
  remainingHours Decimal   // Heures restantes
  source         String?   // "OVERTIME", "MANUAL"
  expiryDate     DateTime? // Date d'expiration
}
```

### 2.2 Fonctionnalités Actuelles

✅ **Approbation des heures supplémentaires**
- Le manager peut approuver/rejeter les demandes
- Possibilité de personnaliser le nombre d'heures approuvées (`approvedHours`)

✅ **Conversion en heures de récupération**
- Conversion d'une demande d'overtime individuelle en heures de récupération
- Création d'un enregistrement `Recovery` avec les heures converties

❌ **Manque actuellement**
- Vue consolidée du cumul des heures supp approuvées par employé
- Conversion en **journées** de récupération (actuellement seulement en heures)
- Gestion des dates de récupération
- Personnalisation du nombre de jours selon le solde

### 2.3 Configuration Tenant

```prisma
model TenantSettings {
  workDaysPerWeek      Int     @default(6)        // 6 jours au Maroc
  maxWeeklyHours       Decimal @default(44)        // 44h hebdomadaires
  recoveryConversionRate Decimal @default(1.0)     // Taux de conversion heures → récup
  recoveryExpiryDays   Int     @default(90)        // Jours avant expiration
}
```

**Calcul d'une journée normale :**
- Si `workDaysPerWeek = 6` et `maxWeeklyHours = 44`
- **Heures par jour = 44 / 6 = 7.33 heures/jour** (arrondi selon besoin)

---

## 3. Analyse des Besoins

### 3.1 Besoins Fonctionnels

#### **BF1 : Cumul des Heures Supplémentaires**
- Calculer automatiquement le solde cumulé des heures supp **approuvées** et **non converties** par employé
- Exclure les heures déjà converties en récupération ou payées
- Afficher ce solde de manière claire pour les managers

#### **BF2 : Conversion en Journées de Récupération**
- Permettre au manager de convertir le cumul en journées de récupération
- Le manager peut choisir combien de jours attribuer (selon le solde disponible)
- Exemple : Si solde = 15h et journée = 7.33h, le manager peut choisir 1 ou 2 jours

#### **BF3 : Gestion des Dates de Récupération**
- Le manager doit pouvoir spécifier les dates précises de récupération
- Support pour une ou plusieurs journées consécutives ou non
- Validation que les dates ne chevauchent pas avec d'autres congés/récupérations

#### **BF4 : Traçabilité et Historique**
- Conserver l'historique des conversions
- Lier les journées de récupération aux heures supp d'origine
- Permettre de voir quelles heures supp ont été utilisées pour chaque journée

### 3.2 Besoins Non-Fonctionnels

- **Performance** : Calcul du solde en temps réel ou mis en cache
- **Sécurité** : Seuls les managers peuvent convertir
- **Audit** : Traçabilité complète des conversions
- **Flexibilité** : Le manager peut personnaliser le nombre de jours

---

## 4. Architecture Proposée

### 4.1 Nouveaux Modèles de Données

#### **Model RecoveryDay** (Nouveau)
```prisma
model RecoveryDay {
  id                String   @id @default(uuid())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  tenantId          String
  employeeId        String
  employee          Employee @relation(fields: [employeeId], references: [id])
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  
  // Dates de récupération
  startDate         DateTime @db.Date  // Date de début
  endDate           DateTime @db.Date   // Date de fin (peut être = startDate pour 1 jour)
  days               Decimal            // Nombre de jours (peut être fractionnel)
  
  // Conversion depuis heures supp
  sourceHours       Decimal             // Heures supp utilisées pour cette récupération
  conversionRate    Decimal?            // Taux utilisé (si différent du défaut)
  
  // Statut
  status            RecoveryDayStatus @default(PENDING) // PENDING, APPROVED, USED, CANCELLED
  
  // Approbation
  approvedBy        String?
  approvedAt        DateTime?
  
  // Relations
  overtimeSources   OvertimeRecoveryDay[] // Heures supp d'origine
  
  @@index([tenantId])
  @@index([employeeId])
  @@index([startDate])
  @@index([status])
}

enum RecoveryDayStatus {
  PENDING    // En attente d'approbation
  APPROVED   // Approuvé, peut être utilisé
  USED       // Utilisé (date passée)
  CANCELLED  // Annulé
}
```

#### **Model OvertimeRecoveryDay** (Table de liaison)
```prisma
model OvertimeRecoveryDay {
  id            String   @id @default(uuid())
  overtimeId   String
  recoveryDayId String
  hoursUsed     Decimal  // Nombre d'heures de cet overtime utilisées
  
  overtime      Overtime   @relation(fields: [overtimeId], references: [id])
  recoveryDay   RecoveryDay @relation(fields: [recoveryDayId], references: [id])
  
  @@unique([overtimeId, recoveryDayId])
  @@index([overtimeId])
  @@index([recoveryDayId])
}
```

#### **Modifications au Model Overtime**
```prisma
model Overtime {
  // ... champs existants
  
  // Nouveaux champs
  convertedToRecoveryDays Boolean @default(false)  // Converti en journées de récup
  recoveryDays            OvertimeRecoveryDay[]   // Relations avec RecoveryDay
  
  // Le champ convertedToRecovery existe déjà pour la conversion en heures
  // On garde les deux pour distinguer :
  // - convertedToRecovery = conversion en heures (Recovery)
  // - convertedToRecoveryDays = conversion en journées (RecoveryDay)
}
```

### 4.2 Nouveaux Services

#### **OvertimeBalanceService**
Responsable du calcul du solde cumulé des heures supp par employé.

**Méthodes principales :**
- `getCumulativeBalance(employeeId)` : Retourne le solde cumulé disponible
- `getAvailableHoursForConversion(employeeId)` : Heures disponibles pour conversion

#### **RecoveryDayService**
Gestion des journées de récupération.

**Méthodes principales :**
- `createRecoveryDays(dto)` : Créer des journées de récupération depuis heures supp
- `approveRecoveryDay(id)` : Approuver une journée de récupération
- `getEmployeeRecoveryDays(employeeId)` : Liste des journées de récupération
- `validateRecoveryDates(employeeId, startDate, endDate)` : Valider les dates

---

## 5. Modèles de Données Détaillés

### 5.1 Calcul du Solde Cumulé

**Formule :**
```
Solde Cumulé = Σ(approvedHours) 
  - Σ(heures converties en Recovery)
  - Σ(heures converties en RecoveryDay)
  - Σ(heures payées)
```

**Où :**
- `approvedHours` = heures approuvées pour chaque Overtime avec status = APPROVED
- Exclure les Overtime avec `convertedToRecovery = true` OU `convertedToRecoveryDays = true`
- Exclure les Overtime avec `status = PAID`

### 5.2 Conversion Heures → Journées

**Paramètres :**
- `dailyWorkingHours` = `maxWeeklyHours / workDaysPerWeek` (ex: 44 / 6 = 7.33h)
- `conversionRate` = `recoveryConversionRate` (par défaut 1.0)

**Calcul :**
```
Nombre de jours possibles = (Solde Cumulé × conversionRate) / dailyWorkingHours
```

**Exemple :**
- Solde cumulé = 15 heures
- Journée normale = 7.33 heures
- Conversion rate = 1.0
- **Jours possibles = 15 / 7.33 = 2.05 jours**

Le manager peut choisir :
- 1 jour (utilise 7.33h, reste 7.67h)
- 2 jours (utilise 14.66h, reste 0.34h)
- 2.05 jours (utilise tout le solde)

### 5.3 Structure de Conversion

**Scénario : Conversion de 15h en 2 jours de récupération**

1. **Création de RecoveryDay**
   ```json
   {
     "employeeId": "emp-123",
     "startDate": "2024-02-15",
     "endDate": "2024-02-16",
     "days": 2,
     "sourceHours": 15,
     "status": "PENDING"
   }
   ```

2. **Création des liens OvertimeRecoveryDay**
   - Si 15h proviennent de 3 Overtime (5h + 6h + 4h)
   - Créer 3 enregistrements OvertimeRecoveryDay :
     - Overtime1 (5h) → RecoveryDay
     - Overtime2 (6h) → RecoveryDay
     - Overtime3 (4h) → RecoveryDay

3. **Mise à jour des Overtime**
   - Marquer `convertedToRecoveryDays = true` pour les 3 Overtime
   - Optionnel : Changer status à `RECOVERED` (ou créer nouveau status)

---

## 6. Logique Métier

### 6.1 Règles de Cumul

#### **Règle 1 : Heures Éligibles au Cumul**
✅ **Inclure :**
- Overtime avec `status = APPROVED`
- `approvedHours` > 0 (ou `hours` si `approvedHours` est null)
- `convertedToRecovery = false`
- `convertedToRecoveryDays = false`
- `status != PAID`

❌ **Exclure :**
- Overtime rejetés (`status = REJECTED`)
- Overtime déjà convertis en récupération
- Overtime déjà payés

#### **Règle 2 : Conversion Partielle**
- Un Overtime peut être partiellement converti
- Exemple : Overtime de 10h, convertir 7.33h en 1 jour, reste 2.67h dans le solde

**Solution :** Créer un champ `convertedHours` dans Overtime pour tracker les heures déjà converties.

**Modification proposée :**
```prisma
model Overtime {
  // ... champs existants
  convertedHoursToRecoveryDays Decimal @default(0) // Heures déjà converties en jours
}
```

**Calcul du solde :**
```
Solde = approvedHours - convertedHoursToRecoveryDays - convertedHoursToRecovery
```

### 6.2 Règles de Conversion

#### **Règle 3 : Minimum de Conversion**
- **Option A (Stricte)** : Conversion uniquement si solde ≥ 1 journée complète
- **Option B (Flexible)** : Conversion possible même si < 1 journée (fractionnel)

**Recommandation : Option B** pour plus de flexibilité.

#### **Règle 4 : Attribution des Heures**
- Utiliser la méthode **FIFO** (First In First Out) : convertir les heures supp les plus anciennes en premier
- Ou permettre au manager de choisir quelles heures supp utiliser

**Recommandation : FIFO automatique** pour simplicité, avec possibilité de voir l'origine.

### 6.3 Règles de Validation des Dates

#### **Règle 5 : Validation des Dates de Récupération**
✅ **Vérifications à faire :**
1. `startDate` ≤ `endDate`
2. Pas de chevauchement avec d'autres congés (Leave)
3. Pas de chevauchement avec d'autres récupérations (RecoveryDay)
4. Dates dans le futur (ou validation si dates passées)
5. Pas de jours fériés (selon politique)

#### **Règle 6 : Calcul des Jours**
- Si `startDate = endDate` → 1 jour
- Si `startDate < endDate` → Calculer les jours ouvrés entre les deux dates
- Exclure les weekends et jours fériés selon configuration

**Exemple :**
- startDate = Lundi 15/02
- endDate = Mercredi 17/02
- Jours = 3 jours (Lun, Mar, Mer)

---

## 7. Workflows et Scénarios

### 7.1 Workflow Principal : Conversion en Récupération

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Manager consulte le solde cumulé d'un employé           │
│    GET /overtime/balance/:employeeId                        │
│    → Retourne: { cumulativeHours: 15, dailyHours: 7.33 }   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Manager décide de convertir en journées                  │
│    Il voit: "15h disponibles = 2.05 jours possibles"      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Manager choisit:                                          │
│    - Nombre de jours: 2                                      │
│    - Date début: 15/02/2024                                 │
│    - Date fin: 16/02/2024                                   │
│    POST /recovery-days/convert-from-overtime                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Système valide et crée:                                  │
│    - RecoveryDay (2 jours, 14.66h utilisées)               │
│    - OvertimeRecoveryDay (liens avec heures supp d'origine) │
│    - Met à jour Overtime (convertedHoursToRecoveryDays)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Manager approuve la récupération                         │
│    POST /recovery-days/:id/approve                          │
│    → Status passe à APPROVED                                 │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Scénario 1 : Conversion Simple (1 Journée)

**Contexte :**
- Employé a cumulé 8 heures supp approuvées
- Journée normale = 7.33 heures

**Actions :**
1. Manager voit : "8h disponibles = 1.09 jours"
2. Manager crée 1 journée de récupération le 20/02/2024
3. Système utilise 7.33h, reste 0.67h dans le solde

**Résultat :**
- RecoveryDay créé : 1 jour, 7.33h utilisées
- Solde restant : 0.67h

### 7.3 Scénario 2 : Conversion Multiple (Plusieurs Journées)

**Contexte :**
- Employé a cumulé 25 heures supp approuvées
- Journée normale = 7.33 heures
- Jours possibles = 3.41 jours

**Actions :**
1. Manager voit : "25h disponibles = 3.41 jours"
2. Manager choisit de créer 3 journées :
   - Jour 1 : 15/02/2024 (7.33h)
   - Jour 2 : 16/02/2024 (7.33h)
   - Jour 3 : 17/02/2024 (7.33h)
3. Total utilisé : 21.99h, reste 3.01h

**Résultat :**
- 3 RecoveryDay créés
- Solde restant : 3.01h

### 7.4 Scénario 3 : Conversion Partielle d'un Overtime

**Contexte :**
- Overtime de 10h approuvées
- Manager veut convertir seulement 7.33h en 1 jour

**Actions :**
1. Manager crée 1 journée de récupération
2. Système utilise 7.33h de cet Overtime
3. Les 2.67h restantes restent dans le solde cumulé

**Résultat :**
- Overtime : `convertedHoursToRecoveryDays = 7.33h`
- Solde disponible : 2.67h (de cet Overtime) + autres heures supp

### 7.5 Scénario 4 : Validation des Dates

**Contexte :**
- Manager essaie de créer une récupération du 15/02 au 17/02
- L'employé a déjà un congé le 16/02

**Résultat :**
- ❌ Erreur : "Date chevauchant avec un congé existant"
- Manager doit choisir d'autres dates

---

## 8. Règles de Gestion

### 8.1 Règles de Calcul

#### **R1 : Calcul du Solde Cumulé**
```
Solde = Σ(approvedHours - convertedHoursToRecoveryDays - convertedHoursToRecovery)
  Pour tous les Overtime où:
    - status = APPROVED
    - convertedToRecovery = false OU convertedHoursToRecovery < approvedHours
    - convertedToRecoveryDays = false OU convertedHoursToRecoveryDays < approvedHours
    - status != PAID
```

#### **R2 : Conversion Heures → Jours**
```
Jours Possibles = (Solde × recoveryConversionRate) / dailyWorkingHours
dailyWorkingHours = maxWeeklyHours / workDaysPerWeek
```

#### **R3 : Attribution FIFO**
- Lors de la conversion, utiliser les heures supp les plus anciennes en premier
- Basé sur la date de l'Overtime (`date`)

### 8.2 Règles de Validation

#### **R4 : Validation des Dates**
- `startDate` doit être ≤ `endDate`
- Pas de chevauchement avec Leave (congés)
- Pas de chevauchement avec RecoveryDay existants
- Dates doivent être dans le futur (ou validation spéciale pour dates passées)

#### **R5 : Validation du Nombre de Jours**
- Le nombre de jours demandé ne peut pas dépasser le solde disponible
- Formule : `days × dailyWorkingHours ≤ Solde disponible`

### 8.3 Règles de Statut

#### **R6 : Statuts RecoveryDay**
- **PENDING** : Créé, en attente d'approbation
- **APPROVED** : Approuvé, peut être utilisé
- **USED** : Date passée, considéré comme utilisé
- **CANCELLED** : Annulé, les heures retournent au solde

#### **R7 : Annulation**
- Si RecoveryDay annulé, les heures retournent au solde cumulé
- Mettre à jour `convertedHoursToRecoveryDays` dans les Overtime concernés

---

## 9. Interface Utilisateur

### 9.1 Vue Manager : Liste des Employés avec Solde

**Page : `/overtime` ou `/overtime/recovery-conversion`**

**Tableau :**
```
| Employé        | Heures Cumulées | Jours Possibles | Actions           |
|----------------|-----------------|------------------|-------------------|
| Jean Dupont    | 15.0h           | 2.05 jours       | [Convertir]       |
| Marie Martin   | 7.5h            | 1.02 jours       | [Convertir]       |
| Pierre Durand  | 22.0h           | 3.00 jours       | [Convertir]       |
```

**Filtres :**
- Par département
- Par site
- Par plage de dates
- Afficher seulement ceux avec solde > 0

### 9.2 Modal de Conversion

**Modal : "Convertir en Récupération"**

**Informations affichées :**
- Employé : Jean Dupont
- Solde disponible : 15.0 heures
- Équivalent : 2.05 journées (7.33h/jour)
- Détail des heures supp d'origine (liste avec dates)

**Formulaire :**
```
Nombre de jours à attribuer : [2] jours
  (Minimum: 0.5, Maximum: 2.05)

Date de début : [15/02/2024] 📅
Date de fin   : [16/02/2024] 📅
  (Jours calculés automatiquement: 2)

Commentaire (optionnel) :
[________________________________]

[Annuler]  [Créer la Récupération]
```

**Validation en temps réel :**
- Si jours > jours possibles → Erreur
- Si dates chevauchent → Avertissement
- Calcul automatique des heures utilisées

### 9.3 Vue Détail : Historique des Conversions

**Page : `/overtime/employee/:id/recovery-days`**

**Affichage :**
- Solde actuel
- Liste des journées de récupération créées
- Détail de chaque conversion (quelles heures supp utilisées)
- Dates et statuts

---

## 10. Points d'Attention et Recommandations

### 10.1 Points Critiques

#### **PC1 : Conversion Partielle**
- **Problème** : Comment gérer si un Overtime est partiellement converti ?
- **Solution** : Ajouter `convertedHoursToRecoveryDays` dans Overtime pour tracker précisément

#### **PC2 : Calcul de la Journée Normale**
- **Problème** : La journée peut varier selon l'employé (temps partiel, etc.)
- **Solution** : Utiliser la configuration tenant par défaut, avec possibilité de personnalisation par employé si besoin

#### **PC3 : Dates de Récupération**
- **Problème** : Gérer les weekends, jours fériés, congés existants
- **Solution** : Validation stricte avec exclusion automatique des jours non travaillés

#### **PC4 : Performance**
- **Problème** : Calcul du solde peut être lent avec beaucoup d'Overtime
- **Solution** : Mise en cache ou calcul incrémental, indexation des champs utilisés

### 10.2 Recommandations

#### **R1 : Approche Progressive**
1. **Phase 1** : Conversion simple (tout le solde en X jours)
2. **Phase 2** : Conversion partielle (choisir quelles heures utiliser)
3. **Phase 3** : Conversion avancée (personnalisation complète)

#### **R2 : Traçabilité**
- Toujours lier RecoveryDay aux Overtime d'origine
- Historique complet des conversions
- Audit log pour chaque action

#### **R3 : Flexibilité Manager**
- Permettre au manager de personnaliser le nombre de jours
- Validation mais pas de blocage strict (le manager peut décider)

#### **R4 : Notifications**
- Notifier l'employé quand une récupération est créée
- Notifier le manager si dates chevauchent

### 10.3 Questions à Clarifier

1. **Q1** : Un employé peut-il demander lui-même la conversion, ou uniquement le manager ?
   - **Recommandation** : Uniquement le manager pour contrôle

2. **Q2** : Les heures supp peuvent-elles être partiellement converties (ex: 10h, convertir 7.33h, reste 2.67h) ?
   - **Recommandation** : Oui, pour flexibilité maximale

3. **Q3** : Que se passe-t-il si une récupération est annulée ?
   - **Recommandation** : Les heures retournent au solde cumulé

4. **Q4** : Les récupérations ont-elles une date d'expiration ?
   - **Recommandation** : Oui, utiliser `recoveryExpiryDays` de TenantSettings

5. **Q5** : Peut-on convertir en récupération des heures déjà partiellement payées ?
   - **Recommandation** : Non, seulement les heures non payées

---

## 11. Schéma de Base de Données Complet

### 11.1 Modifications au Schema Prisma

```prisma
// ===================================
// HEURES SUP & RÉCUPÉRATION
// ===================================

model Overtime {
  id                          String         @id @default(uuid())
  createdAt                   DateTime       @default(now())
  updatedAt                   DateTime       @updatedAt
  tenantId                    String
  employeeId                  String
  date                        DateTime       @db.Date
  hours                       Decimal
  approvedHours               Decimal?
  type                        OvertimeType   @default(STANDARD)
  isNightShift                Boolean        @default(false)
  rate                        Decimal        @default(1.25)
  
  // Conversion en récupération (heures)
  convertedToRecovery         Boolean        @default(false)
  recoveryId                  String?
  convertedHoursToRecovery   Decimal        @default(0) // Heures converties en Recovery
  
  // Conversion en récupération (journées) - NOUVEAU
  convertedToRecoveryDays    Boolean        @default(false)
  convertedHoursToRecoveryDays Decimal       @default(0) // Heures converties en RecoveryDay
  
  status                      OvertimeStatus @default(PENDING)
  approvedBy                  String?
  approvedAt                  DateTime?
  rejectionReason            String?
  notes                       String?
  
  employee                    Employee       @relation(fields: [employeeId], references: [id])
  tenant                      Tenant         @relation(fields: [tenantId], references: [id])
  recoveryDays                OvertimeRecoveryDay[] // NOUVEAU
  
  @@index([tenantId])
  @@index([employeeId])
  @@index([status])
  @@index([type])
}

model Recovery {
  // ... existant, pas de modification
}

// NOUVEAU : Journées de récupération
model RecoveryDay {
  id                String   @id @default(uuid())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  tenantId          String
  employeeId        String
  startDate         DateTime @db.Date
  endDate           DateTime @db.Date
  days              Decimal
  sourceHours       Decimal  // Heures supp utilisées
  conversionRate    Decimal?
  status            RecoveryDayStatus @default(PENDING)
  approvedBy        String?
  approvedAt        DateTime?
  notes             String?
  
  employee          Employee @relation(fields: [employeeId], references: [id])
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  overtimeSources   OvertimeRecoveryDay[]
  
  @@index([tenantId])
  @@index([employeeId])
  @@index([startDate])
  @@index([status])
}

// NOUVEAU : Table de liaison Overtime ↔ RecoveryDay
model OvertimeRecoveryDay {
  id            String   @id @default(uuid())
  overtimeId    String
  recoveryDayId String
  hoursUsed     Decimal  // Heures de cet overtime utilisées
  
  overtime      Overtime   @relation(fields: [overtimeId], references: [id], onDelete: Cascade)
  recoveryDay   RecoveryDay @relation(fields: [recoveryDayId], references: [id], onDelete: Cascade)
  
  @@unique([overtimeId, recoveryDayId])
  @@index([overtimeId])
  @@index([recoveryDayId])
}

enum RecoveryDayStatus {
  PENDING
  APPROVED
  USED
  CANCELLED
}
```

### 11.2 Relations

```
Employee
  ├── Overtime[] (heures supp)
  ├── Recovery[] (heures de récupération)
  └── RecoveryDay[] (journées de récupération)

Overtime
  ├── Employee
  └── OvertimeRecoveryDay[] → RecoveryDay

RecoveryDay
  ├── Employee
  └── OvertimeRecoveryDay[] → Overtime
```

---

## 12. API Endpoints Proposés

### 12.1 Endpoints Existants (à Conserver)

```
GET    /overtime                    # Liste des heures supp
GET    /overtime/:id                # Détail d'une heure supp
POST   /overtime                    # Créer une heure supp
PATCH  /overtime/:id                # Modifier une heure supp
POST   /overtime/:id/approve        # Approuver/rejeter
POST   /overtime/:id/convert-to-recovery  # Convertir en heures de récup
GET    /overtime/balance/:employeeId # Solde heures supp
```

### 12.2 Nouveaux Endpoints

```
# Cumul et conversion
GET    /overtime/cumulative-balance/:employeeId
       # Retourne: { cumulativeHours, dailyHours, possibleDays }

POST   /recovery-days/convert-from-overtime
       # Body: { employeeId, days, startDate, endDate, notes? }
       # Convertit le solde cumulé en journées

# Gestion des journées de récupération
GET    /recovery-days
       # Liste des journées de récupération (filtres: employeeId, status, dates)

GET    /recovery-days/:id
       # Détail d'une journée de récupération

POST   /recovery-days/:id/approve
       # Approuver une journée

POST   /recovery-days/:id/cancel
       # Annuler une journée (retourne les heures au solde)

GET    /recovery-days/employee/:employeeId
       # Toutes les journées de récupération d'un employé

GET    /recovery-days/employee/:employeeId/balance
       # Solde et historique des journées
```

---

## 13. Résumé Exécutif

### 13.1 Ce qui doit être Implémenté

1. ✅ **Nouveaux modèles** : `RecoveryDay`, `OvertimeRecoveryDay`
2. ✅ **Modifications** : Ajouter `convertedHoursToRecoveryDays` dans `Overtime`
3. ✅ **Service de calcul** : Calcul du solde cumulé par employé
4. ✅ **Service de conversion** : Conversion heures → journées avec dates
5. ✅ **Validation** : Vérification des dates, chevauchements, etc.
6. ✅ **Interface manager** : Vue du solde et modal de conversion
7. ✅ **API endpoints** : Nouveaux endpoints pour la gestion

### 13.2 Avantages

- ✅ **Flexibilité** : Le manager peut personnaliser le nombre de jours
- ✅ **Traçabilité** : Lien clair entre heures supp et journées de récupération
- ✅ **Gestion fine** : Conversion partielle possible
- ✅ **Validation** : Prévention des erreurs (chevauchements, etc.)

### 13.3 Prochaines Étapes

1. **Validation** de cette analyse avec les parties prenantes
2. **Clarification** des questions ouvertes
3. **Détaillage technique** des endpoints et DTOs
4. **Implémentation** par phases (voir recommandation R1)

---

## 14. Conclusion

Cette analyse propose une solution complète pour gérer la conversion des heures supplémentaires en journées de récupération. Le système est conçu pour être :

- **Flexible** : Le manager peut personnaliser le nombre de jours
- **Traçable** : Historique complet des conversions
- **Sécurisé** : Validations pour éviter les erreurs
- **Performant** : Calculs optimisés du solde

La solution respecte l'architecture existante et s'intègre naturellement avec les modèles `Overtime` et `Recovery` déjà en place.

---

## 15. Impact des Journées de Récupération sur les Autres Modules

### 15.1 Vue d'Ensemble

Les journées de récupération (`RecoveryDay`) doivent être intégrées dans tous les modules du système pour garantir la cohérence des données et des calculs. Cette section détaille l'impact sur chaque module.

---

### 15.2 Impact sur le Pointage (Attendance)

**Module :** `/attendance`  
**Service :** `AttendanceService`

#### **15.2.1 Calcul des Heures Travaillées**

**Problème actuel :**
- Le calcul des heures travaillées se base uniquement sur les pointages IN/OUT
- Les journées de récupération ne sont pas prises en compte

**Impact :**
- Un employé en récupération ne devrait pas être considéré comme absent
- Les heures de récupération doivent être comptabilisées comme heures travaillées

**Modifications nécessaires :**

1. **Méthode `calculateDailyHours`** (attendance.service.ts)
   ```typescript
   private async calculateDailyHours(attendance: any[], employeeId: string, tenantId: string) {
     // ... calcul existant ...
     
     // AJOUT: Vérifier les journées de récupération
     const recoveryDays = await this.prisma.recoveryDay.findMany({
       where: {
         tenantId,
         employeeId,
         status: { in: ['APPROVED', 'USED'] },
         OR: [
           { startDate: { lte: date }, endDate: { gte: date } }
         ]
       }
     });
     
     // Si jour de récupération, considérer comme jour travaillé
     if (recoveryDays.length > 0) {
       // Utiliser les heures de la journée normale ou les heures de récupération
       const dailyHours = recoveryDays[0].days * dailyWorkingHours;
       return { ...dayData, hours: dailyHours, isRecoveryDay: true };
     }
   }
   ```

2. **Méthode `getPresenceRate`** (attendance.service.ts)
   ```typescript
   async getPresenceRate(tenantId, employeeId, startDate, endDate) {
     // ... calcul existant ...
     
     // AJOUT: Compter les journées de récupération comme présences
     const recoveryDays = await this.prisma.recoveryDay.findMany({
       where: {
         tenantId,
         employeeId,
         status: { in: ['APPROVED', 'USED'] },
         OR: [
           {
             startDate: { lte: endDate },
             endDate: { gte: startDate }
           }
         ]
       }
     });
     
     // Calculer les jours de récupération dans la période
     let recoveryDaysCount = 0;
     recoveryDays.forEach(rd => {
       const start = new Date(Math.max(new Date(rd.startDate), startDate));
       const end = new Date(Math.min(new Date(rd.endDate), endDate));
       const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
       recoveryDaysCount += days;
     });
     
     return {
       presenceRate: ((presentDays + recoveryDaysCount) / totalDays) * 100,
       totalDays,
       presentDays: presentDays + recoveryDaysCount,
       absentDays: totalDays - presentDays - recoveryDaysCount,
       leaveDays,
       recoveryDays: recoveryDaysCount // NOUVEAU
     };
   }
   ```

3. **Détection d'Anomalies**
   - **Règle :** Un pointage manquant (absence) ne doit pas être considéré comme anomalie si l'employé est en récupération ce jour-là
   - **Modification :** Vérifier `RecoveryDay` avant de marquer une anomalie d'absence

#### **15.2.2 Affichage dans l'Interface**

**Modifications UI :**
- Afficher un badge "Récupération" sur les jours concernés
- Distinguer visuellement les jours de récupération des jours travaillés normaux
- Permettre de filtrer par type de jour (normal, récupération, congé, absence)

---

### 15.3 Impact sur le Planning (Schedules)

**Module :** `/shifts-planning`  
**Service :** `SchedulesService`

#### **15.3.1 Création de Planning**

**Problème actuel :**
- Le système permet de créer un planning même si l'employé est en récupération
- Pas de validation pour éviter les conflits

**Impact :**
- Un employé en récupération ne devrait pas avoir de planning assigné
- Le planning doit être automatiquement exclu ou marqué comme "Récupération"

**Modifications nécessaires :**

1. **Méthode `create`** (schedules.service.ts)
   ```typescript
   async create(tenantId: string, dto: CreateScheduleDto) {
     // ... validations existantes ...
     
     // AJOUT: Vérifier si l'employé est en récupération ce jour-là
     const recoveryDay = await this.prisma.recoveryDay.findFirst({
       where: {
         tenantId,
         employeeId: dto.employeeId,
         status: { in: ['APPROVED', 'PENDING'] },
         startDate: { lte: new Date(dto.date) },
         endDate: { gte: new Date(dto.date) }
       }
     });
     
     if (recoveryDay) {
       throw new ConflictException(
         `L'employé est en récupération du ${recoveryDay.startDate} au ${recoveryDay.endDate}. ` +
         `Impossible de créer un planning pour cette date.`
       );
     }
     
     // ... reste du code ...
   }
   ```

2. **Méthode `createBulk`** (schedules.service.ts)
   - Appliquer la même validation pour chaque date
   - Exclure automatiquement les dates en récupération

3. **Méthode `findAll`** (schedules.service.ts)
   ```typescript
   async findAll(tenantId, filters) {
     // ... requête existante ...
     
     // AJOUT: Inclure les journées de récupération dans les résultats
     const schedules = await this.prisma.schedule.findMany({ ... });
     
     // Récupérer les journées de récupération dans la période
     const recoveryDays = await this.prisma.recoveryDay.findMany({
       where: {
         tenantId,
         employeeId: filters.employeeId,
         status: { in: ['APPROVED', 'USED'] },
         startDate: { lte: filters.endDate },
         endDate: { gte: filters.startDate }
       },
       include: { employee: true }
     });
     
     // Transformer en format Schedule pour affichage cohérent
     const recoveryDaysAsSchedules = recoveryDays.map(rd => ({
       id: `recovery-${rd.id}`,
       date: rd.startDate,
       employee: rd.employee,
       shift: null,
       isRecoveryDay: true,
       recoveryDay: rd
     }));
     
     return [...schedules, ...recoveryDaysAsSchedules];
   }
   ```

#### **15.3.2 Affichage dans le Planning**

**Modifications UI :**
- Afficher les journées de récupération avec une couleur distincte (ex: vert clair)
- Badge "Récupération" sur les cellules concernées
- Légende pour distinguer : Planning normal / Récupération / Congé / Absence

#### **15.3.3 Génération Automatique de Planning**

**Impact :**
- Les générateurs de planning doivent exclure automatiquement les dates de récupération
- Option : Marquer ces dates comme "non disponibles" dans le générateur

---

### 15.4 Impact sur les Congés et Absences (Leaves)

**Module :** `/leaves`  
**Service :** `LeavesService`

#### **15.4.1 Validation des Dates de Congé**

**Problème actuel :**
- Pas de vérification de chevauchement avec les journées de récupération
- Un employé pourrait avoir un congé et une récupération le même jour

**Impact :**
- Les récupérations doivent être considérées comme des "jours non disponibles" pour les congés
- Validation stricte pour éviter les conflits

**Modifications nécessaires :**

1. **Méthode `create`** (leaves.service.ts)
   ```typescript
   async create(tenantId: string, dto: CreateLeaveDto) {
     // ... validations existantes ...
     
     // AJOUT: Vérifier les chevauchements avec les récupérations
     const conflictingRecoveryDays = await this.prisma.recoveryDay.findMany({
       where: {
         tenantId,
         employeeId: dto.employeeId,
         status: { in: ['APPROVED', 'PENDING'] },
         OR: [
           {
             startDate: { lte: new Date(dto.endDate) },
             endDate: { gte: new Date(dto.startDate) }
           }
         ]
       }
     });
     
     if (conflictingRecoveryDays.length > 0) {
       const dates = conflictingRecoveryDays.map(rd => 
         `${rd.startDate.toISOString().split('T')[0]} - ${rd.endDate.toISOString().split('T')[0]}`
       ).join(', ');
       
       throw new BadRequestException(
         `Conflit avec des journées de récupération existantes : ${dates}. ` +
         `Veuillez choisir d'autres dates ou annuler les récupérations concernées.`
       );
     }
     
     // ... reste du code ...
   }
   ```

2. **Méthode `calculateWorkingDays`** (leaves.service.ts)
   - Exclure automatiquement les jours de récupération du calcul
   - Les récupérations ne doivent pas être comptées comme jours de congé

#### **15.4.2 Calcul du Solde de Congés**

**Impact :**
- Les journées de récupération ne doivent pas être décomptées du solde de congés
- Elles sont distinctes des congés payés

**Aucune modification nécessaire** si la distinction est claire dans le modèle de données.

#### **15.4.3 Rapport des Absences**

**Impact :**
- Les journées de récupération ne doivent pas apparaître comme absences
- Elles doivent être listées séparément dans les rapports

**Modifications nécessaires :**

1. **Méthode `getAbsencesReport`** (reports.service.ts)
   ```typescript
   async getAbsencesReport(tenantId: string, dto: AbsencesReportDto) {
     // ... calcul existant des absences ...
     
     // AJOUT: Exclure les jours de récupération des absences
     const recoveryDays = await this.prisma.recoveryDay.findMany({
       where: {
         tenantId,
         employeeId: dto.employeeId ? dto.employeeId : { in: employeeIds },
         status: { in: ['APPROVED', 'USED'] },
         startDate: { lte: endDate },
         endDate: { gte: startDate }
       }
     });
     
     // Filtrer les absences pour exclure les jours de récupération
     const absencesFiltered = absences.filter(absence => {
       const isRecoveryDay = recoveryDays.some(rd => {
         const rdStart = new Date(rd.startDate);
         const rdEnd = new Date(rd.endDate);
         const absenceDate = new Date(absence.date);
         return absenceDate >= rdStart && absenceDate <= rdEnd;
       });
       return !isRecoveryDay;
     });
     
     return {
       data: {
         anomalies: anomalies,
         absences: absencesFiltered,
         recoveryDays: recoveryDays // NOUVEAU: Section dédiée
       },
       summary: {
         totalAnomalies: anomalies.length,
         totalAbsences: absencesFiltered.length,
         totalRecoveryDays: recoveryDays.length, // NOUVEAU
         // ... reste
       }
     };
   }
   ```

---

### 15.5 Impact sur les Rapports

#### **15.5.1 Rapport de Pointage (Attendance Report)**

**Modifications nécessaires :**

```typescript
async getAttendanceReport(tenantId: string, dto: AttendanceReportDto) {
  // ... calcul existant ...
  
  // AJOUT: Inclure les journées de récupération
  const recoveryDays = await this.prisma.recoveryDay.findMany({
    where: {
      tenantId,
      employeeId: dto.employeeId,
      status: { in: ['APPROVED', 'USED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate }
    },
    include: { employee: true }
  });
  
  // Calculer les heures de récupération
  const settings = await this.prisma.tenantSettings.findUnique({
    where: { tenantId }
  });
  const dailyHours = Number(settings.maxWeeklyHours) / Number(settings.workDaysPerWeek);
  
  let totalRecoveryHours = 0;
  recoveryDays.forEach(rd => {
    totalRecoveryHours += Number(rd.days) * dailyHours;
  });
  
  return {
    data: attendance,
    recoveryDays: recoveryDays, // NOUVEAU
    summary: {
      total: attendance.length,
      anomalies: anomalies.length,
      totalWorkedHours: totalWorkedHours + totalRecoveryHours, // MODIFIÉ
      totalRecoveryHours, // NOUVEAU
      uniqueEmployees,
      totalDays,
      // ... reste
    }
  };
}
```

#### **15.5.2 Rapport des Heures Supplémentaires (Overtime Report)**

**Modifications nécessaires :**

```typescript
async getOvertimeReport(tenantId: string, dto: OvertimeReportDto) {
  // ... calcul existant ...
  
  // AJOUT: Inclure les récupérations converties depuis heures supp
  const recoveryDaysFromOvertime = await this.prisma.recoveryDay.findMany({
    where: {
      tenantId,
      status: { in: ['APPROVED', 'USED'] },
      startDate: { lte: new Date(dto.endDate) },
      endDate: { gte: new Date(dto.startDate) }
    },
    include: {
      employee: true,
      overtimeSources: {
        include: { overtime: true }
      }
    }
  });
  
  // Calculer les heures supp converties en récupération
  let totalHoursConvertedToRecovery = 0;
  recoveryDaysFromOvertime.forEach(rd => {
    totalHoursConvertedToRecovery += Number(rd.sourceHours);
  });
  
  return {
    data: overtimeRecords,
    recoveryDays: recoveryDaysFromOvertime, // NOUVEAU
    summary: {
      totalRecords: overtimeRecords.length,
      totalHours: totalHours,
      totalHoursConvertedToRecovery, // NOUVEAU
      totalHoursPaid: totalHours - totalHoursConvertedToRecovery, // MODIFIÉ
      // ... reste
    }
  };
}
```

#### **15.5.3 Rapport de Paie (Payroll Report)**

**Modifications nécessaires :**

```typescript
async getPayrollReport(tenantId: string, dto: PayrollReportDto) {
  // ... calcul existant ...
  
  // AJOUT: Récupérer les journées de récupération
  const allRecoveryDays = await this.prisma.recoveryDay.findMany({
    where: {
      tenantId,
      employeeId: { in: employeeIds },
      status: { in: ['APPROVED', 'USED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate }
    },
    select: {
      employeeId: true,
      days: true,
      sourceHours: true
    }
  });
  
  // Grouper par employé
  const recoveryDaysByEmployee = new Map<string, { days: number; hours: number }>();
  allRecoveryDays.forEach(rd => {
    const existing = recoveryDaysByEmployee.get(rd.employeeId) || { days: 0, hours: 0 };
    recoveryDaysByEmployee.set(rd.employeeId, {
      days: existing.days + Number(rd.days),
      hours: existing.hours + Number(rd.sourceHours)
    });
  });
  
  // Construire les données de paie
  const payrollData = employees.map(employee => {
    const workedDays = attendanceByEmployee.get(employee.id) || 0;
    const overtimeHours = overtimeByEmployee.get(employee.id) || 0;
    const leaveDays = leaveByEmployee.get(employee.id) || 0;
    const absenceDays = absenceByEmployee.get(employee.id) || 0;
    const recoveryDays = recoveryDaysByEmployee.get(employee.id) || { days: 0, hours: 0 };
    
    return {
      employee: { ... },
      period: { ... },
      workedDays,
      normalHours: workedDays * 8,
      overtimeHours,
      leaveDays,
      recoveryDays: recoveryDays.days, // NOUVEAU
      recoveryHours: recoveryDays.hours, // NOUVEAU
      absenceDays,
      totalHours: (workedDays * 8) + overtimeHours + recoveryDays.hours, // MODIFIÉ
    };
  });
  
  // Statistiques globales
  const totalRecoveryDays = payrollData.reduce((sum, d) => sum + d.recoveryDays, 0);
  const totalRecoveryHours = payrollData.reduce((sum, d) => sum + d.recoveryHours, 0);
  
  return {
    data: payrollData,
    summary: {
      totalEmployees,
      totalWorkedDays,
      totalNormalHours,
      totalOvertimeHours,
      totalLeaveDays,
      totalRecoveryDays, // NOUVEAU
      totalRecoveryHours, // NOUVEAU
      totalHours: totalNormalHours + totalOvertimeHours + totalRecoveryHours, // MODIFIÉ
      // ... reste
    }
  };
}
```

#### **15.5.4 Rapport de Planning (Planning Report)**

**Modifications nécessaires :**

```typescript
async getPlanningReport(tenantId: string, dto: any) {
  // ... récupération des schedules ...
  
  // AJOUT: Inclure les journées de récupération
  const recoveryDays = await this.prisma.recoveryDay.findMany({
    where: {
      tenantId,
      employeeId: dto.employeeId,
      status: { in: ['APPROVED', 'USED'] },
      startDate: { lte: new Date(dto.endDate) },
      endDate: { gte: new Date(dto.startDate) }
    },
    include: {
      employee: {
        include: {
          department: true,
          positionRef: true,
          site: true,
          team: true
        }
      }
    }
  });
  
  // Transformer en format planning
  const recoveryDaysAsPlanning = recoveryDays.map(rd => ({
    id: `recovery-${rd.id}`,
    date: rd.startDate,
    employee: {
      id: rd.employee.id,
      name: `${rd.employee.firstName} ${rd.employee.lastName}`,
      employeeNumber: rd.employee.matricule,
      department: rd.employee.department?.name || 'N/A',
      position: rd.employee.positionRef?.name || 'N/A',
      site: rd.employee.site?.name || 'N/A',
      team: rd.employee.team?.name || 'N/A'
    },
    shift: null,
    isRecoveryDay: true,
    recoveryDay: rd
  }));
  
  return {
    data: [...planningData, ...recoveryDaysAsPlanning],
    summary: {
      totalSchedules: totalSchedules + recoveryDays.length,
      uniqueEmployees,
      uniqueShifts,
      totalRecoveryDays: recoveryDays.length, // NOUVEAU
      // ... reste
    }
  };
}
```

#### **15.5.5 Dashboard Statistiques**

**Modifications nécessaires :**

```typescript
async getTenantDashboardStatsInternal(tenantId: string, query: DashboardStatsQueryDto) {
  // ... calculs existants ...
  
  // AJOUT: Statistiques des récupérations
  const recoveryStats = await this.prisma.recoveryDay.aggregate({
    where: {
      tenantId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      status: { in: ['APPROVED', 'USED'] }
    },
    _sum: {
      days: true,
      sourceHours: true
    },
    _count: {
      id: true
    }
  });
  
  return {
    // ... données existantes ...
    recovery: { // NOUVEAU
      totalDays: Number(recoveryStats._sum.days || 0),
      totalHours: Number(recoveryStats._sum.sourceHours || 0),
      totalRecords: recoveryStats._count.id
    }
  };
}
```

---

### 15.6 Récapitulatif des Modifications par Module

| Module | Service | Méthodes à Modifier | Impact |
|--------|---------|---------------------|--------|
| **Attendance** | `AttendanceService` | `calculateDailyHours`, `getPresenceRate` | ✅ Comptabiliser les récupérations comme jours travaillés |
| **Schedules** | `SchedulesService` | `create`, `createBulk`, `findAll` | ✅ Exclure les dates de récupération du planning |
| **Leaves** | `LeavesService` | `create`, `calculateWorkingDays` | ✅ Valider les chevauchements avec récupérations |
| **Reports** | `ReportsService` | `getAttendanceReport`, `getOvertimeReport`, `getPayrollReport`, `getAbsencesReport`, `getPlanningReport`, `getTenantDashboardStats` | ✅ Inclure les récupérations dans tous les rapports |

---

### 15.7 Règles de Cohérence

#### **R1 : Priorité des Statuts**
1. **Congé approuvé** > Récupération (un congé prime sur une récupération)
2. **Récupération approuvée** > Planning (pas de planning si récupération)
3. **Récupération** ≠ Absence (ne pas compter comme absence)

#### **R2 : Calcul des Heures**
- **Heures travaillées** = Heures pointées + Heures de récupération
- **Heures de récupération** = `days × dailyWorkingHours`
- **Heures supp converties** = `sourceHours` de `RecoveryDay`

#### **R3 : Validation des Dates**
- Vérifier les chevauchements avant création de congé
- Vérifier les chevauchements avant création de planning
- Exclure automatiquement les dates de récupération des générateurs

---

### 15.8 Points d'Attention

#### **PA1 : Performance**
- Les requêtes `RecoveryDay` doivent être optimisées avec des index
- Utiliser des requêtes groupées pour éviter les N+1 queries

#### **PA2 : Cache**
- Mettre en cache les récupérations par employé pour les calculs fréquents
- Invalider le cache lors de création/modification de récupération

#### **PA3 : Migration des Données**
- Les récupérations existantes (modèle `Recovery` en heures) doivent être migrées si nécessaire
- Créer un script de migration pour convertir les anciennes récupérations

#### **PA4 : Interface Utilisateur**
- Badge visuel distinct pour les récupérations
- Filtres pour afficher/masquer les récupérations
- Légende claire dans tous les modules

---

### 15.9 Checklist d'Implémentation

- [ ] Modifier `AttendanceService` pour inclure les récupérations
- [ ] Modifier `SchedulesService` pour exclure les dates de récupération
- [ ] Modifier `LeavesService` pour valider les chevauchements
- [ ] Modifier tous les rapports pour inclure les récupérations
- [ ] Ajouter les index nécessaires sur `RecoveryDay`
- [ ] Créer les migrations de base de données
- [ ] Mettre à jour les interfaces utilisateur
- [ ] Ajouter les tests unitaires pour chaque modification
- [ ] Documenter les changements dans l'API

---

**Document créé le :** [Date]
**Version :** 1.1
**Auteur :** Analyse système
