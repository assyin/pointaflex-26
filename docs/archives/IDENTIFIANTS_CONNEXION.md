# 🔐 Identifiants de Connexion - PointageFlex

## 📋 Comptes Utilisateurs de Test

### 🔴 SUPER_ADMIN (Administrateur Plateforme)

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@demo.com` |
| **Mot de passe** | `Admin@123` |
| **Rôle** | SUPER_ADMIN |
| **Permissions** | Accès complet à toutes les fonctionnalités |
| **Peut modifier** | Nom, Prénom, Téléphone, Email |
| **Accès** | Toutes les pages et fonctionnalités |

**URL de connexion** : http://172.17.112.163:3001/login

---

### 🟠 ADMIN_RH (Administrateur RH)

| Champ | Valeur |
|-------|--------|
| **Email** | `rh@demo.com` |
| **Mot de passe** | `Test123!` |
| **Rôle** | ADMIN_RH |
| **Permissions** | Gestion complète des employés, congés, pointages |
| **Peut modifier** | Nom, Prénom, Téléphone, Email |
| **Accès** | Toutes les pages sauf configuration système |

**URL de connexion** : http://172.17.112.163:3001/login

---

### 🟡 MANAGER (Manager / Responsable d'équipe)

| Champ | Valeur |
|-------|--------|
| **Email** | `manager@demo.com` |
| **Mot de passe** | `Test123!` |
| **Rôle** | MANAGER |
| **Permissions** | Gestion de son équipe, validation des congés, pointages équipe |
| **Peut modifier** | Nom, Prénom, Téléphone |
| **Accès** | Pages équipe, validation congés, statistiques équipe |

**URL de connexion** : http://172.17.112.163:3001/login

---

### 🟢 EMPLOYEE (Employé)

| Champ | Valeur |
|-------|--------|
| **Email** | `employee@demo.com` |
| **Mot de passe** | `Test123!` |
| **Rôle** | EMPLOYEE |
| **Permissions** | Voir ses propres données, demander des congés |
| **Peut modifier** | **Téléphone uniquement** (❌ Ne peut PAS modifier Nom/Prénom) |
| **Accès** | Pages personnelles, demandes de congés, ses propres statistiques |

**URL de connexion** : http://172.17.112.163:3001/login

---

## 🎯 Test de la Page Profile

Une fois connecté, accédez à votre profil :

**URL** : http://172.17.112.163:3001/profile

### Tests à effectuer selon le rôle :

#### ✅ SUPER_ADMIN (`admin@demo.com`)
- [ ] Peut modifier nom, prénom, téléphone
- [ ] Peut voir tous ses rôles RBAC
- [ ] Peut voir toutes ses permissions
- [ ] Peut changer son mot de passe
- [ ] Peut configurer ses préférences
- [ ] Peut voir ses statistiques
- [ ] Peut exporter ses données RGPD

#### ✅ ADMIN_RH (`rh@demo.com`)
- [ ] Peut modifier nom, prénom, téléphone
- [ ] Peut voir ses rôles RBAC
- [ ] Peut voir ses permissions
- [ ] Peut changer son mot de passe
- [ ] Peut configurer ses préférences
- [ ] Peut voir ses statistiques

#### ✅ MANAGER (`manager@demo.com`)
- [ ] Peut modifier nom, prénom, téléphone
- [ ] Peut voir ses rôles RBAC
- [ ] Peut voir ses permissions
- [ ] Peut changer son mot de passe
- [ ] Peut configurer ses préférences
- [ ] Peut voir ses statistiques et celles de son équipe

#### ✅ EMPLOYEE (`employee@demo.com`)
- [ ] ❌ **Ne peut PAS modifier nom/prénom** (champs désactivés)
- [ ] ✅ Peut modifier téléphone
- [ ] Peut voir ses rôles RBAC
- [ ] Peut voir ses permissions
- [ ] Peut changer son mot de passe
- [ ] Peut configurer ses préférences
- [ ] Peut voir ses statistiques personnelles

---

## 📝 Notes Importantes

1. **EMPLOYEE ne peut pas modifier nom/prénom** : C'est une restriction de sécurité. Seule la RH peut modifier ces informations.

2. **Tous les utilisateurs peuvent modifier leur téléphone** : C'est autorisé pour tous les rôles.

3. **Email** : Seuls SUPER_ADMIN et ADMIN_RH peuvent modifier l'email (sécurité).

4. **Mot de passe** : Tous les utilisateurs peuvent changer leur mot de passe.

---

## 🔄 Réinitialiser les mots de passe

Si vous avez besoin de réinitialiser les mots de passe, exécutez :

```bash
cd ~/PointaFlex/backend
npx ts-node scripts/fix-all-passwords.ts
```

## 🔍 Vérifier si un utilisateur existe

Pour vérifier si un utilisateur existe dans la base de données :

```bash
cd ~/PointaFlex/backend
npx ts-node scripts/check-user.ts
```

Ce script va :
- ✅ Vérifier si `employee@demo.com` existe
- ✅ Afficher tous les utilisateurs de test
- ✅ Vérifier leur statut (actif/inactif)
- ✅ Vérifier leur tenant

---

## 🎯 Accès Rapide

- **Application** : http://172.17.112.163:3001
- **Page Profile** : http://172.17.112.163:3001/profile
- **API Documentation** : http://172.17.112.163:3000/api/docs

---

**Date de création** : 2025-12-11
**Version** : 1.0

