# Scénario de Test Optimisé - Hiérarchie Manager

## 📋 Configuration par Défaut du Générateur

Cette configuration est optimisée pour tester la nouvelle structure hiérarchique avec plusieurs managers régionaux par site.

## 🏢 Structure Organisationnelle

### Onglet 1 : Structure
- **Sites** : `3` (Casablanca, Rabat, Marrakech)
- **Départements** : `2` (Transport de fonds "CIT", RH)
- **Positions** : `6` (plus de variété)
- **Équipes** : `3` (meilleure répartition)
- ✅ **Assigner des managers** : coché

### Onglet 1 : RBAC - Utilisateurs
- **SUPER_ADMIN** : `1`
- **ADMIN_RH** : `1`
- **MANAGER** : `8` (2 directeurs + 6 managers régionaux)
- **EMPLOYEE** : `36` (6 employés par département par site)

### Onglet 1 : Employés
- **Nombre d'employés** : `36`
- ✅ **Lier aux utilisateurs RBAC** : coché
- ✅ **Assigner aux structures** : coché

## ⏰ Horaires

### Onglet 2 : Horaires
- ✅ **Créer shifts par défaut** : coché
- ✅ **Assigner aux employés** : coché
- ✅ **Générer jours fériés marocains** : coché
- **Année de début** : `2024`
- **Année de fin** : `2025`
- **Date de début planning** : `Aujourd'hui`
- **Date de fin planning** : `+30 jours`
- **Couverture** : `100%`
- ✅ **Exclure jours fériés** : coché
- ✅ **Exclure weekends** : coché

## 📅 Absences

### Onglet 3 : Absences
- **Pourcentage d'employés avec congés** : `35%` (augmenté pour tester les approbations)
- **Nombre moyen de jours** : `4` (légèrement plus)
- ✅ **Approbation automatique** : décoché
- **PENDING** : `25%` (plus de pending pour tester les workflows managers)
- **MANAGER_APPROVED** : `35%`
- **APPROVED** : `40%`
- **REJECTED** : `0%`

## 📊 Pointages

### Onglet 4 : Pointages
- **Date de début** : `-14 jours` (2 semaines de données pour plus de contexte)
- **Date de fin** : `Aujourd'hui`
- **Normal** : `70%`
- **Retard** : `15%`
- **Départ anticipé** : `5%`
- **Anomalies** : `5%`
- **Mission** : `3%`
- **Absence** : `2%`
- ✅ **Exclure jours fériés** : coché
- ✅ **Exclure weekends** : coché
- ✅ **Générer heures sup (via pointages)** : coché

### Onglet 4 : Heures Supplémentaires (Directes)
- **Nombre d'overtime** : `8` (augmenté pour tester les approbations)
- **Nombre moyen d'heures** : `2.5`
- **PENDING** : `30%`
- **APPROVED** : `60%`
- **REJECTED** : `10%`

### Onglet 4 : Récupération
- **Nombre de recovery** : `5` (augmenté pour tester)
- ✅ **Convertir depuis overtime** : coché
- **Taux de conversion** : `25%`

## 📱 Équipements

### Onglet 5 : Équipements
- **Nombre par site** : `2` (2 terminaux par site pour plus de réalisme)
- **Nombre de remplacements** : `6` (augmenté pour tester)
- **PENDING** : `25%`
- **APPROVED** : `65%`
- **REJECTED** : `10%`
- **Nombre de notifications** : `15` (augmenté pour tester)

## ⚙️ Options

### Onglet 6 : Options
- ✅ **Marquer toutes les données comme générées** : coché
- ✅ **Utiliser des transactions** : coché
- ❌ **Arrêter en cas d'erreur** : décoché

## 📊 Structure Hiérarchique Générée

Avec cette configuration, vous obtiendrez :

```
Département 1 (Transport de fonds "CIT")
├── Directeur (voit tous les sites du département)
└── Sites:
    ├── Site 1 (Casablanca)
    │   ├── Manager Régional 1 (voit uniquement Département 1 dans Site 1)
    │   └── ~6 employés du Département 1
    ├── Site 2 (Rabat)
    │   ├── Manager Régional 2 (voit uniquement Département 1 dans Site 2)
    │   └── ~6 employés du Département 1
    └── Site 3 (Marrakech)
        ├── Manager Régional 3 (voit uniquement Département 1 dans Site 3)
        └── ~6 employés du Département 1

Département 2 (RH)
├── Directeur (voit tous les sites du département)
└── Sites:
    ├── Site 1 (Casablanca)
    │   ├── Manager Régional 4 (voit uniquement Département 2 dans Site 1)
    │   └── ~6 employés du Département 2
    ├── Site 2 (Rabat)
    │   ├── Manager Régional 5 (voit uniquement Département 2 dans Site 2)
    │   └── ~6 employés du Département 2
    └── Site 3 (Marrakech)
        ├── Manager Régional 6 (voit uniquement Département 2 dans Site 3)
        └── ~6 employés du Département 2
```

**Total** :
- 2 directeurs (1 par département)
- 6 managers régionaux (1 par département par site)
- 36 employés (6 par département par site)
- **8 managers au total**

## 🎯 Points de Test

Cette configuration permet de tester :

1. **Hiérarchie Manager** :
   - ✅ Directeur voit tous les employés de son département dans tous les sites
   - ✅ Manager régional voit uniquement les employés de son département dans son site
   - ✅ Un site peut avoir plusieurs managers régionaux (un par département)

2. **Approbations** :
   - ✅ Congés avec différents statuts (PENDING, MANAGER_APPROVED, APPROVED)
   - ✅ Heures supplémentaires avec approbations
   - ✅ Remplacements avec workflows

3. **Données Réalistes** :
   - ✅ 2 semaines de pointages
   - ✅ Plannings sur 30 jours
   - ✅ Jours fériés marocains
   - ✅ Plusieurs terminaux par site

## 📝 Notes

- Les valeurs sont optimisées pour avoir suffisamment de données pour tester la hiérarchie
- Chaque site aura des employés des 2 départements pour tester la séparation des vues
- Les managers régionaux auront des données à gérer (congés, overtime, etc.) pour tester les workflows
