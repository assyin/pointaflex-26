# Analyse des Jours Supplémentaires - PointaFlex

## Contexte

### Situation Actuelle
- Les employés du département CP (et autres) ont un **shift par défaut** (ex: Lundi-Vendredi)
- Ils n'ont **pas de planning personnalisé**
- Quand ils travaillent le **weekend** ou un **jour férié**, ces jours doivent être comptabilisés comme **Jours Supplémentaires**

### Distinction Importante

| Concept | Description | Exemple |
|---------|-------------|---------|
| **Heures Supplémentaires** | Heures travaillées AU-DELÀ de la durée normale d'une journée de travail | Shift 8h-17h, l'employé part à 19h → 2h sup |
| **Jours Supplémentaires** | Jours travaillés EN DEHORS du planning normal (weekend, férié) | L'employé travaille le samedi alors que son shift est Lun-Ven |

---

## Scénarios Possibles

### Scénario 1: Travail le Samedi (Weekend)
```
Employé: Adil GHANDAOUI
Shift par défaut: Lundi-Vendredi 08:00-17:00
Événement: Travaille le Samedi 25/01/2026 de 08:00 à 16:00

Résultat attendu:
→ 1 Jour Supplémentaire (type: WEEKEND)
→ 8 heures comptabilisées
→ Taux de majoration: selon configuration (ex: 1.5x)
```

### Scénario 2: Travail le Dimanche
```
Employé: Adil GHANDAOUI
Shift par défaut: Lundi-Vendredi 08:00-17:00
Événement: Travaille le Dimanche 26/01/2026 de 09:00 à 14:00

Résultat attendu:
→ 1 Jour Supplémentaire (type: WEEKEND_SUNDAY)
→ 5 heures comptabilisées
→ Taux de majoration: potentiellement plus élevé que samedi
```

### Scénario 3: Travail un Jour Férié
```
Employé: Adil GHANDAOUI
Shift par défaut: Lundi-Vendredi 08:00-17:00
Événement: Travaille le Jeudi 01/01/2026 (Jour de l'An) de 08:00 à 17:00

Résultat attendu:
→ 1 Jour Supplémentaire (type: HOLIDAY)
→ 9 heures comptabilisées
→ Taux de majoration: selon configuration (ex: 2x)
```

### Scénario 4: Jour Férié tombant un Weekend
```
Employé: Adil GHANDAOUI
Événement: Le 01/05 (Fête du Travail) tombe un Dimanche

Question: Quel type appliquer?
Options:
  A) WEEKEND_SUNDAY (car c'est un dimanche)
  B) HOLIDAY (car c'est un férié)
  C) HOLIDAY_WEEKEND (cumul - taux maximum)

Recommandation: Option C - Appliquer le taux le plus avantageux pour l'employé
```

### Scénario 5: Travail Partiel le Weekend
```
Employé: Adil GHANDAOUI
Événement: Travaille le Samedi de 08:00 à 12:00 (4 heures seulement)

Questions:
→ Compter comme 1 jour ou comme 0.5 jour?
→ Seuil minimum pour comptabiliser un jour supplémentaire?

Options:
  A) Compter en heures (4h supplémentaires type WEEKEND)
  B) Compter en jours avec fraction (0.5 jour)
  C) Compter 1 jour complet dès qu'il y a présence
```

### Scénario 6: Combinaison Heures Sup + Jour Sup
```
Employé: Adil GHANDAOUI
Événement:
  - Vendredi: Travaille de 08:00 à 20:00 (3h supplémentaires)
  - Samedi: Travaille de 08:00 à 16:00 (jour supplémentaire)

Résultat attendu:
→ 3 Heures Supplémentaires (type: STANDARD) pour Vendredi
→ 1 Jour Supplémentaire (type: WEEKEND) pour Samedi
→ Les deux doivent être gérés séparément
```

### Scénario 7: Employé avec Planning Personnalisé vs Shift par Défaut
```
Cas A - Shift par défaut (Lun-Ven):
  → Travail Samedi = Jour Supplémentaire

Cas B - Planning personnalisé (inclut Samedi):
  → Travail Samedi = Normal (pas de jour sup)
  → L'employé a un planning qui inclut le samedi dans sa semaine de travail
```

---

## Architecture Proposée

### Option 1: Extension du Module Overtime Existant

```
Module Overtime actuel
├── Heures Supplémentaires (STANDARD, NIGHT, HOLIDAY, EMERGENCY)
└── [NOUVEAU] Jours Supplémentaires (WEEKEND_SAT, WEEKEND_SUN, HOLIDAY)
```

**Avantages:**
- Réutilisation du code existant
- Interface unifiée
- Conversion en récupération déjà implémentée

**Inconvénients:**
- Mélange de concepts différents (heures vs jours)
- Logique de calcul différente
- Risque de confusion pour les utilisateurs

### Option 2: Module Séparé "Jours Supplémentaires" (RECOMMANDÉ)

```
├── Module Overtime (Heures Supplémentaires)
│   └── Gère les heures au-delà du shift normal
│
└── Module SupplementaryDays (Jours Supplémentaires) [NOUVEAU]
    └── Gère les jours travaillés hors planning
```

**Avantages:**
- Séparation claire des responsabilités
- Interface dédiée plus intuitive
- Logique métier distincte
- Rapports séparés
- Taux de majoration indépendants

**Inconvénients:**
- Plus de développement
- Deux endroits à vérifier pour le manager

### Option 3: Sous-onglet dans Overtime

```
Page Overtime
├── Onglet "Heures Supplémentaires"
│   └── Liste des HS classiques
└── Onglet "Jours Supplémentaires" [NOUVEAU]
    └── Liste des jours travaillés hors planning
```

**Avantages:**
- Tout au même endroit
- Navigation simple
- Partage des composants UI

---

## Recommandation: Option 3 (Sous-onglet)

### Structure de l'Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Gestion des Heures Supplémentaires                             │
│  Demandes, approbations et récupérations                        │
├─────────────────────────────────────────────────────────────────┤
│  [Heures Supplémentaires]  [Jours Supplémentaires]  [Dashboard] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Onglet "Heures Supplémentaires":                              │
│  - Liste actuelle des HS                                        │
│  - Heures travaillées au-delà du shift                         │
│                                                                 │
│  Onglet "Jours Supplémentaires":                               │
│  - Liste des jours travaillés hors planning                    │
│  - Weekends, jours fériés                                       │
│  - Affichage: Date, Type, Heures, Statut, Actions              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Modèle de Données Proposé

```prisma
model SupplementaryDay {
  id              String   @id @default(uuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  tenantId        String
  employeeId      String

  date            DateTime @db.Date
  hours           Decimal  // Heures travaillées ce jour

  // Type de jour supplémentaire
  type            SupplementaryDayType

  // Statut du workflow
  status          OvertimeStatus @default(PENDING)

  // Source de détection
  source          String   // AUTO_DETECTED, MANUAL

  // Informations de pointage
  checkIn         DateTime?
  checkOut        DateTime?

  // Approbation
  approvedBy      String?
  approvedAt      DateTime?
  approvedHours   Decimal?
  rejectionReason String?

  // Conversion en récupération
  convertedToRecovery Boolean @default(false)

  // Taux appliqué
  rate            Decimal?

  notes           String?

  // Relations
  employee        Employee @relation(...)
  tenant          Tenant   @relation(...)
}

enum SupplementaryDayType {
  WEEKEND_SATURDAY    // Samedi
  WEEKEND_SUNDAY      // Dimanche
  HOLIDAY             // Jour férié
  HOLIDAY_WEEKEND     // Férié tombant un weekend
}
```

### Détection Automatique

```
Processus de détection (lors du traitement des pointages):

1. Récupérer le pointage de l'employé pour une date
2. Vérifier si l'employé a un planning personnalisé pour cette date
   - SI OUI → Vérifier si c'est un jour de travail prévu
   - SI NON → Utiliser le shift par défaut
3. Déterminer si le jour est:
   - Un weekend (samedi/dimanche)
   - Un jour férié (table Holidays)
4. SI jour hors planning ET pointage présent:
   → Créer automatiquement un SupplementaryDay
   → Statut: PENDING (en attente d'approbation)
```

### Workflow d'Approbation

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│ DETECTED │ ──► │ PENDING  │ ──► │ APPROVED  │ ──► │RECOVERED │
│  (auto)  │     │(attente) │     │(approuvé) │     │(converti)│
└──────────┘     └──────────┘     └───────────┘     └──────────┘
                      │                 │
                      ▼                 ▼
                ┌──────────┐      ┌──────────┐
                │ REJECTED │      │   PAID   │
                │ (rejeté) │      │  (payé)  │
                └──────────┘      └──────────┘
```

### Taux de Majoration (DÉSACTIVÉS)

| Type | Taux appliqué | Note |
|------|---------------|------|
| WEEKEND_SATURDAY | 1.0x (100%) | Pas de majoration |
| WEEKEND_SUNDAY | 1.0x (100%) | Pas de majoration |
| HOLIDAY | 1.0x (100%) | Pas de majoration |
| Tous les types HS | 1.0x (100%) | Pas de majoration |

> **Note**: Les majorations sont désactivées dans TenantSettings.
> 1 heure travaillée = 1 heure comptabilisée (pas de multiplication).

---

## Décisions Confirmées

| Question | Décision |
|----------|----------|
| **Seuil minimum** | Dès la 1ère heure de travail |
| **Cumul des types** | Compter comme une journée normale (pas de cumul férié+weekend) |
| **Conversion en récupération** | Oui, même logique que overtime |
| **Approbation** | Mêmes permissions, même workflow que les HS |
| **Intégration paie** | Même format que les HS |
| **Majorations** | DÉSACTIVÉES (taux = 1.0 pour tous les types) |

### Configuration Confirmée
- `overtimeMajorationEnabled` = **false**
- Tous les taux = **1.0** (pas de majoration)

---

## Plan d'Implémentation (si approuvé)

### Phase 1: Base de données
- Créer le modèle SupplementaryDay
- Migrer la base de données
- Créer les relations

### Phase 2: Backend
- Service SupplementaryDaysService
- Controller avec endpoints CRUD
- Logique de détection automatique
- Intégration avec le traitement des pointages

### Phase 3: Frontend
- Nouvel onglet dans la page Overtime
- Liste des jours supplémentaires
- Formulaires d'approbation/rejet
- Conversion en récupération

### Phase 4: Configuration
- Paramètres dans TenantSettings
- Taux configurables
- Seuils configurables

---

## Conclusion - Décision Finale

**Solution retenue**: Option 3 (Sous-onglet dans la page Overtime)

### Spécifications Confirmées

1. **Interface**: Nouvel onglet "Jours Supplémentaires" dans la page Overtime
2. **Détection**: Automatique basée sur shift par défaut vs planning personnalisé
3. **Seuil**: Dès la 1ère heure de travail
4. **Cumul férié+weekend**: Non (compter comme journée normale)
5. **Workflow**: Identique aux Heures Supplémentaires
6. **Permissions**: Identiques aux HS
7. **Conversion récupération**: Oui, même logique
8. **Majorations**: DÉSACTIVÉES (taux = 1.0)
9. **Export paie**: Même format que les HS

### Prochaines Étapes
1. Créer le modèle de données SupplementaryDay
2. Implémenter le backend (service + controller)
3. Ajouter l'onglet dans le frontend
4. Intégrer la détection automatique avec le traitement des pointages
