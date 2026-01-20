# Implémentation : Configuration de la Détection de Repos Insuffisant

## ✅ Résumé de l'Implémentation

Ajout de la possibilité d'activer/désactiver la détection de repos insuffisant (INSUFFICIENT_REST) et de configurer le nombre d'heures légales de repos minimum requis.

---

## 📝 Modifications Effectuées

### 1. **Schéma Prisma** (`backend/prisma/schema.prisma`)

**Nouveaux champs ajoutés dans `TenantSettings`** :

```prisma
enableInsufficientRestDetection Boolean @default(true) // Activer/désactiver la détection
minimumRestHours             Decimal  @default(11) // Heures légales de repos minimum (défaut: 11h)
minimumRestHoursNightShift   Decimal? @default(12) // Heures légales de repos pour shift de nuit (optionnel, défaut: 12h)
```

**Valeurs par défaut** :
- `enableInsufficientRestDetection` : `true` (activé par défaut)
- `minimumRestHours` : `11` heures (conforme à la législation)
- `minimumRestHoursNightShift` : `12` heures (optionnel)

---

### 2. **Backend - Service Attendance** (`backend/src/modules/attendance/attendance.service.ts`)

**Modifications dans `detectAnomalies()`** :

1. ✅ Récupération des paramètres configurés
2. ✅ Vérification si la détection est activée
3. ✅ Utilisation du nombre d'heures configuré au lieu de valeurs hardcodées
4. ✅ Détection automatique des shifts de nuit
5. ✅ Application du repos minimum spécifique pour shifts de nuit si configuré

**Logique** :
```typescript
// 1. Vérifier si la détection est activée
if (settings?.enableInsufficientRestDetection !== false) {
  // 2. Calculer le temps de repos
  const restHours = ...;
  
  // 3. Déterminer si c'est un shift de nuit
  const isNightShift = ...;
  
  // 4. Utiliser le repos minimum configuré
  const minimumRestHours = isNightShift && settings?.minimumRestHoursNightShift
    ? Number(settings.minimumRestHoursNightShift)
    : Number(settings?.minimumRestHours || 11);
  
  // 5. Détecter l'anomalie si repos insuffisant
  if (restHours < minimumRestHours) {
    return { hasAnomaly: true, type: 'INSUFFICIENT_REST', ... };
  }
}
```

---

### 3. **Backend - DTO** (`backend/src/modules/tenants/dto/update-tenant-settings.dto.ts`)

**Nouveaux champs ajoutés** :

```typescript
@ApiPropertyOptional({
  description: 'Activer/désactiver la détection de repos insuffisant',
  default: true,
})
enableInsufficientRestDetection?: boolean;

@ApiPropertyOptional({
  description: 'Nombre d\'heures légales de repos minimum requis entre deux shifts',
  default: 11,
})
minimumRestHours?: number;

@ApiPropertyOptional({
  description: 'Nombre d\'heures légales de repos minimum pour shift de nuit',
  default: 12,
})
minimumRestHoursNightShift?: number;
```

---

### 4. **Backend - Service Tenants** (`backend/src/modules/tenants/tenants.service.ts`)

**Ajout dans `validSettingsFields`** :

```typescript
'enableInsufficientRestDetection', 'minimumRestHours', 'minimumRestHoursNightShift'
```

---

### 5. **Frontend - Types TypeScript** (`frontend/lib/api/tenants.ts`)

**Ajout dans les interfaces** :

```typescript
// Insufficient Rest Detection Settings
enableInsufficientRestDetection?: boolean;
minimumRestHours?: number;
minimumRestHoursNightShift?: number;
```

---

### 6. **Frontend - Page Settings** (`frontend/app/(dashboard)/settings/page.tsx`)

**Nouvelle section ajoutée** : "Détection de repos insuffisant"

**Fonctionnalités** :
- ✅ Checkbox pour activer/désactiver la détection
- ✅ Input pour configurer le repos minimum (heures)
- ✅ Input pour configurer le repos minimum pour shifts de nuit (heures)
- ✅ Affichage conditionnel des champs (seulement si activé)
- ✅ Descriptions et tooltips explicatifs

**Emplacement** : Après la section "Politique horaire & tolérances", avant "Règles de congés & validation"

---

## 🎯 Fonctionnement

### Scénario 1 : Détection Activée (Par Défaut)

**Configuration** :
- `enableInsufficientRestDetection = true`
- `minimumRestHours = 11`
- `minimumRestHoursNightShift = 12`

**Comportement** :
- ✅ Détecte les violations de repos légal
- ✅ Utilise 11h pour shifts normaux
- ✅ Utilise 12h pour shifts de nuit (si configuré)

**Exemple** :
- Sortie précédente : 17:00 (lundi)
- Entrée actuelle : 06:00 (mardi)
- Repos : 13h → ✅ Pas d'anomalie

- Sortie précédente : 17:00 (lundi)
- Entrée actuelle : 03:00 (mardi)
- Repos : 10h → ⚠️ **INSUFFICIENT_REST** détecté

---

### Scénario 2 : Détection Désactivée

**Configuration** :
- `enableInsufficientRestDetection = false`

**Comportement** :
- ❌ Ne détecte pas les violations de repos
- ✅ Les pointages sont acceptés même avec repos insuffisant
- ⚠️ **Attention** : Non conforme à la législation

---

### Scénario 3 : Shift de Nuit avec Repos Spécifique

**Configuration** :
- `enableInsufficientRestDetection = true`
- `minimumRestHours = 11`
- `minimumRestHoursNightShift = 12`

**Comportement** :
- Shift normal (08:00-17:00) : Repos minimum = 11h
- Shift de nuit (22:00-06:00) : Repos minimum = 12h

**Détection automatique** :
- Le système détermine automatiquement si c'est un shift de nuit
- Utilise les paramètres `nightShiftStart` et `nightShiftEnd` du tenant
- Applique le repos minimum approprié

---

## 📊 Valeurs Légales de Référence

### France
- **Repos quotidien minimum** : 11 heures consécutives
- **Repos après travail de nuit** : 12 heures consécutives

### Maroc
- **Repos quotidien minimum** : 11 heures consécutives
- **Repos après travail de nuit** : 12 heures consécutives

**Note** : Les valeurs par défaut (11h/12h) sont conformes à la législation française et marocaine.

---

## 🔄 Migration de Base de Données

### Étape 1 : Appliquer les changements

```bash
cd backend
npx prisma db push
```

**OU** créer une migration :

```bash
npx prisma migrate dev --name add_insufficient_rest_settings
```

### Étape 2 : Vérifier les valeurs par défaut

Les valeurs par défaut seront appliquées automatiquement :
- `enableInsufficientRestDetection = true`
- `minimumRestHours = 11`
- `minimumRestHoursNightShift = 12`

---

## 🧪 Tests à Effectuer

### Test 1 : Détection Activée
1. Configurer `enableInsufficientRestDetection = true`
2. Configurer `minimumRestHours = 11`
3. Créer un pointage OUT à 17:00
4. Créer un pointage IN à 03:00 le lendemain (10h de repos)
5. **Résultat attendu** : ⚠️ INSUFFICIENT_REST détecté

### Test 2 : Détection Désactivée
1. Configurer `enableInsufficientRestDetection = false`
2. Créer un pointage OUT à 17:00
3. Créer un pointage IN à 03:00 le lendemain (10h de repos)
4. **Résultat attendu** : ✅ Pas d'anomalie détectée

### Test 3 : Shift de Nuit
1. Configurer `minimumRestHours = 11` et `minimumRestHoursNightShift = 12`
2. Créer un planning shift de nuit (22:00-06:00)
3. Créer un pointage OUT à 06:00
4. Créer un pointage IN à 17:00 le même jour (11h de repos)
5. **Résultat attendu** : ⚠️ INSUFFICIENT_REST détecté (11h < 12h requis pour shift de nuit)

---

## 📋 Checklist d'Implémentation

- [x] **Schéma Prisma** : Champs ajoutés dans TenantSettings
- [x] **Backend DTO** : Champs ajoutés dans UpdateTenantSettingsDto
- [x] **Backend Service** : Logique modifiée pour utiliser les paramètres
- [x] **Backend Tenants Service** : Champs ajoutés dans validSettingsFields
- [x] **Frontend Types** : Interfaces mises à jour
- [x] **Frontend Settings** : Section UI ajoutée
- [ ] **Migration** : À exécuter (`npx prisma db push`)
- [ ] **Tests** : À effectuer avec différents scénarios

---

## ✅ Conclusion

L'implémentation est **complète**. Les administrateurs peuvent maintenant :

1. ✅ **Activer/désactiver** la détection de repos insuffisant
2. ✅ **Configurer** le nombre d'heures légales de repos minimum
3. ✅ **Configurer** un repos minimum spécifique pour les shifts de nuit
4. ✅ **Voir les paramètres** dans la page Settings (`/settings`)

**La solution est prête pour la production** après exécution de la migration.

---

**Date d'implémentation** : 2025-01-XX
**Version** : PointaFlex v1.0

