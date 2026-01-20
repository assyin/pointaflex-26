# 📋 Plan d'Implémentation - Système de Calcul des Heures Supplémentaires

## 🎯 Objectif
Implémenter toutes les améliorations recommandées dans l'analyse du système de calcul des heures supplémentaires.

---

## 📅 Phases d'Implémentation

### ✅ Phase 0 : Correction Calcul Pause Réelle (CRITIQUE)
**Priorité :** CRITIQUE  
**Durée estimée :** 1-2 jours

**Tâches :**
1. Ajouter `overtimeMinimumThreshold` dans `TenantSettings` (seuil minimum)
2. Modifier `calculateMetrics()` pour gérer `requireBreakPunch` et `breakDuration`
3. Implémenter logique conditionnelle pause réelle
4. Utiliser `TenantSettings.breakDuration` pour pause prévue
5. Tests unitaires

---

### ✅ Phase 1 : Éligibilité de Base
**Priorité :** Haute  
**Durée estimée :** 1-2 jours

**Tâches :**
1. Ajouter `isEligibleForOvertime` dans `Employee` (Prisma)
2. Créer migration Prisma
3. Modifier `calculateMetrics()` pour vérifier éligibilité
4. Modifier `OvertimeService.create()` pour valider éligibilité
5. Tests unitaires

---

### ✅ Phase 2 : Plafonds Mensuels/Hebdomadaires
**Priorité :** Moyenne  
**Durée estimée :** 2-3 jours

**Tâches :**
1. Ajouter `maxOvertimeHoursPerMonth` et `maxOvertimeHoursPerWeek` dans `Employee`
2. Créer migration Prisma
3. Créer méthode `checkOvertimeLimits()` dans `OvertimeService`
4. Intégrer vérification dans création/approbation
5. Tests unitaires

---

### ✅ Phase 3 : Création Automatique Overtime
**Priorité :** Moyenne  
**Durée estimée :** 3-4 jours

**Tâches :**
1. Créer job batch quotidien `DetectOvertimeJob`
2. Analyser Attendance avec `overtimeMinutes > seuil minimum`
3. Créer Overtime automatiquement
4. Respecter éligibilité et plafonds
5. Tests end-to-end

---

## 🚀 Démarrage

Commençons par la Phase 0 (CRITIQUE).

