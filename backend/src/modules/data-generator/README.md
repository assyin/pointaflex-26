# Data Generator Module

## Vue d'ensemble

Le module Data Generator permet de générer automatiquement des pointages virtuels pour tester et valider le système PointageFlex sans attendre les terminaux physiques.

## Fonctionnalités

- ✅ Génération de pointages selon différents scénarios
- ✅ Distribution intelligente (normal, retard, anomalie, mission, etc.)
- ✅ Détection automatique des anomalies
- ✅ Génération en masse pour plusieurs employés et périodes
- ✅ Nettoyage facile des données générées
- ✅ Statistiques et rapports

## Endpoints API

### 1. Générer un pointage pour une journée

```http
POST /api/v1/data-generator/attendance/single
Authorization: Bearer {token}
Content-Type: application/json

{
  "employeeId": "uuid-employee",
  "date": "2025-01-15",
  "scenario": "normal",
  "siteId": "uuid-site" // optionnel
}
```

**Scénarios disponibles:**
- `normal` - Journée normale avec IN, BREAK_START, BREAK_END, OUT
- `late` - Retard d'arrivée (15-60 min)
- `earlyLeave` - Départ anticipé
- `mission` - Mission externe
- `doubleIn` - Double pointage d'entrée (anomalie)
- `missingOut` - Oubli de sortie (anomalie)
- `longBreak` - Pause trop longue (anomalie)
- `absence` - Absence complète (aucun pointage)

### 2. Génération en masse

```http
POST /api/v1/data-generator/attendance/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "employeeIds": ["uuid1", "uuid2"], // optionnel, tous si vide
  "distribution": {
    "normal": 70,
    "late": 15,
    "earlyLeave": 5,
    "anomaly": 5,
    "mission": 3,
    "absence": 2
  },
  "siteId": "uuid-site" // optionnel
}
```

**Note:** La somme des pourcentages de distribution doit être égale à 100.

### 3. Supprimer les données générées

```http
DELETE /api/v1/data-generator/attendance/clean
Authorization: Bearer {token}
Content-Type: application/json

{
  "deleteAll": true,
  "afterDate": "2025-01-01", // optionnel
  "employeeId": "uuid", // optionnel
  "siteId": "uuid" // optionnel
}
```

### 4. Statistiques

```http
GET /api/v1/data-generator/stats
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "totalGenerated": 1234,
  "byType": {
    "IN": 400,
    "OUT": 380,
    "BREAK_START": 350,
    "BREAK_END": 104
  },
  "byScenario": {
    "normal": 850,
    "late": 200,
    "anomaly": 84,
    "mission": 50,
    "absence": 50
  },
  "anomaliesDetected": 84,
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

## Scénarios détaillés

### Scénario: Normal
- Probabilité: 70%
- Pattern: IN (8h ±10min) → BREAK_START (12h ±15min) → BREAK_END (13h ±10min) → OUT (17h ±20min)
- Nécessite un shift assigné

### Scénario: Retard
- Probabilité: 15%
- Pattern: IN (8h45 ±30min) → reste normal
- Nécessite un shift assigné

### Scénario: Départ anticipé
- Probabilité: 5%
- Pattern: Normal jusqu'à OUT (15h30 ±15min)
- Nécessite un shift assigné

### Scénario: Mission
- Probabilité: 2%
- Pattern: IN → MISSION_START → MISSION_END → OUT
- Ne nécessite pas de shift

### Scénario: Oubli de sortie (Anomalie)
- Probabilité: 3%
- Pattern: IN → BREAK_START → BREAK_END → [PAS DE OUT]
- Génère une anomalie `MISSING_OUT`

### Scénario: Double entrée (Anomalie)
- Probabilité: 2%
- Pattern: IN → IN (30min après) → reste normal
- Génère une anomalie `DOUBLE_IN`

### Scénario: Pause longue (Anomalie)
- Probabilité: 2%
- Pattern: IN → BREAK_START → BREAK_END (2h30 après) → OUT
- Potentielle anomalie si règles configurées

### Scénario: Absence
- Probabilité: 1%
- Pattern: Aucun pointage généré
- Ne nécessite pas de shift

## Utilisation

### Exemple 1: Tester une journée normale

```bash
curl -X POST http://localhost:3000/api/v1/data-generator/attendance/single \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-uuid",
    "date": "2025-01-15",
    "scenario": "normal"
  }'
```

### Exemple 2: Générer un mois complet pour tous les employés

```bash
curl -X POST http://localhost:3000/api/v1/data-generator/attendance/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "distribution": {
      "normal": 70,
      "late": 15,
      "earlyLeave": 5,
      "anomaly": 5,
      "mission": 3,
      "absence": 2
    }
  }'
```

### Exemple 3: Nettoyer toutes les données générées

```bash
curl -X DELETE http://localhost:3000/api/v1/data-generator/attendance/clean \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteAll": true}'
```

## Sécurité

- ✅ Tous les endpoints nécessitent une authentification JWT
- ✅ Accès réservé aux rôles `ADMIN_RH` et `SUPER_ADMIN`
- ✅ Les données générées sont marquées avec `isGenerated: true`
- ✅ Isolation par tenant (multi-tenant)

## Notes importantes

1. **Marquage des données**: Toutes les données générées ont `isGenerated: true` et `generatedBy: "nom_scenario"`
2. **Suppression facile**: Vous pouvez supprimer toutes les données générées d'un coup
3. **Détection d'anomalies**: La détection automatique fonctionne même sur les données générées
4. **Transition vers vrais terminaux**: Une fois les terminaux reçus, désactivez simplement le générateur
5. **Performance**: La génération en masse peut prendre du temps pour de grandes périodes

## Architecture

```
data-generator/
├── dto/                          # Data Transfer Objects
│   ├── generate-single-attendance.dto.ts
│   ├── generate-bulk-attendance.dto.ts
│   └── clean-generated-data.dto.ts
├── interfaces/                   # Interfaces TypeScript
│   └── generation-scenario.interface.ts
├── scenarios/                    # Configuration des scénarios
│   └── scenarios.config.ts
├── data-generator.service.ts     # Logique métier
├── data-generator.controller.ts  # Endpoints API
├── data-generator.module.ts      # Module NestJS
└── README.md                     # Cette documentation
```

## Swagger

La documentation interactive est disponible sur:
**http://localhost:3000/api/docs#/Data%20Generator**

## Support

Pour toute question ou problème:
- Consultez la documentation Swagger
- Vérifiez les logs du serveur
- Contactez l'équipe de développement
