# CONFIGURATION TERMINAL ZKTeco IN01

**Date :** 2025-11-26
**Terminal :** ZKTeco IN01 (visible sur les captures d'écran)
**Interface :** Français

---

## 📸 Captures d'Écran Analysées

D'après vos captures :
- ✅ Menu principal avec "**Réglages COMM.**"
- ✅ Sous-menu "**Configuration Serveur Cloud**"
- ✅ Mode actuel : ADMS
- ✅ Port actuel : 8081

---

## 🎯 SOLUTION : Utiliser "Configuration Serveur Cloud"

### Étape 1 : Accéder aux Réglages de Communication

1. **Sur le terminal IN01 :**
   - Appuyez sur **MENU** (bouton physique en bas à droite)
   - Saisissez le code administrateur (par défaut souvent : `0000` ou `9999`)

2. **Dans le Menu principal :**
   - Sélectionnez **"Réglages COMM."** (3ème icône en haut)

3. **Options disponibles :**
   - Cherchez **"Configuration Serveur Cloud"** ou **"Cloud Server"**
   - Ou **"Serveur HTTP"** / **"HTTP Push"**

---

## 🔧 MÉTHODE A : Mode HTTP (Recommandé)

### Configuration

Si le terminal propose un mode "HTTP" ou "HTTP Push" :

1. **Mode Serveur :** Changer de `ADMS` vers `HTTP` ou `HTTP Push`

2. **Adresse du serveur :**
   ```
   192.168.16.XXX
   ```
   *(Remplacer XXX par l'IP du PC qui exécute le backend PointaFlex)*

   **Exemples :**
   - Si backend sur PC 192.168.16.100 : `192.168.16.100`
   - Si backend sur le même PC que le terminal : `127.0.0.1` (ne fonctionne généralement pas)

3. **Port du serveur :**
   ```
   3000
   ```

4. **URL ou Chemin :**
   ```
   /api/v1/attendance/push
   ```

5. **Sauvegarder et redémarrer le terminal**

---

## 🔧 MÉTHODE B : Mode ADMS avec URL Personnalisée

Si le terminal ne propose pas de mode HTTP mais permet de modifier l'URL ADMS :

1. **Mode Serveur :** Garder `ADMS`

2. **Activer le nom de domaine :** NON (décocher)

3. **Adresse du serveur :**
   ```
   192.168.16.XXX:3000/api/v1/attendance/push
   ```

4. **Port du serveur :** `3000`

5. **Permettre Serveur Proxy :** NON

---

## 🔧 MÉTHODE C : Scripts Python (Fallback)

Si aucune des méthodes ci-dessus ne fonctionne, utilisez les scripts Python améliorés qui sont déjà prêts.

**Voir :** `GUIDE_DEPLOIEMENT_SCRIPTS_AMELIORES.md`

---

## 📝 Informations à Saisir

### Terminal 1 (IN01 - 192.168.16.174)

**Adresse IP du serveur backend :**
- Trouver l'IP du PC qui exécute le backend :
  ```bash
  # Sur Windows
  ipconfig

  # Sur Linux/WSL
  hostname -I
  ```

**Configuration à saisir dans le terminal :**
```
Adresse du serveur : 192.168.16.XXX (IP du backend)
Port du serveur    : 3000
Chemin/URL         : /api/v1/attendance/push
```

### Terminal 2 (192.168.16.175)

Répéter la même configuration avec les mêmes valeurs.

---

## 🧪 Test de Configuration

### Étape 1 : Vérifier la Connectivité

**Depuis le terminal (si possible) ou depuis un PC sur le même réseau :**

```bash
ping 192.168.16.XXX
```
*(Remplacer XXX par l'IP du backend)*

### Étape 2 : Vérifier que le Backend Écoute

**Sur le PC du backend :**

```bash
curl http://localhost:3000/api/v1/attendance/push
```

**Résultat attendu :**
```
Cannot GET /api/v1/attendance/push
```
C'est normal ! Le endpoint accepte seulement POST, pas GET.

### Étape 3 : Test Manuel

**Faire un pointage sur le terminal IN01**

**Vérifier les logs du backend :**

```bash
# Dans le terminal où tourne npm run start:dev
# Vous devriez voir :
📥 [Push URL] Données reçues du terminal: {...}
🔄 [Push URL] Données converties: {...}
✅ [Push URL] Pointage enregistré avec succès
```

---

## 🔍 Navigation dans le Menu du Terminal IN01

D'après vos captures d'écran, voici la navigation :

### Menu Principal
```
┌─────────────────────────────────────┐
│        Menu principal               │
├─────────────┬──────────┬────────────┤
│ Gest.Utilis.│ Profile  │ Réglages   │
│             │ d'utilis.│ COMM. ⬅️   │
├─────────────┼──────────┼────────────┤
│ Système     │Personnal.│ Gest de    │
│             │   z      │ données    │
├─────────────┴──────────┴────────────┤
│ Gest. USB  │ Recherche Présence     │
└─────────────────────────────────────┘
```

### Réglages COMM. → ?
Options possibles (vérifier sur votre terminal) :
- Configuration Serveur Cloud ✅ (déjà vu dans zk2.jpeg)
- Paramètres Réseau
- Communication série
- Autres...

---

## 🎮 Commandes Physiques du Terminal

D'après votre photo :

**Clavier :**
- **MENU** : Accès au menu administrateur
- **ESC** : Retour / Annuler
- **F1** / **F2** : Fonctions contextuelles
- **Chiffres** : Saisie de code / Navigation
- **N/A** : Navigation haut/bas ?

**Pour naviguer :**
1. Utilisez les **flèches** (si disponibles) ou les **chiffres**
2. **Appuyez sur OK** ou **F1** pour valider
3. **ESC** pour revenir en arrière

---

## 🔧 Configuration Détaillée Étape par Étape

### SUR LE TERMINAL IN01 :

1. **Appuyez sur MENU**
   - Saisissez le code admin (essayez : `0000`, `9999`, `1234`, ou `123456`)

2. **Sélectionnez "Réglages COMM."**
   - Utilisez les touches pour naviguer
   - Appuyez sur OK ou F1 pour entrer

3. **Cherchez une de ces options :**
   - "Configuration Serveur Cloud" ✅
   - "Serveur HTTP"
   - "HTTP Push"
   - "Cloud Push"
   - "Configuration Serveur"

4. **Dans la configuration :**

   **Si Mode Serveur propose HTTP/HTTP Push :**
   - Mode Serveur : `HTTP` ou `HTTP Push`
   - Adresse : `192.168.16.XXX` (IP du backend)
   - Port : `3000`
   - URL/Chemin : `/api/v1/attendance/push`

   **Si Mode Serveur n'a que ADMS :**
   - Mode Serveur : `ADMS`
   - Activer nom de domaine : `NON`
   - Adresse : `192.168.16.XXX`
   - Port : `3000`
   - *(Le terminal pourrait accepter d'envoyer en HTTP même en mode ADMS)*

5. **Sauvegarder**
   - Appuyez sur OK ou F1
   - Confirmez la sauvegarde

6. **Redémarrer le terminal (optionnel mais recommandé)**
   - Menu → Système → Redémarrer

---

## 📋 Checklist de Configuration

- [ ] Code administrateur du terminal trouvé
- [ ] Accès au menu "Réglages COMM."
- [ ] Option "Configuration Serveur Cloud" trouvée
- [ ] IP du backend identifiée : `192.168.16.___`
- [ ] Configuration saisie dans le terminal :
  - [ ] Adresse serveur
  - [ ] Port : 3000
  - [ ] URL/Chemin : /api/v1/attendance/push
- [ ] Configuration sauvegardée
- [ ] Terminal redémarré
- [ ] Test de pointage effectué
- [ ] Logs backend vérifiés

---

## ❓ FAQ

### Q1 : Je ne trouve pas l'option HTTP Push

**R :** Certains modèles ZKTeco n'ont que le mode ADMS. Dans ce cas :
1. Essayez de configurer ADMS avec l'IP et le port de PointaFlex
2. Si ça ne fonctionne pas, utilisez les scripts Python (solution de secours)

### Q2 : Le terminal n'envoie rien

**R :** Vérifiez :
1. Le terminal et le backend sont sur le même réseau
2. Le backend est accessible : `ping 192.168.16.XXX`
3. Le port 3000 n'est pas bloqué par le firewall
4. La configuration est bien sauvegardée sur le terminal

### Q3 : J'obtiens "Device not found"

**R :** Le terminal envoie bien les données ! Mais il faut enregistrer le terminal dans PointaFlex :
1. Aller sur http://localhost:3001/terminals (ou /devices)
2. Ajouter : Device ID = `TERMINAL-PRINC-001`, IP = `192.168.16.174`

### Q4 : Quel est le code administrateur par défaut ?

**R :** Essayez dans cet ordre :
- `0000`
- `9999`
- `1234`
- `123456`
- `admin` (si le terminal accepte les lettres)

---

## 🆘 Si Rien ne Fonctionne

### Solution de Secours : Scripts Python

Les scripts Python améliorés sont **déjà prêts** et fonctionnent parfaitement avec votre terminal.

**Fichiers disponibles :**
- `/home/assyin/PointaFlex/scripts/zkteco_terminal_improved.py`
- `GUIDE_DEPLOIEMENT_SCRIPTS_AMELIORES.md`

**Avantages :**
- ✅ Fonctionne à 100% avec PyZK
- ✅ Retry logic + Circuit breaker
- ✅ Queue locale (zéro perte de données)
- ✅ Déjà testé sur vos terminaux

**Inconvénient :**
- Nécessite Python + scripts tournant en arrière-plan sur Windows

---

## 📞 Support

**Documents de référence :**
- `ALTERNATIVES_CONFIGURATION_TERMINAUX.md` - Toutes les méthodes
- `GUIDE_RAPIDE_PUSH_URL.md` - Configuration Push URL
- `GUIDE_DEPLOIEMENT_SCRIPTS_AMELIORES.md` - Scripts Python

**Terminal :**
- Modèle : ZKTeco IN01
- IP Terminal 1 : 192.168.16.174
- IP Terminal 2 : 192.168.16.175
- Device ID T1 : TERMINAL-PRINC-001
- Device ID T2 : Terminal_CIT_GAB

---

## 🎯 Prochaine Étape

**ESSAYEZ D'ABORD :**
1. Accéder à "Réglages COMM." → "Configuration Serveur Cloud"
2. Noter toutes les options disponibles
3. Essayer de changer le mode ou l'adresse
4. Faire un test de pointage

**SI ÇA NE FONCTIONNE PAS :**
- On déploiera les scripts Python améliorés (solution garantie)

---

**Date :** 2025-11-26
**Status :** Guide spécifique pour terminal IN01
**Basé sur :** Captures d'écran zk1.jpeg et zk2.jpeg
