Contexte – Information critique nouvelle

Les tests terrain sont 100 % concluants.

Les terminaux ZKTeco envoient nativement et de manière fiable le champ state :

state = 0 → IN (Check-In)

state = 1 → OUT (Check-Out)

Séquence testée et validée :

IN → OUT → IN → OUT


Aucun calcul, aucune ambiguïté côté terminal.

👉 Cela change fondamentalement l’architecture logique du système de pointage.

1. Objectif principal

Je te demande de refaire l’analyse complète du système PointaFlex en partant de ce nouvel invariant fort :

Le type IN / OUT est désormais une information source fiable fournie par le terminal, et ne doit PLUS être déduite par le backend.

L’objectif est de livrer UNE SOLUTION FINALE, SIMPLIFIÉE, ROBUSTE ET DÉPLOYABLE IMMÉDIATEMENT EN PRODUCTION, en exploitant pleinement cette donnée state.

2. Conséquences attendues (obligatoires)

Ta nouvelle analyse DOIT :

Supprimer définitivement toute logique de déduction IN / OUT

Plus d’alternation

Plus de heuristiques temporelles

Plus de seuils pour deviner IN ou OUT

Recentrer le backend sur son vrai rôle

Validation

Enrichissement métier

Calcul des anomalies

Cohérence avec planning / shifts / congés

Éliminer définitivement les bugs historiques

Inversions IN/OUT

Sessions orphelines artificielles

Effets de bord liés aux shifts nuit

Régressions liées aux correctifs successifs

3. Contrainte de cohérence avec l’existant (CRITIQUE)

Toute la logique proposée DOIT être strictement cohérente avec les modules déjà implémentés et utilisés :

Shifts

Planning

Tenant Settings

Anomalies

Congés / Absences

Employés

Multi-sites / multi-terminaux

👉 Le backend doit consommer state, pas le recalculer.
👉 Les écrans existants ne doivent pas être modifiés.
👉 Les données historiques doivent rester valides.

4. Attentes fonctionnelles obligatoires

La solution finale DOIT garantir :

IN / OUT exacts à 100 %

Source unique : terminal

Aucune interprétation côté backend

Gestion correcte de tous les cas métier

Shifts jour / nuit (cross-day)

Multi-pointages (pauses, déplacements)

Heures supplémentaires

Départs anticipés réels

Retards réels

Journées fériées

Congés

Sessions cohérentes

Pas de session fantôme

Pas de fermeture automatique arbitraire

Pas d’inversion d’état

Anomalies exactes et auditées

Calculées uniquement à partir de :

shift

planning

punches IN/OUT réels

Aucun calcul basé sur une hypothèse

5. Contraintes techniques

Tu DOIS :

Être compatible avec :

zkteco-js

Adapter la logique de sync pour :

consommer state

persister IN / OUT tels quels

Séparer strictement :

ingestion des pointages

gestion des sessions

calcul des anomalies

Centraliser toutes les règles métier dans :

Shift

Tenant Settings

6. Livrables attendus (structure obligatoire)

Ta réponse DOIT contenir :

A. Diagnostic révisé

Pourquoi la logique précédente était inutilement complexe

Ce que l’introduction de state simplifie définitivement

Quels bugs disparaissent structurellement

B. Architecture finale simplifiée

Flux terminal → sync → backend → anomalies

Rôle exact de chaque composant

Modèle de données final

C. Algorithme final

Basé exclusivement sur state

Déterministe

Sans heuristiques temporelles

D. Implémentation prête production

Exemple de script de sync avec zkteco-js

Traitement backend TypeScript

Validation des incohérences (IN sans OUT précédent, etc.)

Logs métiers clairs

E. Migration & rétrocompatibilité

Stratégie hybride temporaire si nécessaire

Aucun impact sur l’historique

F. Scénarios de validation

Cas normaux

Cas multi-pointages

Cas nuit

Cas congés + pointage

Cas déjà problématiques dans l’historique

7. Instruction finale

Ne propose aucune solution alternative.
Ne reviens pas à une logique de déduction IN / OUT.
Considère state comme une vérité absolue.

👉 Fournis LA solution finale que je peux déployer immédiatement.