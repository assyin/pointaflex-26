# 🚀 Générateur de Données Complet - PointageFlex

## Vue d'ensemble

Le générateur de données complet permet de générer toutes les données du système PointageFlex de manière cohérente et réaliste. Il suit un workflow logique qui respecte les dépendances entre les entités.

**🎉 IMPLÉMENTATION COMPLÈTE** - Tous les services sont créés et fonctionnels !

## 🌐 Accès à l'Interface

L'interface web est disponible à l'adresse :
```
http://192.168.79.102:3001/admin/data-generator-all
```

L'interface permet de :
- Configurer tous les paramètres de génération via une interface graphique intuitive
- Visualiser les statistiques de génération en temps réel
- Nettoyer toutes les données générées en un clic
- Accéder à tous les onglets de configuration (Structure, Horaires, Absences, Pointages, Équipements, Options)

## 📋 Fonctionnalités Implémentées

### ✅ Phase 1 : Infrastructure (100% Complète)

- **DataGeneratorOrchestratorService** : Service orchestrateur qui gère le workflow complet en 24 étapes
- **GenerateAllDataDto** : DTO unifié avec toutes les options de configuration
- **DataGeneratorCleanupService** : Service de nettoyage universel
- **Interfaces** : `GenerationStats` et `GenerationProgress` pour le suivi

### ✅ Phase 2 : Structure & RBAC (100% Complète)

- **DataGeneratorStructureService** : Génération de Sites, Departments, Positions, Teams
- **DataGeneratorRBACService** : Génération d'utilisateurs avec rôles RBAC
- **DataGeneratorEmployeeService** : Génération d'employés avec données réalistes
- **DataGeneratorHierarchyService** : Configuration de la hiérarchie des managers

### ✅ Phase 3 : Services Existants Intégrés (100% Complète)

- **DataGeneratorShiftsService** : Génération de shifts (horaires de travail)
- **DataGeneratorHolidaysService** : Génération de jours fériés (support Maroc)
- **DataGeneratorLeavesService** : Génération de congés avec workflow d'approbation
- **DataGeneratorSchedulesService** : Génération de plannings (schedules)
- **DataGeneratorService** : Génération de pointages (attendance) avec scénarios réalistes

### ✅ Phase 4 : Nouveaux Services (100% Complète)

- **DataGeneratorOvertimeService** : Heures supplémentaires directes
- **DataGeneratorRecoveryService** : Récupération (depuis overtime ou manuel)
- **DataGeneratorDeviceService** : Terminaux biométriques
- **DataGeneratorReplacementService** : Remplacements de shift
- **DataGeneratorNotificationService** : Notifications diverses

### ✅ Phase 5 : API & Frontend (100% Complète)

- **DataGeneratorAllController** : Endpoints `/all/generate` et `/all/cleanup`
- **Interface Frontend** : Page complète avec onglets de configuration
- **Intégration Swagger** : Documentation API complète
- **Gestion des permissions RBAC** : Accès sécurisé (SUPER_ADMIN, ADMIN_RH)

## 🔧 Utilisation

### Endpoint Principal

```http
POST /api/v1/data-generator/all/generate
Authorization: Bearer {token}
Content-Type: application/json
```

### Exemple de Configuration Complète - Petite Entreprise

```json
{
  "structure": {
    "sitesCount": 2,
    "departmentsCount": 4,
    "positionsCount": 12,
    "teamsCount": 3,
    "assignManagers": true
  },
  "rbac": {
    "usersPerRole": {
      "SUPER_ADMIN": 1,
      "ADMIN_RH": 1,
      "MANAGER": 3,
      "EMPLOYEE": 45
    }
  },
  "employees": {
    "count": 50,
    "linkToUsers": true,
    "assignToStructures": true,
    "dataOptions": {
      "generateRealisticNames": true,
      "generateEmails": true,
      "generatePhones": true,
      "generateAddresses": true
    }
  },
  "shifts": {
    "createDefault": true,
    "assignToEmployees": true
  },
  "holidays": {
    "generateMoroccoHolidays": true,
    "startYear": 2025,
    "endYear": 2026
  },
  "schedules": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "coverage": 100,
    "excludeHolidays": true,
    "excludeWeekends": true
  },
  "leaves": {
    "percentage": 30,
    "averageDaysPerEmployee": 5,
    "workflow": {
      "autoApprove": false,
      "approvalDistribution": {
        "PENDING": 20,
        "MANAGER_APPROVED": 30,
        "APPROVED": 50,
        "REJECTED": 0
      }
    }
  },
  "attendance": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "distribution": {
      "normal": 70,
      "late": 15,
      "earlyLeave": 5,
      "anomalies": 5,
      "mission": 3,
      "absence": 2
    },
    "excludeHolidays": true,
    "excludeWeekends": true,
    "generateOvertime": true
  },
  "overtime": {
    "count": 20,
    "averageHours": 2,
    "statusDistribution": {
      "PENDING": 30,
      "APPROVED": 60,
      "REJECTED": 10
    }
  },
  "recovery": {
    "count": 10,
    "convertFromOvertime": true,
    "conversionRate": 20
  },
  "devices": {
    "perSite": 2
  },
  "replacements": {
    "count": 15,
    "statusDistribution": {
      "PENDING": 20,
      "APPROVED": 70,
      "REJECTED": 10
    }
  },
  "notifications": {
    "count": 30
  },
  "options": {
    "markAsGenerated": true,
    "useTransactions": true,
    "stopOnError": false
  }
}
```

### Nettoyage des Données Générées

```http
POST /api/v1/data-generator/all/cleanup
Authorization: Bearer {token}
```

## 📊 Workflow de Génération (24 Étapes)

Le générateur suit cet ordre logique qui respecte toutes les dépendances :

1. ✅ Tenant & Settings (vérification)
2. ✅ RBAC - Vérification rôles système
3. ✅ RBAC - Vérification permissions
4. ✅ RBAC - Rôles personnalisés (optionnel)
5. ✅ Structure - Sites
6. ✅ Structure - Départements
7. ✅ Structure - Positions
8. ✅ Structure - Équipes
9. ✅ Users & RBAC Assignments
10. ✅ Employees
11. ✅ Hiérarchie Managers
12. ✅ Shifts (horaires de travail)
13. ✅ Holidays (jours fériés)
14. ✅ LeaveTypes (créés automatiquement dans Leaves)
15. ✅ Devices (terminaux biométriques)
16. ✅ Schedules (plannings)
17. ✅ Leaves (congés avec workflow)
18. ✅ Attendance (pointages avec scénarios)
19. ✅ Overtime (via Attendance - automatique)
20. ✅ Overtime (Direct - heures supplémentaires directes)
21. ✅ Recovery (récupération)
22. ✅ Replacements (remplacements de shift)
23. ✅ Notifications (notifications diverses)

## 🎯 Services Créés

### DataGeneratorOrchestratorService
- Orchestre toute la génération
- Valide les dépendances
- Gère les erreurs
- Fournit des statistiques

### DataGeneratorStructureService
- Génère Sites, Departments, Positions, Teams
- Utilise des données prédéfinies réalistes
- Évite les doublons

### DataGeneratorRBACService
- Génère des utilisateurs avec rôles RBAC
- Crée les liaisons UserTenantRole
- Support des rôles personnalisés
- Génère des noms réalistes

### DataGeneratorEmployeeService
- Génère des employés avec données réalistes
- Assigne aux structures (Site, Department, Position, Team)
- Lie aux utilisateurs RBAC
- Génère matricules séquentiels
- Génère emails, téléphones, adresses

### DataGeneratorHierarchyService
- Configure la hiérarchie des managers
- Assigne managers aux départements, sites, équipes
- Assigne rôles RBAC MANAGER
- Sélectionne les managers selon l'ancienneté

### DataGeneratorCleanupService
- Nettoie toutes les données générées
- Respecte l'ordre inverse de génération
- Nettoie par type d'entité

### DataGeneratorShiftsService
- Génère des shifts (horaires de travail) par défaut ou personnalisés
- Assigne les shifts aux employés
- Support de distribution personnalisée

### DataGeneratorHolidaysService
- Génère les jours fériés marocains automatiquement
- Support de jours fériés personnalisés
- Exclusion automatique dans les plannings et pointages

### DataGeneratorLeavesService
- Génère des congés avec workflow d'approbation réaliste
- Distribution configurable par type de congé
- Statuts : PENDING, MANAGER_APPROVED, APPROVED, REJECTED

### DataGeneratorSchedulesService
- Génère des plannings sur une période donnée
- Exclusion automatique des jours fériés et weekends
- Distribution par shift configurable

### DataGeneratorService (Attendance)
- Génère des pointages avec scénarios réalistes
- Distribution configurable : normal, late, earlyLeave, anomalies, mission, absence
- Génération automatique d'heures supplémentaires
- Exclusion des jours fériés, weekends et congés approuvés

### DataGeneratorOvertimeService
- Génère des heures supplémentaires directes
- Distribution de statuts configurable
- Calcul automatique des heures

### DataGeneratorRecoveryService
- Génère des récupérations depuis overtime ou manuellement
- Taux de conversion configurable
- Conversion automatique overtime → récupération

### DataGeneratorDeviceService
- Génère des terminaux biométriques
- Assignation par site
- Support de types de devices personnalisés

### DataGeneratorReplacementService
- Génère des remplacements de shift
- Distribution de statuts configurable
- Basé sur les plannings existants

### DataGeneratorNotificationService
- Génère des notifications diverses
- Types de notifications configurables
- Assignation aux employés

## 📝 Notes Importantes

1. **RBAC** : Assurez-vous d'avoir exécuté `npm run init:rbac` avant la génération
2. **Dépendances** : Le générateur valide automatiquement les dépendances
3. **Transactions** : Optionnel, peut être activé pour cohérence totale (`useTransactions: true`)
4. **Erreurs** : Par défaut, continue en cas d'erreur (peut être changé avec `stopOnError: true`)
5. **Interface Web** : Utilisez l'interface à `http://192.168.79.102:3001/admin/data-generator-all` pour une configuration visuelle
6. **Nettoyage** : Utilisez l'endpoint `/all/cleanup` ou le bouton dans l'interface pour supprimer toutes les données générées

## 🎯 Fonctionnalités Avancées

### Statistiques de Génération
Le générateur retourne des statistiques détaillées :
- Nombre total d'entités créées
- Détails par type d'entité
- Durée de génération
- Erreurs et avertissements éventuels

### Gestion des Erreurs
- Mode `stopOnError: false` : Continue même en cas d'erreur (par défaut)
- Mode `stopOnError: true` : Arrête à la première erreur
- Logs détaillés de chaque étape
- Rapport d'erreurs et d'avertissements

### Options de Configuration
- `markAsGenerated: true` : Marque toutes les données générées pour faciliter le nettoyage
- `useTransactions: true` : Utilise des transactions pour garantir la cohérence
- `generateInParallel: false` : Génération séquentielle (peut être activée pour certaines entités)

## 🔄 Améliorations Futures (Optionnel)

- [ ] Tests unitaires et d'intégration complets
- [ ] Export/Import de configurations
- [ ] Amélioration des données réalistes avec faker.js
- [ ] Templates de configuration prédéfinis (petite/moyenne/grande entreprise)
- [ ] Génération en parallèle pour certaines entités indépendantes

## 📚 Documentation Complémentaire

- **STATUS_IMPLEMENTATION.md** : État détaillé de l'implémentation
- **genrteur-analys.md** : Analyse complète du générateur
- **Swagger API** : Documentation interactive disponible sur `/api/docs`

## 🎉 Résultat Final

**Tous les services sont implémentés et fonctionnels !**

Le générateur peut maintenant créer un environnement de test complet avec :
- ✅ Structure organisationnelle (Sites, Départements, Positions, Équipes)
- ✅ Utilisateurs et RBAC (rôles et permissions)
- ✅ Employés avec données réalistes
- ✅ Shifts, Holidays, Leaves
- ✅ Schedules et Attendance (pointages)
- ✅ Overtime, Recovery
- ✅ Devices, Replacements, Notifications

**Tout est prêt pour les tests !** 🚀

---

*Dernière mise à jour : Toutes les fonctionnalités sont complètes et opérationnelles*

