# Guide Configuration Terminal ZKTeco K40 → PointaFlex

## Votre Terminal

| Information | Valeur |
|-------------|--------|
| Modèle | **K40 Pro/ID** |
| N° Série | **A6F5211460142** |
| Adresse IP | **192.168.16.176** |
| Port | **4370** |
| Adresse MAC | 00:17:61:12:10:36 |

---

# PARTIE 1 : Configuration du Terminal

## Étape 1 : Vérifier la connexion réseau

Le terminal est déjà configuré avec :
- **IP** : 192.168.16.176
- **Masque** : 255.255.255.0
- **Passerelle** : 192.168.16.1
- **Port TCP** : 4370

✅ **Rien à faire** - Déjà configuré !

---

## Étape 2 : Ajouter un employé sur le terminal

### Comment accéder :
```
Menu principal → Gest.Utilis. → Nouvel utilisateur
```

### Sur le terminal, appuyez sur :
1. **M/OK** pour ouvrir le menu
2. Sélectionnez **"Gest.Utilis."** (icône avec personne)
3. Appuyez **M/OK**
4. Sélectionnez **"Nouvel utilisateur"**
5. Appuyez **M/OK**

### Remplissez les champs :

```
┌─────────────────────────────────────────────────────┐
│  NOUVEL UTILISATEUR                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ID Utilisateur : [MATRICULE POINTAFLEX]            │
│                                                     │
│  Exemple : Si l'employé a le matricule "EMP-001"    │
│            dans PointaFlex, tapez "1" ou "EMP001"   │
│                                                     │
│  Nom : [Nom de l'employé]                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

> **IMPORTANT** : L'ID que vous mettez sur le terminal doit correspondre
> au matricule dans PointaFlex (ou être mappé dans PointaFlex)

### Enregistrer l'empreinte :
1. Après avoir créé l'utilisateur, sélectionnez **"Enregistrer FP"** (Fingerprint)
2. L'employé pose son doigt **3 fois**
3. Le terminal affiche **"Enregistrement réussi"**

---

# PARTIE 2 : Configuration ZKAccess

## Étape 3 : Connecter le terminal dans ZKAccess

### 3.1 Ouvrir ZKAccess

Votre terminal "pointeuse" est déjà connecté (ligne 17 dans la liste).

### 3.2 Vérifier la connexion

1. Allez dans l'onglet **"Équipement"**
2. Trouvez **"pointeuse"** dans la liste
3. Vérifiez qu'il y a une **coche verte** ✓ dans la colonne "Ac."

Si pas de coche verte :
1. Sélectionnez le terminal
2. Cliquez sur **"Ajouter"** dans la barre d'outils
3. Entrez l'IP : **192.168.16.176**
4. Port : **4370**
5. Cliquez **OK**

---

## Étape 4 : Récupérer les pointages

### 4.1 Télécharger les événements

1. Onglet **"Équipement"**
2. Cochez **"pointeuse"** (ligne 17)
3. Cliquez sur **"Get entrées d'événements"** dans la barre d'outils
4. Une fenêtre s'ouvre avec tous les pointages

### 4.2 Ce que vous voyez

| Time | Device | N° personnel | Prénom | Mode vérification |
|------|--------|--------------|--------|-------------------|
| 16:41:08 | pointeuse | 2 | 3afsa | Empreinte digitale |
| 16:42:43 | pointeuse | 6 | Anoir | Empreinte digitale |
| 16:43:07 | pointeuse | 7 | Maryam | Empreinte digitale |

Le **"N° personnel"** (2, 6, 7) = l'ID de l'employé sur le terminal

---

# PARTIE 3 : Configuration PointaFlex

## Étape 5 : Ajouter le terminal dans PointaFlex

### 5.1 Ouvrir la page terminaux

1. Ouvrez votre navigateur
2. Allez sur : `http://localhost:3001/terminals`

### 5.2 Créer le terminal

1. Cliquez sur **"+ Nouveau Terminal"**
2. Remplissez :

| Champ | Valeur à entrer |
|-------|-----------------|
| Nom du terminal | `pointeuse` |
| ID Terminal | `A6F5211460142` |
| Type | `Empreinte digitale` |
| Adresse IP | `192.168.16.176` |

3. Cochez ✅ **"Générer une clé API sécurisée"**
4. Cliquez **"Créer"**

### 5.3 Copier la clé API

⚠️ **IMPORTANT** : Un popup s'affiche avec la clé API

1. Cliquez sur **"Copier"**
2. Sauvegardez cette clé quelque part (bloc-notes)
3. Cliquez **"J'ai copié la clé"**

---

## Étape 6 : Mapper les matricules

Si les ID sur le terminal (2, 6, 7) ne correspondent pas aux matricules PointaFlex :

### 6.1 Ouvrir le mapping

1. Allez sur : `http://localhost:3001/employees`
2. Ou cherchez **"Matricules temporaires"** dans le menu

### 6.2 Créer les correspondances

| ID Terminal | Matricule PointaFlex |
|-------------|---------------------|
| 2 | EMP-001 (3afsa) |
| 6 | EMP-002 (Anoir) |
| 7 | EMP-003 (Maryam) |

---

# PARTIE 4 : Synchronisation Automatique

## Option A : Synchronisation Manuelle via ZKAccess

1. **Équipement** → Sélectionner "pointeuse"
2. **"Get entrées d'événements"**
3. **"Télécharger"** → Exporter en CSV
4. Importer dans PointaFlex

## Option B : Synchronisation Automatique (Recommandé)

### Installer le script de synchronisation

1. Ouvrez un terminal (CMD) sur le PC où ZKAccess est installé
2. Créez un dossier :
```cmd
mkdir C:\PointaFlex-Sync
cd C:\PointaFlex-Sync
```

3. Installez Node.js si pas déjà fait : [nodejs.org](https://nodejs.org)

4. Initialisez le projet :
```cmd
npm init -y
npm install axios node-adodb
```

5. Créez le fichier `sync.js` avec le contenu du script (fourni séparément)

6. Lancez :
```cmd
node sync.js
```

---

# Résumé : Chemin de Navigation sur le Terminal

```
MENU PRINCIPAL (M/OK)
│
├── Gest.Utilis.          → Ajouter/modifier employés
│   ├── Nouvel utilisateur
│   ├── Tous les utilisateurs
│   └── Style affichage
│
├── Réglages COMM.        → Configuration réseau
│   ├── Ethernet          → IP: 192.168.16.176
│   ├── Connexion PC      → ID périphérique: 1
│   └── Configuration Serveur Cloud
│
├── Système               → Paramètres système
│   ├── Date Heure
│   ├── Présence
│   ├── Empreinte
│   └── Info Système      → N° série: A6F5211460142
│
└── Gest. de données      → Supprimer/exporter données
```

---

# Aide Rapide

## Le terminal ne se connecte pas à ZKAccess
1. Vérifiez le câble Ethernet
2. Vérifiez que l'IP est correcte (192.168.16.176)
3. Ping depuis le PC : `ping 192.168.16.176`

## L'employé n'est pas reconnu dans PointaFlex
1. Vérifiez que le mapping matricule existe
2. L'ID sur le terminal (ex: 2) doit correspondre au matricule ou être mappé

## Je veux ajouter un nouvel employé
1. **Sur le terminal** : Gest.Utilis. → Nouvel utilisateur → Entrer ID + Enregistrer empreinte
2. **Dans PointaFlex** : Créer l'employé avec le même matricule (ou créer le mapping)
3. **Dans ZKAccess** : SYNC pour synchroniser

---

# Contact

- **Terminal** : ZKTeco K40 Pro/ID
- **N° Série** : A6F5211460142
- **IP** : 192.168.16.176
- **Port** : 4370
