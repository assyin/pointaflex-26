
CAHIER DES CHARGES FINAL — Logiciel SaaS de Gestion de Présence & Pointage
Version prête pour Claude Code — 2025
1. Présentation du projet

Le projet consiste à développer un logiciel SaaS multi-tenant destiné aux entreprises marocaines et internationales pour :

le pointage (biométrie, badge, QR, reconnaissance faciale)

la gestion des horaires

les shifts (matin/soir/nuit)

les équipes

les congés & absences

les récupérations & heures sup

les rapports RH

les exports paie

Le logiciel prendra en référence les fonctionnalités proposées par :
👉 Easy-Pointages – Logiciel de pointage au Maroc
https://www.pointages.ma/services.html

2. Objectifs

Centraliser toutes les données de présence et RH dans une plateforme unique.

Offrir un mode SaaS multi-tenant (plusieurs entreprises, données isolées).

Assurer sécurité, fiabilité et disponibilité.

Gérer biométrie, horaires, shifts, congés, pointages et rapports.

Fournir des calculs précis : heures travaillées, retards, absences, heures sup.

Offrir flexibilité complète pour s’adapter aux réalités du marché marocain (pas de blocage sur les contraintes légales — uniquement des alertes informatives).

Fournir API, exports, intégrations et UI moderne.

3. Périmètre Fonctionnel
3.1 Multi-tenant / Entreprises

Chaque entreprise = tenant.

Données isolées (schéma ou tenant_id).

Paramètres : raison sociale, logo, coordonnées, sites, politiques horaires, jours fériés, tolérances, fuseau horaire.

3.2 Gestion des utilisateurs

4 types de profils :

Super Admin (plateforme) : entreprises, plans, facturation.

Admin RH (par entreprise) : employés, horaires, congés, rapports.

Manager : équipe, validations.

Employé : pointages, solde, demandes.

Authentification :

email + mot de passe, hashé (bcrypt)

JWT + refresh token

Aucun blocage législatif → liberté de paramétrage totale.

3.3 Gestion des employés

Fiche employé : matricule, infos personnelles, poste, service, site.

Compte utilisateur lié.

Affectation à :

un planning

une équipe

un shift

un site

3.4 Pointage — biométrie & terminaux

Types de pointage intégrés obligatoirement :

Empreinte digitale

Badge RFID

Reconnaissance faciale

QR Code

Code PIN

Géolocalisation mobile (optionnel)

Intégration :

Webhooks / API REST pour terminaux

Import CSV/Excel

Données enregistrées : employé, terminal, type (entrée/sortie/pause), date/horaire, localisation.

3.5 Gestion du temps de travail

Heures d'entrée / sortie

Pauses

Calcul automatique :

heures travaillées

retards

absences

départ anticipé

heures supplémentaires

Tolérances personnalisées

Anomalies (manque entrée/sortie, double pointage)

Workflow de correction (employé → manager → RH)

3.6 Congés & absences

Types configurables (CP, maladie, maternité, exceptionnel…)

Processus : demande → validation manager → validation RH

Soldes dynamiques : acquis, pris, restant

Historique complet

3.7 Récupérations / Heures supplémentaires

Conversion auto des heures sup → repos récupérable

Solde spécifique

Workflow de demande/validation

3.8 Shifts, Équipes et Plannings (Matin – Soir – Nuit)

(Module final amélioré selon ta demande)

A. Types de shifts

Matin

Soir

Nuit

Shifts personnalisés

B. Équipes

Création d’équipes (A, B, C…)

Association employés → équipes

Responsable d’équipe

Contraintes personnalisées (optionnelles)

C. Rotations des shifts

⚠️ Très important : rien n’est obligatoire. Les rotations sont 100% optionnelles.
Le responsable peut :

utiliser une rotation 3×8

utiliser aucune rotation

utiliser shifts fixes

personnaliser le cycle librement

D. Planning visuel

Vue Jour / Semaine / Mois

Gantt / Timeline

Indications :

congés

absences

heures sup

anomalies

Mode par équipe, par site ou par employé

E. Contraintes légales → alertes seulement

Le système avertit :

dépassement heures hebdo

repos insuffisant

travail de nuit répétitif

surcharge

effectif insuffisant

⚠️ Un admin peut ignorer l’alerte, jamais de blocage.

F. Remplacements

Remplacement d’un employé sur un shift

Échange de shifts

Validation manager

Historique

G. Export Planning

PDF / Excel

Envoi automatique par email

Notifications mobiles (Nouvelle version du planning, changement de shift…)

3.9 Tableau de bord

Indicateurs :

Présence du jour

Retards

Absences

Congés en cours

Heures sup

Shifts du jour

Filtres : période, site, service, équipe.

3.10 Rapports & exports

Feuille de présence

Récap retards/absences

Heures sup

Congés & récupérations

Export CSV / Excel / PDF

Export paie : données calculées prêtes à importer

4. Exigences non fonctionnelles
4.1 Stack technique

Backend : NestJS + TypeScript

Base : PostgreSQL (Supabase recommandé)

ORM : TypeORM ou Prisma

Frontend : React + TypeScript (idéalement Next.js)

Data fetching : React Query

Déploiement :

Backend → Render / Railway

Frontend → Vercel / Netlify

4.2 Sécurité

HTTPS

JWT + refresh

RBAC strict

Rate Limiting

Audit Log : modifications de pointage, congés, horaires, planning

4.3 Performance / Scalabilité

Multi-entreprises + centaines d’employés

Pagination, recherche, filtres

API REST versionnée

Architecture scalable horizontalement

4.4 Sauvegardes & disponibilité

Backups quotidiens

Restauration simple (RPO/RTO définis)

Monitoring : uptime, erreurs, perf requêtes

5. Design & UX

UI moderne, responsive

Interface en français (anglais/arabe possible plus tard)

Navigation : Dashboard, Employés, Pointages, Congés, Shifts, Rapports, Paramètres

Validations front & back

Feedback UX (toasts, erreurs détaillées)

6. API & Intégrations

API /api/v1/...

Swagger auto

Webhooks de pointage

Endpoints paie / exports

Import CSV/Excel

7. Architecture backend

Modules :

Auth

Tenants

Users/Roles

Employees

Attendance (Pointages)

Shifts

Teams

Schedules

Leaves

Overtime/Recovery

Reports

AuditLog

Architecture :

Controllers

Services

Repositories

Entités

Clean / Hexagonal recommandé

Multi-tenancy :

résolution par domaine ou header X-Tenant-ID

isolation par schéma ou RLS

8. Phasage pour Claude Code
Phase 1 — Base SaaS & Auth

Tenants

Users/Roles

Auth JWT

Multi-tenancy minimal

Phase 2 — Employés & Pointages

CRUD employés

Terminaux & Webhooks

Calcul basique

Phase 3 — Shifts, Teams & Plannings

Shifts (matin/soir/nuit)

Équipes

Planning visuel

Workflow remplacement

Alertes non bloquantes

(Rotations facultatives)

Phase 4 — Congés & récupérations

Workflow

Soldes

Historique

Phase 5 — Rapports, Exports, Dashboard

Rapports RH

Exports PDF/Excel

Dashboard temps réel

Phase 6 — Sécurité, audit, performance, backups
9. PROMPT FINAL À COLLER DANS CLAUDE CODE

À copier/coller directement :

PROMPT →

Tu es un développeur full-stack senior expert en SaaS multi-tenant.
Développe une application complète de gestion de présence inspirée de Easy-Pointages.

Inclure absolument :

pointage biométrique (empreinte, visage), badge, QR, PIN

multi-tenant (NestJS + PostgreSQL + TypeORM/Prisma)

gestion des employés, horaires, équipes, shifts (matin/soir/nuit)

rotations optionnelles (jamais obligatoires)

alertes légales non bloquantes (repos insuffisant, heures >44h, travail de nuit répétitif)

planning visuel + remplacements

congés, absences, récupérations

heures sup

rapports & exports PDF/Excel

webhooks terminaux

UI React/Next.js + React Query

audit log, RBAC, JWT, HTTPS

Ta mission :

Proposer un schéma PostgreSQL complet multi-tenant.

Générer l’architecture NestJS : modules, services, contrôleurs, entités.

Écrire le code des modules dans l’ordre :

Auth / Tenants / Users

Employees

Attendance

Shifts / Teams / Planning

Leaves / Overtime

Reports / Audit

Générer les endpoints REST /api/v1/... avec Swagger.

Générer la structure frontend Next.js, pages et composants.

Fournir un README : scripts npm, lancement Docker, variables d’environnement.

Garde la structure flexible, paramétrable, et adaptée au contexte marocain.
Aucune contrainte légale ne doit bloquer : uniquement des alertes d’information.