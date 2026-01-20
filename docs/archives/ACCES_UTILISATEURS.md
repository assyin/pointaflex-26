# 🔐 Accès Utilisateurs - PointaFlex

**Date de génération:** 11 Décembre 2025
**Dernière mise à jour:** 11 Décembre 2025 - 11:40
**Application:** PointaFlex - Système de gestion de pointage et RH

> ✅ **IMPORTANT:** Tous les mots de passe ont été réinitialisés et testés avec succès.
> Tous les comptes sont maintenant **100% fonctionnels** et prêts à être utilisés!

---

## 🌐 URLs de l'Application

### Frontend (Interface Utilisateur)
- **URL Locale:** http://localhost:3001
- **URL Réseau:** http://0.0.0.0:3001

### Backend (API)
- **URL Locale:** http://localhost:3000
- **URL Réseau:** http://0.0.0.0:3000
- **Documentation API (Swagger):** http://localhost:3000/api/docs

---

## 👥 Comptes Utilisateurs

### 1️⃣ SUPER ADMINISTRATEUR ⭐ (NOUVEAU)

**Email:** superadmin@pointaflex.com
**Mot de passe:** SuperAdmin@2024
**Nom:** Super Administrateur
**Rôle:** Super Administrateur
**Statut:** ✅ Actif

**Permissions:**
- Accès complet à la plateforme
- Gestion de tous les tenants
- Gestion de tous les utilisateurs
- Accès à toutes les fonctionnalités
- Gestion des rôles et permissions
- Accès aux audits système
- Configuration système complète

---

### 2️⃣ ADMINISTRATEUR RH (Admin Principal)

**Email:** admin@demo.com
**Mot de passe:** Admin@123
**Nom:** Admin Demo
**Rôles:** Administrateur RH, Manager, Employé
**Statut:** ✅ Actif

**Permissions:**
- Gestion complète des employés (création, modification, suppression, import/export)
- Gestion des présences (visualisation, correction, export)
- Gestion des plannings et horaires
- Approbation des congés et heures supplémentaires
- Gestion des équipes et sites
- Accès à tous les rapports
- Gestion des utilisateurs et rôles
- Gestion des paramètres du tenant
- Accès aux audits

---

### 3️⃣ ADMINISTRATEUR RH (RH)

**Email:** rh@demo.com
**Mot de passe:** Rh@123
**Nom:** Fatima zahra RH
**Rôle:** Administrateur RH
**Statut:** ✅ Actif

**Permissions:**
- Gestion complète des employés
- Gestion des présences
- Gestion des plannings
- Approbation des congés et heures supplémentaires
- Accès aux rapports RH
- Gestion des sites et départements

---

### 4️⃣ MANAGER

**Email:** manager@demo.com
**Mot de passe:** Manager@123
**Nom:** Sara Manager
**Rôle:** Manager
**Statut:** ✅ Actif

**Permissions:**
- Visualisation des présences de son équipe
- Correction des présences de son équipe
- Gestion des plannings de son équipe
- Approbation des remplacements
- Approbation des congés de son équipe
- Approbation des heures supplémentaires
- Rapports d'équipe
- Export de données

---

### 5️⃣ EMPLOYÉ

**Email:** employee@demo.com
**Mot de passe:** Employee@123
**Nom:** Mohamed Employee
**Rôle:** Employé
**Statut:** ✅ Actif

**Permissions:**
- Visualisation de ses propres informations
- Visualisation de ses présences
- Pointage (création de présences)
- Visualisation de son planning
- Demande de congés
- Visualisation de ses congés
- Demande d'heures supplémentaires
- Visualisation de ses rapports de présence

---

## 🗄️ Informations Base de Données

**Type:** PostgreSQL (Supabase)
**Host:** aws-1-eu-north-1.pooler.supabase.com
**Port:** 6543
**Database:** postgres
**Username:** postgres.apeyodpxnxxwdxwcnqmo
**Password:** MAMPAPOLino0102
**Version:** PostgreSQL 17.6

**Connection String:**
```
postgresql://postgres.apeyodpxnxxwdxwcnqmo:MAMPAPOLino0102@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 🏢 Informations Tenant

**ID Tenant:** 01651f40-c16b-4833-8543-5fd3276711e8
**Nom de l'entreprise:** PointageFlex Demo

---

## 🔑 Rôles Disponibles dans le Système

1. **Super Administrateur** - Accès complet à la plateforme, gestion des tenants
2. **Administrateur RH** - Gestion complète des ressources humaines
3. **Manager** - Gestion d'équipe et approbations
4. **Employé** - Accès de base pour les employés

---

## 📊 Statistiques Utilisateurs

| Rôle | Nombre d'utilisateurs |
|------|----------------------|
| Super Administrateur | 1 |
| Administrateur RH | 2 |
| Manager | 2 |
| Employé | 2 |
| **TOTAL (utilisateurs uniques)** | **5** |

---

## 🔒 Sécurité

- Tous les mots de passe sont hashés avec bcrypt
- Authentification JWT avec tokens d'accès et de rafraîchissement
- Durée de vie du token d'accès: 15 minutes
- Durée de vie du token de rafraîchissement: 7 jours
- Système RBAC (Role-Based Access Control) complet
- Audit trail de toutes les actions importantes

---

## 📝 Notes Importantes

1. **Changez les mots de passe** en production pour plus de sécurité
2. Le compte **superadmin@pointaflex.com** a été créé spécialement avec accès complet
3. Le compte **admin@demo.com** possède plusieurs rôles (multi-rôles)
4. Tous les comptes sont actuellement actifs
5. Les mots de passe suivent le pattern: Majuscule + minuscules + chiffres + caractère spécial

---

## 🚀 Commandes Utiles

### Démarrer le Backend
```bash
cd backend && npm run start:dev
```

### Démarrer le Frontend
```bash
cd frontend && npm run dev
```

### Se connecter à la base de données
```bash
PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres
```

---

## 📞 Support

Pour toute question ou problème, vérifiez:
- Les logs du backend: vérifier la console où tourne `npm run start:dev`
- Les logs du frontend: vérifier la console où tourne `npm run dev`
- La documentation API: http://localhost:3000/api/docs

---

**Dernière mise à jour:** 11 Décembre 2025 - Création du compte Super Administrateur
