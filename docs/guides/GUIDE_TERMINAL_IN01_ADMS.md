# 🎯 CONFIGURATION TERMINAL IN01 - Mode ADMS

## 📸 Votre Situation Actuelle

**Terminal:** IN01 (ZKTeco)
**Écran actuel:** Configuration Serveur Cloud
**Mode:** ADMS (protocole propriétaire ZKTeco)
**IP Serveur (vous):** 192.168.16.40 (WSL Linux)
**Backend:** http://192.168.16.40:3000

---

## ⚠️ PROBLÈME

Le mode **ADMS** n'envoie PAS des requêtes HTTP standard.
Il utilise un protocole propriétaire ZKTeco incompatible avec notre endpoint `/api/v1/attendance/push`.

---

## ✅ SOLUTION 1: Changer le Mode (RECOMMANDÉ)

### Étape 1: Sur le terminal IN01

**Navigation sur l'écran actuel:**

```
Configuration Serveur Cloud
├── Mode Serveur: [ADMS] ← VOUS ÊTES ICI
├── Activer le nom de domaine: [ ]
├── Adresse du serveur: 0.0.0.0
├── Port du serveur: 8081
└── Permettre Serveur Proxy: [OUI]
```

### Étape 2: Modifier le Mode Serveur

**1. Appuyer sur la touche directement sous "ADMS"**
   - Cela devrait ouvrir un menu déroulant

**2. Chercher ces options (ordre de priorité):**

| Priorité | Mode | Compatible? | Action |
|----------|------|-------------|---------|
| 🥇 **1** | **CloudAtt** | ✅ Oui | CHOISIR CELUI-CI |
| 🥈 **2** | **HTTP** ou **HTTPS** | ✅ Oui | Si CloudAtt absent |
| 🥉 **3** | **Push Protocol** | ✅ Oui | Alternative |
| ❌ | **ADMS** | ❌ Non | Ne PAS utiliser |
| ❌ | **UDP** | ❌ Non | Ne PAS utiliser |

### Étape 3: Si vous trouvez "CloudAtt" ou "HTTP"

**Configuration à entrer:**

```
Mode Serveur: CloudAtt (ou HTTP)
Activer le nom de domaine: NON (laissez vide)
Adresse du serveur: 192.168.16.40
Port du serveur: 3000
Permettre Serveur Proxy: NON
```

**Ensuite:**
1. Descendre avec les flèches ↓
2. Aller vers "Sauvegarder" ou "OK"
3. Confirmer et redémarrer

---

## ✅ SOLUTION 2: Si AUCUN autre mode disponible

Si le terminal IN01 supporte UNIQUEMENT le mode ADMS, nous devons créer un **service intermédiaire**.

### Architecture nécessaire:

```
Terminal IN01 (ADMS) → Service ADMS Listener (Python) → PointaFlex API (HTTP)
   192.168.16.x            192.168.16.40:8081         192.168.16.40:3000
```

### Créer le Service ADMS Listener

Je vais créer un script Python qui:
1. Écoute sur le port 8081 (protocole ADMS)
2. Reçoit les données du terminal
3. Convertit vers HTTP
4. Envoie à votre backend

---

## 📝 ÉTAPES DÉTAILLÉES (Si CloudAtt disponible)

### SUR LE TERMINAL IN01:

**Étape 1: Changer le Mode**
```
[Vous êtes ici: Configuration Serveur Cloud]
↓
Appuyer sur le champ "Mode Serveur" (touche en dessous de ADMS)
↓
Menu s'ouvre avec options:
  • ADMS
  • CloudAtt  ← CHOISIR
  • Autre...
↓
Sélectionner "CloudAtt"
↓
Appuyer OK
```

**Étape 2: Configurer l'Adresse**
```
Champ "Adresse du serveur": 0.0.0.0
↓
Appuyer sur ce champ
↓
Clavier numérique s'affiche
↓
Entrer: 192.168.16.40
  • 1 → 9 → 2 → (point) → 1 → 6 → 8 → (point) → 1 → 6 → (point) → 4 → 0
↓
Appuyer OK
```

**Étape 3: Configurer le Port**
```
Champ "Port du serveur": 8081
↓
Appuyer sur ce champ
↓
Effacer (touche ◄ ou DEL)
↓
Entrer: 3000
  • 3 → 0 → 0 → 0
↓
Appuyer OK
```

**Étape 4: Désactiver le Proxy**
```
"Permettre Serveur Proxy": [OUI] (surligné en jaune)
↓
Appuyer sur ce champ pour le désactiver
↓
Devrait afficher: [NON]
```

**Étape 5: Sauvegarder**
```
Naviguer avec ↓ jusqu'à "Sauvegarder" ou "OK"
↓
Appuyer sur la touche correspondante
↓
Message "Configuration sauvegardée"
↓
Redémarrer le terminal (demandé automatiquement)
```

---

## 🧪 TEST APRÈS CONFIGURATION

### 1. Vérifier que le terminal se connecte

**Sur votre PC (WSL):**
```bash
# Surveiller les logs du backend
# Ouvrir un terminal et voir les messages
```

Vous devriez voir:
```
📥 [Push URL] Données reçues du terminal: { ... }
```

### 2. Faire un pointage test

1. Sur le terminal IN01, pointer avec votre doigt/badge
2. Attendre 1-2 secondes
3. Vérifier les logs backend

### 3. Vérifier en base de données

```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com \
  -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres \
  -c "SELECT \"timestamp\", type FROM \"Attendance\" ORDER BY \"timestamp\" DESC LIMIT 1;"
```

---

## 🔧 DÉPANNAGE

### Problème: Le terminal n'envoie rien

**Vérification 1: Le terminal peut-il pinguer votre PC?**

Sur le terminal (si option disponible):
```
Menu → Système → Réseau → Test Ping
Destination: 192.168.16.40
```

**Vérification 2: Le backend est-il accessible depuis le réseau?**

```bash
# Sur votre PC Windows (PowerShell)
curl http://192.168.16.40:3000/api/v1/attendance/push

# Si erreur "Connection refused", vérifier:
# 1. Le backend tourne bien
# 2. WSL expose le port sur le réseau
```

**Vérification 3: Firewall Windows bloque-t-il?**

```powershell
# Windows PowerShell (Admin)
New-NetFirewallRule -DisplayName "PointaFlex Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Problème: WSL n'est pas accessible depuis le réseau

**Solution: Configurer le port forwarding Windows → WSL**

```powershell
# PowerShell (Admin)
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.x.x.x

# Remplacer 172.x.x.x par l'IP WSL:
# Dans WSL: ip addr show eth0 | grep inet
```

---

## 🚀 SI CloudAtt/HTTP N'EXISTE PAS

Si le menu ne montre QUE "ADMS" comme option, nous créerons un service ADMS Listener.

**Dites-moi:**
1. Quelles options voyez-vous dans "Mode Serveur"?
2. Y a-t-il "CloudAtt", "HTTP", "Push Protocol"?

---

## 📞 PROCHAINES ACTIONS

**MAINTENANT, sur votre terminal IN01:**

1. **Appuyez sur le champ "Mode Serveur" (sous ADMS)**
   - Que voyez-vous comme options?

2. **Prenez une photo** du menu qui s'affiche

3. **Si vous voyez "CloudAtt" ou "HTTP":**
   - Sélectionnez-le
   - Suivez les étapes ci-dessus

4. **Si SEULEMENT "ADMS" existe:**
   - On créera un service listener ADMS

---

**Quelle option voyez-vous quand vous appuyez sur "Mode Serveur"? 📸**
