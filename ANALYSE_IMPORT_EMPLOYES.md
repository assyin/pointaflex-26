# Analyse Import Employés - PointaFlex

## 1. Structure Actuelle du Fichier Excel

Le fichier `Liste personnel 102025.xlsx` contient **1078 employés** avec **20 colonnes** :

| Col | En-tête Actuel | Mapping Backend | Status |
|-----|----------------|-----------------|--------|
| 0 | Matricule | `matricule` | ✅ OK |
| 1 | Civilité | `civilite` | ✅ OK |
| 2 | Nom | `lastName` | ✅ OK |
| 3 | Prénom | `firstName` | ✅ OK |
| 4 | Situation Familiale | `situationFamiliale` | ✅ OK |
| 5 | Nb Enf | `nombreEnfants` | ✅ OK |
| 6 | Date de Naissance | `dateOfBirth` | ✅ OK |
| 7 | N° CNSS | `cnss` | ✅ OK |
| 8 | N° CIN | `cin` | ✅ OK |
| 9 | Adresse | `address` | ✅ OK |
| 10 | Ville | `ville` | ✅ OK |
| 11 | Nom d'agence | Non utilisé (info) | ⚠️ Ignoré |
| 12 | RIB | `rib` | ✅ OK |
| 13 | Contrat | `contractType` | ✅ OK |
| 14 | Date d'Embauche | `hireDate` | ✅ OK |
| 15 | Département | `departmentId` (créé auto) | ✅ OK |
| 16 | Région | `siteId` (créé auto) | ✅ OK |
| 17 | Catégorie | `categorie` | ✅ OK |
| 18 | Fonction | `position` + `positionId` | ✅ OK |
| 19 | N° télephone | `phone` | ✅ OK |

## 2. Champs Manquants (Nouvelles Fonctionnalités)

Ces champs existent dans le système mais ne sont pas dans le fichier Excel :

| Champ | Description | Type | Valeur par défaut |
|-------|-------------|------|-------------------|
| `currentShiftId` | **Shift par défaut** | Nom du shift | - |
| `isEligibleForOvertime` | **Éligible heures sup** | Oui/Non | Oui |
| `maxOvertimeHoursPerMonth` | Max h.sup/mois | Nombre | - |
| `maxOvertimeHoursPerWeek` | Max h.sup/semaine | Nombre | - |
| `teamId` | Équipe | Nom équipe | - |
| `email` | Email professionnel | Email | Auto-généré |
| `rfidBadge` | Badge RFID | Code | - |
| `pinCode` | Code PIN | 4-6 chiffres | - |
| `isActive` | Actif | Oui/Non | Oui |

## 3. Nouvelle Structure Proposée (26 colonnes)

### Colonnes à AJOUTER au fichier Excel :

| Col | Nouvelle Colonne | Obligatoire | Valeurs Possibles |
|-----|-----------------|-------------|-------------------|
| 20 | **Email** | Non | email@domain.com |
| 21 | **Shift par défaut** | Non | Matin, Soir, Nuit, MI JOUR, MI SOIR, TEST MATIN |
| 22 | **Équipe** | Non | Nom de l'équipe |
| 23 | **Éligible Heures Sup** | Non | OUI / NON (défaut: OUI) |
| 24 | **Max H.Sup/Mois** | Non | Nombre (ex: 40) |
| 25 | **Badge RFID** | Non | Code badge |

### Mapping Complet des En-têtes :

```
Col 0:  Matricule
Col 1:  Civilité
Col 2:  Nom
Col 3:  Prénom
Col 4:  Situation Familiale
Col 5:  Nb Enf
Col 6:  Date de Naissance
Col 7:  N° CNSS
Col 8:  N° CIN
Col 9:  Adresse
Col 10: Ville
Col 11: Nom d'agence
Col 12: RIB
Col 13: Contrat
Col 14: Date d'Embauche
Col 15: Département
Col 16: Région (= Site)
Col 17: Catégorie
Col 18: Fonction
Col 19: N° télephone
Col 20: Email                    ← NOUVEAU
Col 21: Shift par défaut         ← NOUVEAU
Col 22: Équipe                   ← NOUVEAU
Col 23: Éligible Heures Sup      ← NOUVEAU
Col 24: Max H.Sup/Mois           ← NOUVEAU
Col 25: Badge RFID               ← NOUVEAU
```

## 4. Shifts Disponibles

Les shifts existants dans le système :
- **Matin**
- **MI JOUR**
- **MI SOIR**
- **Nuit**
- **Soir**
- **TEST MATIN**

## 5. Format des Données

| Champ | Format Attendu | Exemple |
|-------|----------------|---------|
| Date de Naissance | JJ/MM/AAAA | 15/04/1971 |
| Date d'Embauche | JJ/MM/AAAA | 01/06/2006 |
| Email | email@domain.com | jean.dupont@company.com |
| Éligible Heures Sup | OUI ou NON | OUI |
| Max H.Sup/Mois | Nombre entier | 40 |
| Civilité | M / MME / MLLE | M |
| Contrat | CDI / CDD / Stage | CDI |

## 6. Modifications Backend Requises

Pour supporter les nouvelles colonnes, le service d'import doit être mis à jour :

```typescript
// Nouvelles colonnes à parser (lignes 1141-1162)
const email = row[20] ? String(row[20]).trim() : undefined;
const shiftName = row[21] ? String(row[21]).trim() : undefined;
const teamName = row[22] ? String(row[22]).trim() : undefined;
const isEligibleOvertime = row[23] ? String(row[23]).toUpperCase() === 'OUI' : true;
const maxOvertimeMonth = row[24] ? parseInt(String(row[24])) : undefined;
const rfidBadge = row[25] ? String(row[25]).trim() : undefined;

// Rechercher le Shift par nom
let currentShiftId: string | undefined;
if (shiftName) {
  const shift = await this.prisma.shift.findFirst({
    where: { tenantId, name: shiftName },
  });
  currentShiftId = shift?.id;
}

// Rechercher/Créer l'Équipe
let teamId: string | undefined;
if (teamName) {
  let team = await this.prisma.team.findFirst({
    where: { tenantId, name: teamName },
  });
  if (!team) {
    team = await this.prisma.team.create({
      data: { tenantId, name: teamName },
    });
  }
  teamId = team.id;
}
```

## 7. Recommandations

### Immédiat
1. ✅ Le fichier actuel est **compatible** avec l'import existant
2. ⚠️ Ajouter les nouvelles colonnes pour une gestion complète

### À faire
1. Ajouter les 6 nouvelles colonnes au fichier Excel
2. Mettre à jour le service d'import backend
3. Remplir les données manquantes (Shift, Éligibilité heures sup)

### Optionnel
- Créer un template Excel vide téléchargeable depuis l'interface
- Ajouter une validation des données avant import
- Permettre le mapping dynamique des colonnes

## 8. Script de Migration

Pour mettre à jour les employés existants avec les nouveaux champs, un script peut être exécuté :

```sql
-- Mettre tous les employés éligibles aux heures sup par défaut
UPDATE "Employee"
SET "isEligibleForOvertime" = true
WHERE "isEligibleForOvertime" IS NULL;

-- Assigner un shift par défaut (ex: Matin) aux employés sans shift
UPDATE "Employee" e
SET "currentShiftId" = (
  SELECT id FROM "Shift" s
  WHERE s."tenantId" = e."tenantId" AND s.name = 'Matin'
  LIMIT 1
)
WHERE e."currentShiftId" IS NULL;
```

---

**Date d'analyse:** 12/01/2026
**Fichier analysé:** Liste personnel 102025.xlsx (1078 employés)
