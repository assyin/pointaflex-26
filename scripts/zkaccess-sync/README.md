# Synchronisation Terminal ZKTeco - PointaFlex

## Script Principal

**`sync-terminal-state.js`** - Utilise le champ STATE natif du terminal

### Principe

Le terminal ZKTeco fournit directement le type IN/OUT via son champ `state`:
- **state 0** = IN (Check-In)
- **state 1** = OUT (Check-Out)
- **state 2** = OUT (Break-Out)
- **state 3** = IN (Break-In)
- **state 4** = IN (OT-In)
- **state 5** = OUT (OT-Out)

### Utilisation

```bash
# Mode continu (boucle toutes les 30s)
TERMINAL_NAME=CP TERMINAL_IP=192.168.16.174 \
TENANT_ID=340a6c2a-160e-4f4b-917e-6eea8fd5ff2d \
node sync-terminal-state.js

# Mode unique
node sync-terminal-state.js --once
```

### Variables d'environnement

| Variable | Description | Defaut |
|----------|-------------|--------|
| TERMINAL_NAME | Nom du terminal | CP |
| TERMINAL_IP | Adresse IP | 192.168.16.174 |
| TERMINAL_PORT | Port | 4370 |
| API_URL | URL du backend | http://127.0.0.1:3000/api/v1 |
| TENANT_ID | ID du tenant | (requis) |
| DEVICE_ID | ID du device | (optionnel) |
| SYNC_INTERVAL | Intervalle en secondes | 30 |

### Endpoint Backend

Le script envoie les pointages vers:
```
POST /api/v1/attendance/webhook/state
```

### Fichiers de sortie

- `last_sync_state_{TERMINAL_NAME}.json` - Dernier SN synchronise
- `sync_state_{TERMINAL_NAME}.log` - Logs de synchronisation

## Anciens Scripts

Les scripts obsoletes (avec deduction IN/OUT) sont dans le dossier `Anciens Scripts/`.
