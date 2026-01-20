# Modèle d'Import de Plannings Excel

## Format du Fichier Excel

Le fichier Excel doit contenir les colonnes suivantes dans l'ordre exact :

### Colonnes Requises

| Colonne | Nom | Obligatoire | Format | Exemple | Description |
|---------|-----|-------------|--------|---------|-------------|
| A | **Matricule** | ✅ Oui | Texte | `EMP001` | Matricule de l'employé (doit exister dans le système) |
| B | **Date Début** | ✅ Oui | Date | `15/01/2025` | Date de début au format DD/MM/YYYY (format français) ou YYYY-MM-DD |
| C | **Date Fin** | ❌ Non | Date | `31/01/2025` | Date de fin pour créer un intervalle au format DD/MM/YYYY. Si vide, crée un planning pour une seule journée |
| D | **Code Shift** | ✅ Oui | Texte | `M`, `S`, `N` | Code du shift (doit exister dans le système) |
| E | **Heure Début** | ❌ Non | Heure | `08:00` | Heure de début personnalisée au format HH:mm (optionnel) |
| F | **Heure Fin** | ❌ Non | Heure | `16:00` | Heure de fin personnalisée au format HH:mm (optionnel) |
| G | **Code Équipe** | ❌ Non | Texte | `TEAM001` | Code de l'équipe (doit exister si fourni) |
| H | **Notes** | ❌ Non | Texte | `Travail à distance` | Notes supplémentaires (optionnel) |

### Exemple de Fichier Excel

```
| Matricule | Date Début | Date Fin   | Code Shift | Heure Début | Heure Fin | Code Équipe | Notes                |
|-----------|------------|------------|------------|-------------|-----------|-------------|----------------------|
| EMP001    | 15/01/2025 |            | M          | 08:00       | 16:00     | TEAM001     | Une journée          |
| EMP002    | 15/01/2025 | 31/01/2025 | S          | 14:00       | 22:00     |             | Intervalle de dates  |
| EMP001    | 01/02/2025 | 28/02/2025 | M          |             |           | TEAM001     | Tout le mois         |
| EMP003    | 17/01/2025 |            | N          | 22:00       | 06:00     | TEAM002     | Shift de nuit        |
```

## Règles de Validation

### ✅ Validations Appliquées

1. **Matricule** : Doit exister dans le système pour le tenant actuel
2. **Date Début** : Format DD/MM/YYYY (ex: 15/01/2025) ou YYYY-MM-DD (ex: 2025-01-15)
3. **Date Fin** : Format DD/MM/YYYY (ex: 31/01/2025) ou YYYY-MM-DD, doit être supérieure ou égale à la date début (si fournie)
4. **Code Shift** : Doit exister dans le système pour le tenant actuel
5. **Heure Début/Fin** : Format HH:mm (ex: 08:00, 14:30, 22:00)
6. **Code Équipe** : Si fourni, doit exister dans le système
7. **Doublons** : Les plannings existants pour les dates dans l'intervalle seront ignorés
8. **Intervalle** : Si Date Fin est fournie, tous les plannings entre Date Début et Date Fin seront créés

### ❌ Erreurs Courantes

- **Matricule introuvable** : L'employé avec ce matricule n'existe pas
- **Date de début invalide** : Format de date incorrect (doit être DD/MM/YYYY ou YYYY-MM-DD)
- **Date de fin invalide** : Format de date incorrect ou inférieure à la date de début
- **Code Shift introuvable** : Le shift avec ce code n'existe pas
- **Heure invalide** : Format d'heure incorrect (doit être HH:mm)
- **Code Équipe introuvable** : L'équipe avec ce code n'existe pas
- **Tous les plannings existent** : Tous les plannings pour cette période existent déjà

## Instructions d'Import

### 1. Télécharger le Modèle

1. Cliquez sur le bouton **"Importer plannings"** dans la page Shifts Planning
2. Cliquez sur **"Télécharger le modèle"** dans la modal
3. Le fichier Excel modèle sera téléchargé avec des exemples

### 2. Remplir le Fichier

1. Ouvrez le fichier Excel téléchargé
2. Remplissez les colonnes obligatoires (Matricule, Date, Code Shift)
3. Remplissez les colonnes optionnelles si nécessaire
4. **Ne modifiez pas** la première ligne (en-têtes)
5. Supprimez les lignes d'exemple si nécessaire

### 3. Importer le Fichier

1. Cliquez sur **"Importer plannings"** dans la page
2. Sélectionnez votre fichier Excel (.xlsx ou .xls)
3. Cliquez sur **"Importer"**
4. Attendez le résultat de l'importation

### 4. Vérifier les Résultats

- ✅ **Succès** : Nombre de plannings importés avec succès
- ❌ **Erreurs** : Liste des erreurs avec numéro de ligne et raison

## Exemples de Cas d'Usage

### Exemple 1 : Planning Simple (Une journée)
```
EMP001 | 15/01/2025 | | M | | | TEAM001 |
```
→ Crée un planning pour l'employé EMP001 le 15 janvier 2025 avec le shift Matin (M)

### Exemple 2 : Intervalle de Dates
```
EMP002 | 15/01/2025 | 31/01/2025 | S | 14:00 | 22:00 | | Travail spécial |
```
→ Crée des plannings pour l'employé EMP002 du 15 au 31 janvier 2025 avec le shift Soir (S) et heures personnalisées

### Exemple 3 : Planning avec Équipe (Une journée)
```
EMP003 | 16/01/2025 | | N | 22:00 | 06:00 | TEAM002 | Shift de nuit |
```
→ Crée un planning de nuit avec équipe et notes pour une seule journée

### Exemple 4 : Intervalle pour Tout le Mois
```
EMP001 | 01/02/2025 | 28/02/2025 | M | | | TEAM001 | Planning mensuel |
```
→ Crée des plannings pour tout le mois de février 2025

## Notes Importantes

⚠️ **Important** :
- Les plannings existants pour la même date et le même employé seront **ignorés** (pas d'erreur, juste ignorés)
- Les lignes vides sont automatiquement ignorées
- Le fichier doit être au format Excel (.xlsx ou .xls)
- La première ligne doit contenir les en-têtes exacts
- Les codes (matricule, shift, équipe) sont sensibles à la casse mais seront convertis en majuscules
- **Format de date recommandé : DD/MM/YYYY (format français)** - Le format YYYY-MM-DD est également accepté

## Support

En cas de problème :
1. Vérifiez que tous les codes (matricule, shift, équipe) existent dans le système
2. Vérifiez le format des dates (DD/MM/YYYY recommandé, ou YYYY-MM-DD)
3. Vérifiez le format des heures (HH:mm)
4. Consultez la liste des erreurs dans le résultat de l'importation

