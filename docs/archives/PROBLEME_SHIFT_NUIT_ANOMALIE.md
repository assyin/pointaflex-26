# Problème : Anomalie "Sortie sans entrée" pour les shifts de nuit

## Description du problème

Lorsqu'un employé avec un **shift de nuit** (ex: 21:00 - 06:00) pointe :
- **IN** le soir (ex: 31/12/2025 à 21:00)
- **OUT** le matin du lendemain (ex: 01/01/2026 à 06:00)

Le système crée incorrectement une anomalie **"Sortie sans entrée"** (MISSING_IN) alors qu'il s'agit d'un comportement normal pour un shift de nuit.

## Contexte technique

### Fichier concerné
- `backend/src/modules/attendance/attendance.service.ts`
- Méthode : `detectMissingInImproved()` (ligne ~1964)

### Logique actuelle

La méthode `detectMissingInImproved` est appelée lorsqu'un pointage **OUT** est créé sans **IN** le même jour. Elle :

1. Vérifie s'il y a un **IN** la veille sans **OUT** la veille
2. Si oui, essaie de détecter si c'est un shift de nuit
3. Si c'est un shift de nuit, devrait retourner `{ hasAnomaly: false }`
4. Sinon, retourne une anomalie `MISSING_IN` ou `MISSING_OUT`

### Problème identifié

La détection du shift de nuit ne fonctionne pas correctement dans certains cas, notamment :
- Quand le planning n'existe pas pour le jour d'entrée (ex: jour férié)
- Quand les heures de pointage ne correspondent pas exactement aux heures du shift
- Quand la comparaison des dates/heures échoue silencieusement

## Solution attendue

### Comportement souhaité

Pour un pointage **OUT** sans **IN** le même jour :

1. **Vérifier s'il y a un IN la veille** sans OUT la veille
2. **Si oui**, vérifier si c'est un shift de nuit en utilisant :
   - Le pattern temporel : IN le soir (≥17h) + OUT le matin (<14h) + OUT le lendemain
   - Le planning du jour d'entrée (si disponible) pour confirmer
   - La durée entre IN et OUT (8-12h typique pour un shift de nuit)
3. **Si c'est un shift de nuit** → **PAS d'anomalie** (`hasAnomaly: false`)
4. **Sinon** → Anomalie `MISSING_OUT` (pas `MISSING_IN`)

### Critères de détection d'un shift de nuit

Un shift de nuit doit être détecté si **TOUTES** ces conditions sont remplies :

1. ✅ **OUT le lendemain** : Le OUT est sur un jour différent du IN (après minuit)
2. ✅ **Temps raisonnable** : Entre 6h et 14h entre IN et OUT
3. ✅ **Pattern temporel** : Au moins UN de ces critères :
   - IN après 17h ET OUT avant 14h
   - IN après 20h ET OUT avant 12h
   - Planning confirme un shift de nuit (via `isNightShift()`)
   - Durée entre 8h-12h ET IN après 18h ET OUT avant 12h

### Points d'attention

- ⚠️ Le planning doit être cherché pour le **jour d'entrée** (hier), pas le jour de sortie (aujourd'hui)
- ⚠️ Même si le planning n'existe pas, le pattern temporel doit suffire à détecter un shift de nuit
- ⚠️ Les conditions doivent être **permissives** pour accepter les variations d'horaires
- ⚠️ Si aucune condition n'est remplie, retourner `MISSING_OUT` (pas `MISSING_IN`)

## Test de validation

**Scénario de test :**
- Employé : Zineb
- Shift : 21:00 - 06:00 (shift de nuit)
- IN : 31/12/2025 à 21:00
- OUT : 01/01/2026 à 06:00 (jour férié, pas de planning)

**Résultat attendu :** ✅ Aucune anomalie créée

**Résultat actuel :** ❌ Anomalie "Sortie sans entrée" créée

## Fichiers à modifier

- `backend/src/modules/attendance/attendance.service.ts`
  - Méthode `detectMissingInImproved()` (ligne ~1964)
  - Section de détection des shifts de nuit (ligne ~2060-2150)

## Notes supplémentaires

- Aucun log n'est affiché en console, ce qui suggère que la logique ne passe pas par les bonnes conditions
- Le problème persiste même après plusieurs tentatives de correction
- Il faut vérifier que toutes les conditions de détection sont bien évaluées et que les `return { hasAnomaly: false }` sont bien exécutés

