# Analyse Complète : Gestion du Remplacement d'Employés Absents

## Résumé Exécutif

Cette analyse examine la capacité du système PointageFlex à gérer le remplacement d'employés absents qui ont déjà un planning créé. **Conclusion principale** : Le système dispose d'une infrastructure de remplacement, mais celle-ci présente des **lacunes critiques** dans la logique opérationnelle.

---

## 1. ÉTAT ACTUEL DE L'INFRASTRUCTURE

### 1.1 Modèle de Données

#### Table `ShiftReplacement`
Le système dispose d'une table dédiée pour les remplacements :

```prisma
model ShiftReplacement {
  id                    String            @id @default(uuid())
  tenantId              String
  date                  DateTime          @db.Date
  originalEmployeeId    String            // Employé remplacé
  replacementEmployeeId String            // Employé remplaçant
  shiftId               String
  reason                String?
  status                ReplacementStatus @default(PENDING)
  approvedBy            String?
  approvedAt            DateTime?
}
```

**Points clés** :
- ✅ Structure de données appropriée
- ✅ Gestion du workflow d'approbation (PENDING → APPROVED/REJECTED)
- ✅ Traçabilité (approvedBy, approvedAt)
- ⚠️ **Aucune relation directe avec la table `Schedule`**

#### Table `Schedule`
```prisma
model Schedule {
  employeeId String
  shiftId    String
  date       DateTime @db.Date
  // ... autres champs
  
  @@unique([employeeId, date])  // UN employé UN planning par jour
}
```

**Contrainte critique** : La contrainte unique `employeeId + date` implique qu'un employé ne peut avoir qu'**un seul planning par jour**.

---

## 2. FLUX DE TRAVAIL ACTUEL

### 2.1 Création d'un Remplacement

**Endpoint** : `POST /schedules/replacements`

**Logique actuelle** (`schedules.service.ts:1031-1085`) :
```typescript
async createReplacement(tenantId: string, dto: CreateReplacementDto) {
  // ✅ Vérifie que les employés existent et appartiennent au tenant
  // ✅ Vérifie que le shift existe
  // ❌ NE vérifie PAS si l'employé original a un planning à cette date
  // ❌ NE vérifie PAS si l'employé remplaçant a déjà un planning à cette date
  // ❌ NE crée/modifie PAS de Schedule
  
  return this.prisma.shiftReplacement.create({...});
}
```

**Validations présentes** :
- ✅ Employés existants et dans le bon tenant
- ✅ Shift existe et dans le bon tenant

**Validations manquantes** :
- ❌ **Aucune vérification de l'existence d'un planning pour l'employé original**
- ❌ **Aucune vérification de disponibilité de l'employé remplaçant** (conflict check)
- ❌ **Aucune vérification des conflits d'horaires**

### 2.2 Approbation d'un Remplacement

**Endpoint** : `PATCH /schedules/replacements/:id/approve`

**Logique actuelle** (`schedules.service.ts:1136-1170`) :
```typescript
async approveReplacement(tenantId: string, id: string, approvedBy: string) {
  // ✅ Trouve le remplacement
  // ✅ Met à jour le statut à APPROVED
  // ❌ NE modifie PAS le Schedule de l'employé original
  // ❌ NE crée PAS un Schedule pour l'employé remplaçant
  // ❌ Le planning original reste inchangé dans la base
  
  return this.prisma.shiftReplacement.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy, approvedAt: new Date() }
  });
}
```

**Impact** : Un remplacement approuvé est **uniquement une annotation métier**, il ne modifie **aucun planning réel**.

---

## 3. PROBLÈMES IDENTIFIÉS

### 3.1 Problème Critique #1 : Absence de Lien avec les Plannings

**Symptôme** : Les remplacements sont des entités **déconnectées** des plannings.

**Conséquences** :
- Un remplacement peut être créé même si l'employé original **n'a pas de planning** à cette date
- Un remplacement peut être créé même si l'employé remplaçant **a déjà un planning** à cette date (violation future de contrainte unique)
- L'approbation d'un remplacement **ne modifie pas** les plannings existants

**Exemple de scénario problématique** :
```
Jour J-1 :
  - Employé A : Planning créé pour le 15/01 (Shift Matin)
  - Employé B : Planning créé pour le 15/01 (Shift Soir)

Jour J :
  - Création remplacement : B remplace A le 15/01
  - Approbation du remplacement
  
Résultat :
  - Planning A existe toujours (15/01, Shift Matin) ❌
  - Planning B existe toujours (15/01, Shift Soir) ❌
  - Remplacement approuvé mais sans effet réel ❌
  - Si on tente de créer un planning B pour le 15/01 avec Shift Matin → ERREUR contrainte unique
```

### 3.2 Problème Critique #2 : Pas de Validation de Disponibilité

**Symptôme** : Aucune vérification avant création de remplacement.

**Ce qui devrait être vérifié** :
1. L'employé original **a bien un planning** à cette date
2. L'employé remplaçant **n'a pas de planning** à cette date (ou gestion intelligente du conflit)
3. L'employé remplaçant **n'a pas de conflit d'horaires** (chevauchement de shifts)
4. L'employé remplaçant **respecte les règles de repos** (11h entre shifts)

**Actuellement** : Aucune de ces vérifications n'est effectuée.

### 3.3 Problème Critique #3 : Approbation Sans Effet Réel

**Symptôme** : L'approbation ne modifie pas les données opérationnelles.

**Ce qui devrait se passer lors de l'approbation** :

**Option A - Remplacement pur** :
1. Vérifier que le planning original existe
2. **Supprimer ou désactiver** le planning de l'employé original
3. **Créer** un planning pour l'employé remplaçant (même shift, même date)
4. Gérer les conflits si le remplaçant a déjà un planning

**Option B - Échange** :
1. Si l'employé remplaçant a un planning à cette date, faire un **échange de plannings**
2. Sinon, appliquer l'Option A

**Actuellement** : Rien ne se passe → le remplacement est juste un "metadata" sans impact sur les plannings.

### 3.4 Problème #4 : Cohérence des Affichages

**Symptôme** : Le frontend reçoit séparément `schedules` et `replacements`.

**Endpoint `GET /schedules/week/:date`** retourne :
```typescript
{
  schedules: Schedule[],      // Plannings réels
  leaves: Leave[],            // Congés
  replacements: Replacement[] // Remplacements (séparés)
}
```

**Question métier** : Quand un remplacement est approuvé, que doit afficher le frontend ?
- Le planning original de l'employé A (mais il est absent) ?
- Le planning théorique pour l'employé B (mais il n'existe pas en base) ?
- Une logique de fusion dans le frontend ?

**Actuellement** : Le frontend doit implémenter sa propre logique de fusion, ce qui peut créer des incohérences.

---

## 4. ANALYSE DE LA LOGIQUE MÉTIER ATTENDUE

### 4.1 Scénario Type : Employé Absent avec Planning

**Contexte** :
- Employé A a un planning le 15/01 (Shift Matin, 08:00-16:00)
- Employé A est absent (congé maladie, urgence, etc.)
- On veut que l'Employé B remplace A le 15/01

**Workflow attendu** :

```
1. DÉTECTION
   - Système détecte : Employé A a un planning le 15/01
   - Manager/admin crée une demande de remplacement

2. VALIDATION
   - Vérifier que A a bien un planning le 15/01 ✅
   - Vérifier que B est disponible le 15/01 (pas de planning conflictuel)
   - Vérifier que B peut travailler le Shift Matin (compétences, autorisations)
   - Vérifier les règles légales (repos suffisant, heures max)

3. APPROBATION
   - Manager approuve le remplacement
   - Système exécute l'action :
     a) Marquer le planning de A comme "remplacé" (soft delete ou flag)
     b) Créer un planning pour B (15/01, Shift Matin)
     c) Lier les deux plannings au remplacement pour traçabilité

4. POINTAGE
   - Le 15/01, B pointe normalement
   - Le système enregistre la présence de B (pas A)
   - Les rapports reflètent que B a remplacé A
```

### 4.2 Gestion des Conflits

**Cas 1 : Remplaçant a déjà un planning le même jour**
```
Employé B a déjà un planning le 15/01 (Shift Soir, 16:00-00:00)
Demande : B remplace A le 15/01 (Shift Matin, 08:00-16:00)

Options :
- ❌ Rejeter (doublon de planning interdit par contrainte unique)
- ✅ Proposer l'annulation/remplacement du planning existant de B
- ✅ Si horaires compatibles, permettre le double shift (avec validation légale)
```

**Cas 2 : Remplaçant a un planning le jour précédent/suivant**
```
Employé B a un planning le 14/01 (Shift Soir, 16:00-00:00)
Demande : B remplace A le 15/01 (Shift Matin, 08:00-16:00)

Vérification nécessaire :
- Repos entre shifts : 00:00 (fin 14/01) à 08:00 (début 15/01) = 8h
- Règle légale : minimum 11h de repos ❌
- Système doit ALERTER (ou bloquer selon politique)
```

---

## 5. POINTS FORTS ACTUELS

### 5.1 Infrastructure Existante

1. **Table dédiée** : `ShiftReplacement` est bien conçue structurellement
2. **Workflow d'approbation** : PENDING → APPROVED/REJECTED fonctionne
3. **Traçabilité** : `approvedBy`, `approvedAt` permettent l'audit
4. **Raison du remplacement** : Champ `reason` permet la documentation
5. **Récupération conjointe** : Les endpoints retournent `schedules` + `replacements` ensemble

### 5.2 Génération de Données de Test

Le service `DataGeneratorReplacementService` montre une compréhension correcte :
- Il crée des remplacements **basés sur des plannings existants** (ligne 31-38)
- Il utilise les mêmes `date` et `shiftId` que le planning original
- Cela suggère que l'intention métier est bien de remplacer un planning existant

---

## 6. LACUNES IDENTIFIÉES

### 6.1 Validation Avant Création

**Manquant** :
```typescript
// Vérification que l'employé original a un planning
const originalSchedule = await this.prisma.schedule.findFirst({
  where: {
    employeeId: dto.originalEmployeeId,
    date: new Date(dto.date),
    tenantId
  }
});

if (!originalSchedule) {
  throw new BadRequestException(
    'L\'employé original n\'a pas de planning à cette date'
  );
}

// Vérification que l'employé remplaçant est disponible
const replacementSchedule = await this.prisma.schedule.findFirst({
  where: {
    employeeId: dto.replacementEmployeeId,
    date: new Date(dto.date),
    tenantId
  }
});

if (replacementSchedule) {
  throw new ConflictException(
    'L\'employé remplaçant a déjà un planning à cette date'
  );
}
```

### 6.2 Action Lors de l'Approbation

**Manquant** :
```typescript
async approveReplacement(...) {
  const replacement = await this.prisma.shiftReplacement.findFirst(...);
  
  // 1. Vérifier que le planning original existe toujours
  const originalSchedule = await this.prisma.schedule.findFirst({
    where: {
      employeeId: replacement.originalEmployeeId,
      date: replacement.date,
      tenantId
    }
  });

  if (!originalSchedule) {
    throw new BadRequestException('Le planning original n\'existe plus');
  }

  // 2. Vérifier disponibilité du remplaçant
  const existingSchedule = await this.prisma.schedule.findFirst({
    where: {
      employeeId: replacement.replacementEmployeeId,
      date: replacement.date,
      tenantId
    }
  });

  if (existingSchedule) {
    throw new ConflictException('Le remplaçant a déjà un planning à cette date');
  }

  // 3. CRÉER le planning pour le remplaçant
  await this.prisma.schedule.create({
    data: {
      tenantId: replacement.tenantId,
      employeeId: replacement.replacementEmployeeId,
      shiftId: replacement.shiftId,
      date: replacement.date,
      teamId: originalSchedule.teamId, // Conserver l'équipe si pertinent
      notes: `Remplacement de ${originalSchedule.employeeId} - ${replacement.reason}`
    }
  });

  // 4. OPTION A : Supprimer le planning original
  await this.prisma.schedule.delete({ where: { id: originalSchedule.id } });
  
  // OU OPTION B : Marquer comme "remplacé" (soft delete avec flag)
  // await this.prisma.schedule.update({
  //   where: { id: originalSchedule.id },
  //   data: { isReplaced: true, replacedBy: replacement.id }
  // });

  // 5. Mettre à jour le statut du remplacement
  return this.prisma.shiftReplacement.update({...});
}
```

### 6.3 Gestion des Conflits d'Horaires

**Manquant** : Vérification des chevauchements et des règles de repos.

**Nécessaire** :
- Comparer les horaires des shifts (startTime, endTime)
- Calculer le temps de repos entre shifts
- Vérifier les limites légales (heures hebdomadaires, repos minimum)

### 6.4 Relation Entre Tables

**Manquant** : Aucune clé étrangère ou relation explicite entre `ShiftReplacement` et `Schedule`.

**Suggestion** : Ajouter une relation optionnelle :
```prisma
model ShiftReplacement {
  // ... champs existants
  originalScheduleId String?  // Planning original remplacé
  replacementScheduleId String? // Planning créé pour le remplaçant
  
  originalSchedule Schedule? @relation("OriginalSchedule", fields: [originalScheduleId], references: [id])
  replacementSchedule Schedule? @relation("ReplacementSchedule", fields: [replacementScheduleId], references: [id])
}
```

---

## 7. RECOMMANDATIONS

### 7.1 Priorité HAUTE : Implémenter la Logique Opérationnelle

1. **Validation avant création** :
   - Vérifier existence du planning original
   - Vérifier disponibilité du remplaçant
   - Vérifier conflits d'horaires

2. **Action lors de l'approbation** :
   - Créer le planning pour le remplaçant
   - Gérer le planning original (suppression ou flag "remplacé")
   - Gérer les transactions pour garantir la cohérence

3. **Gestion des erreurs** :
   - Si le planning original n'existe plus → rejeter/annuler le remplacement
   - Si le remplaçant n'est plus disponible → rejeter/annuler

### 7.2 Priorité MOYENNE : Améliorer la Traçabilité

1. **Lier les plannings aux remplacements** :
   - Ajouter `originalScheduleId` et `replacementScheduleId` dans `ShiftReplacement`
   - Permettre la navigation bidirectionnelle

2. **Historique** :
   - Conserver une trace du planning original même s'il est supprimé
   - Permettre de voir qui a remplacé qui et quand

### 7.3 Priorité MOYENNE : Règles Métier Avancées

1. **Vérifications légales** :
   - Repos minimum entre shifts
   - Heures hebdomadaires maximales
   - Gestion des shifts de nuit

2. **Notifications** :
   - Notifier l'employé original
   - Notifier l'employé remplaçant
   - Notifier les managers

### 7.4 Priorité BASSE : Améliorations UX

1. **Recherche intelligente de remplaçants** :
   - Suggérer des employés disponibles
   - Filtrer par compétences, équipe, site

2. **Affichage dans le planning** :
   - Visualiser clairement les remplacements
   - Distinguer planning normal vs remplacement

---

## 8. IMPACT SUR LES AUTRES MODULES

### 8.1 Module Pointage (Attendance)

**Question** : Si un remplacement est approuvé, qui doit pointer ?

**Réponse attendue** : L'employé remplaçant doit pointer normalement. Le système doit :
- Enregistrer la présence du remplaçant
- Faire le lien avec le remplacement pour les rapports
- Potentiellement exclure l'employé original des alertes d'absence ce jour-là

**État actuel** : Non vérifié, nécessite analyse du module Attendance.

### 8.2 Module Alertes Légales

**Question** : Les remplacements affectent-ils les calculs d'heures hebdomadaires ?

**Réponse attendue** : Oui. Si B remplace A, les heures de B doivent inclure ce shift.

**État actuel** : Les alertes sont calculées sur les `Schedule`, donc si un planning est créé pour le remplaçant, il sera inclus. ✅

### 8.3 Module Congés (Leaves)

**Question** : Un remplacement doit-il être lié à un congé/absence ?

**Réponse attendue** : Souvent oui. Un remplacement est souvent déclenché par :
- Un congé approuvé de l'employé original
- Une absence maladie
- Une urgence

**Suggestion** : Ajouter un champ `leaveId` optionnel dans `ShiftReplacement` pour tracer le lien.

---

## 9. CONCLUSION

### État Actuel

Le système dispose d'une **infrastructure de base solide** pour gérer les remplacements, mais la **logique opérationnelle est incomplète**. Les remplacements existent comme des entités "méta" sans impact réel sur les plannings.

### Ce qui Fonctionne

✅ Structure de données appropriée  
✅ Workflow d'approbation  
✅ Traçabilité de base  
✅ Récupération conjointe avec les plannings

### Ce qui Manque

❌ Validation de l'existence du planning original  
❌ Validation de la disponibilité du remplaçant  
❌ Modification des plannings lors de l'approbation  
❌ Gestion des conflits d'horaires  
❌ Relation explicite entre remplacements et plannings

### Prochaines Étapes Recommandées

1. **Court terme** : Implémenter les validations de base et la logique d'approbation qui modifie réellement les plannings
2. **Moyen terme** : Améliorer la traçabilité et la gestion des conflits
3. **Long terme** : Fonctionnalités avancées (suggestions intelligentes, notifications, intégration avec les congés)

---

**Date d'analyse** : 2024  
**Version du système analysée** : Dernière version disponible
