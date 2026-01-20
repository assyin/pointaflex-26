# Guide d'Intégration des Terminaux Biométriques en Temps Réel

## 🎯 Comment ça fonctionne

Votre système PointaFlex est maintenant configuré pour recevoir les pointages en temps réel depuis les terminaux biométriques.

### Flux de Données

```
Terminal Biométrique
        ↓
   [Webhook HTTP POST]
        ↓
Backend (NestJS) - http://localhost:3000/api/v1/attendance/webhook
        ↓
   [Enregistrement en BDD]
        ↓
Frontend (Next.js) - http://localhost:3001/attendance
        ↓
   [Actualisation automatique toutes les 30s]
```

---

## 🔧 Configuration d'un Terminal Réel

### Prérequis
- Terminal biométrique avec support webhook HTTP
- Connexion réseau (WiFi ou Ethernet) entre le terminal et votre serveur
- Accès aux paramètres réseau du terminal

### Configuration du Terminal

Dans l'interface d'administration de votre terminal biométrique, configurez:

1. **URL du Webhook**: `http://VOTRE_IP:3000/api/v1/attendance/webhook`
   - Remplacez `VOTRE_IP` par l'adresse IP de votre serveur backend
   - Exemple: `http://192.168.1.100:3000/api/v1/attendance/webhook`

2. **Headers HTTP à envoyer**:
   ```
   X-Device-ID: TERMINAL-001
   X-Tenant-ID: 90fab0cc-8539-4566-8da7-8742e9b6937b
   X-API-Key: (optionnel pour le moment)
   Content-Type: application/json
   ```

3. **Format du payload JSON**:
   ```json
   {
     "employeeId": "EMP001",
     "timestamp": "2025-11-22T14:30:00Z",
     "type": "IN",
     "method": "FINGERPRINT",
     "rawData": {
       "confidence": 95,
       "template": "..."
     }
   }
   ```

### Types de Pointage Supportés

| Type | Description |
|------|-------------|
| `IN` | Entrée / Arrivée |
| `OUT` | Sortie / Départ |
| `BREAK` | Pause |

### Méthodes de Pointage Supportées

| Method | Description |
|--------|-------------|
| `FINGERPRINT` | Empreinte digitale |
| `FACE_RECOGNITION` | Reconnaissance faciale |
| `RFID_BADGE` | Badge RFID |
| `QR_CODE` | QR Code |
| `PIN_CODE` | Code PIN |
| `MOBILE_GPS` | Mobile avec GPS |
| `MANUAL` | Saisie manuelle |

---

## 🧪 Test avec curl (Simuler un terminal)

Pour tester sans terminal physique:

```bash
# Test d'entrée (IN)
curl -X POST http://localhost:3000/api/v1/attendance/webhook \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: TERMINAL-001" \
  -H "X-Tenant-ID: 90fab0cc-8539-4566-8da7-8742e9b6937b" \
  -d "{\"employeeId\":\"EMP001\",\"timestamp\":\"2025-11-22T08:00:00Z\",\"type\":\"IN\",\"method\":\"FINGERPRINT\",\"rawData\":{\"confidence\":98}}"

# Test de sortie (OUT)
curl -X POST http://localhost:3000/api/v1/attendance/webhook \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: TERMINAL-001" \
  -H "X-Tenant-ID: 90fab0cc-8539-4566-8da7-8742e9b6937b" \
  -d "{\"employeeId\":\"EMP001\",\"timestamp\":\"2025-11-22T17:00:00Z\",\"type\":\"OUT\",\"method\":\"FINGERPRINT\",\"rawData\":{\"confidence\":97}}"
```

**Résultat attendu**: Le pointage apparaît dans l'interface web dans les 30 secondes (actualisation automatique).

---

## ⚡ Actualisation en Temps Réel

### Fonctionnement de l'Actualisation

- **Actualisation automatique**: Toutes les 30 secondes
- **Actualisation manuelle**: Bouton "Actualiser" disponible
- **Indicateur visuel**: Point vert = connecté, Point bleu = chargement
- **Pas de perte de données**: Même si l'interface n'est pas ouverte

### Ce qui est actualisé automatiquement

✅ Liste des pointages
✅ Statistiques (Total, Entrées, Sorties, Anomalies)
✅ Détection des anomalies
✅ Statut des terminaux

---

## 🚨 Détection des Anomalies

Le système détecte automatiquement:

1. **Sorties manquantes**: Employé a pointé une entrée mais pas de sortie
2. **Entrées manquantes**: Sortie sans entrée correspondante
3. **Retards**: Arrivée après l'heure prévue
4. **Départs anticipés**: Sortie avant l'heure prévue
5. **Pointages hors planning**: Pointage pendant un jour de congé

---

## 🔐 Sécurité

### Authentification du Terminal

Le système vérifie:
- ✅ Le `X-Device-ID` existe dans la base de données
- ✅ Le `X-Tenant-ID` correspond au tenant du terminal
- ⚠️ L'`X-API-Key` (optionnel, à implémenter pour production)

### Sécurité en Production

Pour la production, ajoutez:
1. **API Key par terminal**: Vérification dans le backend
2. **HTTPS obligatoire**: Chiffrement des données en transit
3. **Rate limiting**: Limiter le nombre de requêtes par terminal
4. **Whitelist IP**: N'accepter que les IPs des terminaux connus
5. **Logs d'audit**: Tracer tous les pointages reçus

---

## 📊 Monitoring

### Vérifier que tout fonctionne

1. **Terminal visible dans l'interface**:
   - Aller sur http://localhost:3001/terminals
   - Vérifier que le terminal apparaît avec statut "En ligne" (vert)
   - Le statut passe à "En ligne" quand un webhook est reçu

2. **Logs backend**:
   ```bash
   cd /home/assyin/PointaFlex/backend
   npm run start:dev
   ```
   Les webhooks reçus s'affichent dans les logs

3. **Base de données**:
   ```sql
   SELECT id, timestamp, type, method
   FROM "Attendance"
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

---

## ❓ Dépannage

### Le pointage n'apparaît pas dans l'interface

1. Vérifier que le backend est démarré: `http://localhost:3000`
2. Vérifier que le frontend est démarré: `http://localhost:3001`
3. Vérifier les logs backend pour voir si le webhook est reçu
4. Vérifier que l'employé existe avec le matricule envoyé
5. Vérifier que le terminal existe avec le Device-ID envoyé
6. Attendre 30 secondes pour l'actualisation automatique ou cliquer sur "Actualiser"

### Le terminal apparaît "Hors ligne"

- Le terminal est "En ligne" si un webhook a été reçu dans les 5 dernières minutes
- Le terminal est "Lent" si le dernier webhook date de 5-30 minutes
- Le terminal est "Hors ligne" si aucun webhook depuis plus de 30 minutes

### Erreur 401 Unauthorized

- Vous devez être connecté pour voir les pointages
- Reconnectez-vous à http://localhost:3001/login

### Erreur 404 Device not found

- Le Device-ID n'existe pas dans la base de données
- Créez d'abord le terminal dans l'interface Terminaux

### Erreur 404 Employee not found

- Le matricule employé n'existe pas
- Créez d'abord l'employé dans l'interface Employés

---

## 🎯 Prochaines Étapes

### Pour la Production

1. **Déployer le backend** sur un serveur accessible depuis Internet
2. **Configurer un nom de domaine** (ex: api.pointageflex.com)
3. **Activer HTTPS** avec Let's Encrypt
4. **Configurer les terminaux** avec l'URL de production
5. **Tester l'intégration** avec un terminal réel
6. **Former les utilisateurs** à l'interface web

### Améliorations Possibles

- 🔔 Notifications push quand un employé pointe
- 📱 Application mobile pour les managers
- 📊 Tableau de bord en temps réel avec graphiques
- 🤖 Détection d'anomalies avancée avec IA
- 📸 Photos de pointage pour vérification visuelle
- 🌐 Support multi-sites avec géolocalisation

---

## 📞 Support

Pour toute question ou problème:
1. Vérifier les logs backend et frontend
2. Consulter ce guide
3. Tester avec curl pour isoler le problème
4. Vérifier la configuration réseau du terminal

---

**Dernière mise à jour**: 22 novembre 2025
**Version du système**: 1.0.0
