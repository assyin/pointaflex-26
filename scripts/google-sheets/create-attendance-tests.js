#!/usr/bin/env node

/**
 * Script pour créer la feuille de tests du module Attendance
 * Basé sur le template existant
 */

const { authorize } = require('./sheets-service');
const { google } = require('googleapis');

const SPREADSHEET_ID = '1UKA3U02awDzAYzeQnSiHc_EVK9XPHLODDEvmvP-STiI';
const SHEET_NAME = 'Test';

// Définition des scénarios de test pour le module Attendance
const testScenarios = [
  // === POINTAGE MANUEL ===
  ['**Pointage Manuel**', 'Création d\'un pointage IN manuel', 'Fonctionnel', 'Vérifier que le pointage est créé avec l\'heure exacte et apparaît dans la liste'],
  ['**Pointage Manuel**', 'Création d\'un pointage OUT manuel', 'Fonctionnel', 'Vérifier le calcul automatique des heures travaillées'],
  ['**Pointage Manuel**', 'Création pointage sans permission', 'Sécurité', 'Vérifier le message d\'erreur 403 Forbidden'],
  ['**Pointage Manuel**', 'Suppression d\'un pointage manuel', 'Fonctionnel', 'Vérifier que seuls les pointages MANUAL peuvent être supprimés'],
  ['**Pointage Manuel**', 'Tentative suppression pointage FINGERPRINT', 'Sécurité', 'Vérifier le blocage avec message d\'erreur approprié'],
  ['**Pointage Manuel**', 'Suppression pointage avec heures sup approuvées', 'Fonctionnel', 'Vérifier le blocage si overtime approuvé existe'],

  // === WEBHOOK / TERMINAUX ===
  ['**Webhook Terminaux**', 'Réception webhook IN valide', 'Intégration', 'Vérifier création du pointage et réponse 200 OK'],
  ['**Webhook Terminaux**', 'Réception webhook OUT valide', 'Intégration', 'Vérifier calcul heures travaillées et création auto overtime'],
  ['**Webhook Terminaux**', 'Webhook avec X-Device-ID invalide', 'Sécurité', 'Vérifier rejet avec erreur 401 Unauthorized'],
  ['**Webhook Terminaux**', 'Webhook avec X-API-Key invalide', 'Sécurité', 'Vérifier rejet avec erreur 401 Unauthorized'],
  ['**Webhook Terminaux**', 'Webhook fast (asynchrone)', 'Performance', 'Vérifier réponse immédiate et traitement en arrière-plan'],
  ['**Webhook Terminaux**', 'Push ZKTeco format natif', 'Intégration', 'Vérifier conversion automatique du format ZKTeco'],

  // === ANTI-REBOND (DEBOUNCE) ===
  ['**Anti-Rebond**', 'Double badgeage < 60 secondes', 'Fonctionnel', 'Vérifier création anomalie DEBOUNCE_BLOCKED (informative)'],
  ['**Anti-Rebond**', 'Badge après 60 secondes', 'Fonctionnel', 'Vérifier création normale du pointage'],
  ['**Anti-Rebond**', 'Endpoint /count pour terminal', 'Intégration', 'Vérifier retour du nombre de pointages du jour'],

  // === DÉTECTION D\'ANOMALIES ===
  ['**Détection Anomalies**', 'Détection RETARD (LATE)', 'Fonctionnel', 'Vérifier détection quand arrivée > heure planifiée + tolérance'],
  ['**Détection Anomalies**', 'Détection ABSENCE totale', 'Fonctionnel', 'Vérifier détection quand aucun IN sur jour travaillé'],
  ['**Détection Anomalies**', 'Détection ABSENCE_PARTIAL', 'Fonctionnel', 'Vérifier détection retard + départ anticipé combinés'],
  ['**Détection Anomalies**', 'Détection MISSING_IN', 'Fonctionnel', 'Vérifier détection OUT sans IN correspondant'],
  ['**Détection Anomalies**', 'Détection MISSING_OUT', 'Fonctionnel', 'Vérifier détection IN sans OUT (session ouverte)'],
  ['**Détection Anomalies**', 'Détection EARLY_LEAVE', 'Fonctionnel', 'Vérifier détection départ avant fin planifiée'],
  ['**Détection Anomalies**', 'Détection DOUBLE_IN', 'Fonctionnel', 'Vérifier détection deux IN consécutifs sans OUT'],
  ['**Détection Anomalies**', 'Détection DOUBLE_OUT', 'Fonctionnel', 'Vérifier détection deux OUT consécutifs sans IN'],
  ['**Détection Anomalies**', 'Détection JOUR_FERIE_TRAVAILLE', 'Fonctionnel', 'Vérifier détection pointage sur jour férié'],
  ['**Détection Anomalies**', 'Détection INSUFFICIENT_REST', 'Fonctionnel', 'Vérifier détection repos < durée minimale configurée'],
  ['**Détection Anomalies**', 'Détection UNPLANNED_PUNCH', 'Fonctionnel', 'Vérifier détection pointage hors planning publié'],

  // === CORRECTION ANOMALIES ===
  ['**Correction Anomalies**', 'Correction simple avec code raison', 'Fonctionnel', 'Vérifier mise à jour timestamp et enregistrement raison'],
  ['**Correction Anomalies**', 'Correction avec note explicative', 'Fonctionnel', 'Vérifier sauvegarde de la note de correction'],
  ['**Correction Anomalies**', 'Correction par employé (propre pointage)', 'Fonctionnel', 'Vérifier création demande d\'approbation manager'],
  ['**Correction Anomalies**', 'Correction par manager (équipe)', 'Fonctionnel', 'Vérifier auto-approbation selon permissions'],
  ['**Correction Anomalies**', 'Correction bulk (multiple anomalies)', 'Fonctionnel', 'Vérifier correction en masse avec note générale'],
  ['**Correction Anomalies**', 'Correction bulk avec forceApproval', 'Fonctionnel', 'Vérifier bypass workflow approbation (admin)'],
  ['**Correction Anomalies**', 'Historique des corrections', 'Fonctionnel', 'Vérifier audit trail complet des modifications'],

  // === APPROBATION CORRECTIONS ===
  ['**Approbation**', 'Approbation correction par manager', 'Fonctionnel', 'Vérifier mise à jour statut APPROVED'],
  ['**Approbation**', 'Rejet correction avec commentaire', 'Fonctionnel', 'Vérifier statut REJECTED et notification employé'],
  ['**Approbation**', 'Notification manager pour approbation', 'Fonctionnel', 'Vérifier envoi notification au manager concerné'],

  // === CODES RAISON ===
  ['**Codes Raison**', 'Code FORGOT_BADGE', 'Fonctionnel', 'Vérifier acceptation code oubli de badge'],
  ['**Codes Raison**', 'Code DEVICE_FAILURE', 'Fonctionnel', 'Vérifier acceptation code panne terminal'],
  ['**Codes Raison**', 'Code EXTERNAL_MEETING', 'Fonctionnel', 'Vérifier acceptation code réunion externe'],
  ['**Codes Raison**', 'Code TRAFFIC', 'Fonctionnel', 'Vérifier acceptation code embouteillage'],
  ['**Codes Raison**', 'Code MEDICAL_APPOINTMENT', 'Fonctionnel', 'Vérifier acceptation code RDV médical'],
  ['**Codes Raison**', 'Code TELEWORK', 'Fonctionnel', 'Vérifier acceptation code télétravail'],

  // === FILTRES ET RECHERCHE ===
  ['**Filtres**', 'Filtre par employé', 'Fonctionnel', 'Vérifier affichage uniquement pointages employé sélectionné'],
  ['**Filtres**', 'Filtre par site', 'Fonctionnel', 'Vérifier affichage uniquement pointages du site'],
  ['**Filtres**', 'Filtre par plage de dates', 'Fonctionnel', 'Vérifier affichage pointages dans la période'],
  ['**Filtres**', 'Filtre par type (IN/OUT)', 'Fonctionnel', 'Vérifier filtrage par type de pointage'],
  ['**Filtres**', 'Filtre anomalies uniquement', 'Fonctionnel', 'Vérifier affichage uniquement enregistrements avec anomalie'],
  ['**Filtres**', 'Filtre par type d\'anomalie', 'Fonctionnel', 'Vérifier filtrage par type d\'anomalie spécifique'],
  ['**Filtres**', 'Filtre par statut correction', 'Fonctionnel', 'Vérifier filtrage corrigé/non corrigé'],
  ['**Filtres**', 'Recherche par nom employé', 'Fonctionnel', 'Vérifier recherche textuelle dans liste'],
  ['**Filtres**', 'Combinaison multiple filtres', 'Fonctionnel', 'Vérifier fonctionnement filtres combinés'],
  ['**Filtres**', 'Reset filtres', 'Fonctionnel', 'Vérifier remise à zéro de tous les filtres'],

  // === PERMISSIONS RBAC ===
  ['**Permissions**', 'attendance.view_own - voir ses pointages', 'Sécurité', 'Vérifier accès limité à ses propres données'],
  ['**Permissions**', 'attendance.view_team - voir équipe', 'Sécurité', 'Vérifier accès aux données de l\'équipe uniquement'],
  ['**Permissions**', 'attendance.view_department - voir département', 'Sécurité', 'Vérifier accès aux données du département'],
  ['**Permissions**', 'attendance.view_site - voir site', 'Sécurité', 'Vérifier accès aux données du site'],
  ['**Permissions**', 'attendance.view_all - voir tout', 'Sécurité', 'Vérifier accès complet admin'],
  ['**Permissions**', 'attendance.create - créer pointage', 'Sécurité', 'Vérifier permission création manuelle'],
  ['**Permissions**', 'attendance.edit - modifier pointage', 'Sécurité', 'Vérifier permission modification'],
  ['**Permissions**', 'attendance.delete - supprimer pointage', 'Sécurité', 'Vérifier permission suppression'],
  ['**Permissions**', 'attendance.correct - corriger anomalie', 'Sécurité', 'Vérifier permission correction'],
  ['**Permissions**', 'attendance.view_anomalies - voir anomalies', 'Sécurité', 'Vérifier accès page anomalies'],

  // === EXPORT ===
  ['**Export**', 'Export CSV pointages', 'Fonctionnel', 'Vérifier génération fichier CSV avec données correctes'],
  ['**Export**', 'Export Excel pointages', 'Fonctionnel', 'Vérifier génération fichier XLSX formaté'],
  ['**Export**', 'Export anomalies CSV', 'Fonctionnel', 'Vérifier export uniquement anomalies'],
  ['**Export**', 'Export avec filtres appliqués', 'Fonctionnel', 'Vérifier que l\'export respecte les filtres actifs'],

  // === DASHBOARD ANOMALIES ===
  ['**Dashboard Anomalies**', 'Affichage cartes résumé', 'UI/UX', 'Vérifier affichage Total/Corrigées/En attente'],
  ['**Dashboard Anomalies**', 'Graphique par type d\'anomalie', 'UI/UX', 'Vérifier génération graphique par type'],
  ['**Dashboard Anomalies**', 'Graphique par jour', 'UI/UX', 'Vérifier génération graphique tendance temporelle'],
  ['**Dashboard Anomalies**', 'Alerte taux anomalies élevé', 'Fonctionnel', 'Vérifier affichage alerte si taux > seuil'],
  ['**Dashboard Anomalies**', 'Rafraîchissement automatique', 'Performance', 'Vérifier mise à jour données toutes les 60s'],

  // === STATISTIQUES ===
  ['**Statistiques**', 'Taux de présence employé', 'Fonctionnel', 'Vérifier calcul pourcentage présence'],
  ['**Statistiques**', 'Taux de ponctualité employé', 'Fonctionnel', 'Vérifier calcul retards/départs anticipés'],
  ['**Statistiques**', 'Tendances sur période', 'Fonctionnel', 'Vérifier données time-series pour graphiques'],
  ['**Statistiques**', 'Anomalies récurrentes', 'Fonctionnel', 'Vérifier détection patterns répétitifs'],
  ['**Statistiques**', 'Rapport mensuel par département', 'Fonctionnel', 'Vérifier génération rapport départemental'],

  // === HEURES SUPPLÉMENTAIRES AUTO ===
  ['**Overtime Auto**', 'Création auto overtime sur OUT', 'Fonctionnel', 'Vérifier création record overtime PENDING'],
  ['**Overtime Auto**', 'Respect seuil minimum', 'Fonctionnel', 'Vérifier pas de création si < seuil configuré'],
  ['**Overtime Auto**', 'Détection type STANDARD', 'Fonctionnel', 'Vérifier classification heures sup standard'],
  ['**Overtime Auto**', 'Détection type NIGHT', 'Fonctionnel', 'Vérifier classification heures sup nuit'],
  ['**Overtime Auto**', 'Détection type HOLIDAY', 'Fonctionnel', 'Vérifier classification heures sup jour férié'],
  ['**Overtime Auto**', 'Vérification éligibilité employé', 'Fonctionnel', 'Vérifier flag isEligibleForOvertime'],
  ['**Overtime Auto**', 'Exclusion employé en congé', 'Fonctionnel', 'Vérifier pas de création si congé approuvé'],

  // === SHIFT DE NUIT ===
  ['**Shift Nuit**', 'Pointage IN après minuit', 'Fonctionnel', 'Vérifier association correcte au shift précédent'],
  ['**Shift Nuit**', 'Pointage OUT lendemain matin', 'Fonctionnel', 'Vérifier calcul heures correct cross-midnight'],
  ['**Shift Nuit**', 'Détection automatique shift nuit', 'Fonctionnel', 'Vérifier isNightShift() basé sur horaires'],
  ['**Shift Nuit**', 'Taux majoration nuit', 'Fonctionnel', 'Vérifier application taux configurable (1.5x)'],

  // === TIMEZONE ===
  ['**Timezone**', 'Affichage heure locale utilisateur', 'UI/UX', 'Vérifier conversion timezone dans l\'interface'],
  ['**Timezone**', 'Stockage UTC en base', 'Fonctionnel', 'Vérifier timestamps stockés en UTC'],
  ['**Timezone**', 'Filtres date respectent timezone', 'Fonctionnel', 'Vérifier bornes de date en timezone locale'],
  ['**Timezone**', 'Gestion changement heure (DST)', 'Fonctionnel', 'Vérifier calculs corrects pendant DST'],

  // === JOBS AUTOMATIQUES ===
  ['**Jobs Auto**', 'Job détection absences (1h)', 'Fonctionnel', 'Vérifier exécution quotidienne et création anomalies'],
  ['**Jobs Auto**', 'Job détection MISSING_OUT (minuit)', 'Fonctionnel', 'Vérifier détection sessions ouvertes'],
  ['**Jobs Auto**', 'Job fermeture auto sessions (2h)', 'Fonctionnel', 'Vérifier clôture sessions orphelines'],
  ['**Jobs Auto**', 'Notifications manager anomalies', 'Fonctionnel', 'Vérifier envoi notifications batch'],

  // === INTERFACE UTILISATEUR ===
  ['**Interface**', 'Responsive mobile', 'UI/UX', 'Vérifier affichage correct sur mobile'],
  ['**Interface**', 'Pagination liste pointages', 'UI/UX', 'Vérifier navigation pages avec grands volumes'],
  ['**Interface**', 'Tri colonnes tableau', 'UI/UX', 'Vérifier tri par date, employé, type'],
  ['**Interface**', 'Modal création pointage', 'UI/UX', 'Vérifier formulaire et validation'],
  ['**Interface**', 'Modal correction anomalie', 'UI/UX', 'Vérifier formulaire avec codes raison'],
  ['**Interface**', 'Toast notifications succès/erreur', 'UI/UX', 'Vérifier messages feedback utilisateur'],
  ['**Interface**', 'Loading states', 'UI/UX', 'Vérifier indicateurs chargement'],
  ['**Interface**', 'Sélection multiple (checkbox)', 'UI/UX', 'Vérifier sélection bulk pour corrections'],

  // === PERFORMANCE ===
  ['**Performance**', 'Chargement liste < 2s (1000 records)', 'Performance', 'Vérifier temps réponse acceptable'],
  ['**Performance**', 'Export Excel < 5s (10000 records)', 'Performance', 'Vérifier génération fichier rapide'],
  ['**Performance**', 'Webhook response < 500ms', 'Performance', 'Vérifier temps réponse terminal'],
  ['**Performance**', 'Dashboard refresh < 1s', 'Performance', 'Vérifier mise à jour rapide graphiques'],

  // === INTÉGRATION ===
  ['**Intégration**', 'Lien avec module Employees', 'Intégration', 'Vérifier récupération infos employé'],
  ['**Intégration**', 'Lien avec module Schedules', 'Intégration', 'Vérifier récupération planning pour anomalies'],
  ['**Intégration**', 'Lien avec module Overtime', 'Intégration', 'Vérifier création auto heures sup'],
  ['**Intégration**', 'Lien avec module Leaves', 'Intégration', 'Vérifier exclusion employés en congé'],
  ['**Intégration**', 'Lien avec module Sites', 'Intégration', 'Vérifier association site/terminal'],
  ['**Intégration**', 'Lien avec module Devices', 'Intégration', 'Vérifier validation terminal source'],
];

async function main() {
  try {
    console.log('🔐 Authentification...');
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Créer la nouvelle feuille "Test"
    console.log('\n📝 Création de la feuille "Test"...');

    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: SHEET_NAME,
                gridProperties: {
                  rowCount: testScenarios.length + 10,
                  columnCount: 8
                }
              }
            }
          }]
        }
      });
      console.log('✅ Feuille "Test" créée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ La feuille "Test" existe déjà, mise à jour...');
      } else {
        throw error;
      }
    }

    // 2. Préparer les données avec headers
    const headers = [
      '',  // Ligne vide comme dans Template
    ];

    const headerRow = [
      'Composant / Fonctionnalité',
      'Scénario de Test',
      'Type de Test',
      'Étapes Clés de Vérification',
      'Statut de l\'Implémentation (Vrai/Faux)',
      'Priorité (Élevée/Moyenne/Faible)',
      'Responsable',
      'Date de Fin Prévue'
    ];

    // Construire toutes les données
    const allData = [
      [],  // Ligne 1 vide
      headerRow,  // Ligne 2 headers
      ...testScenarios.map(scenario => [
        scenario[0],  // Composant
        scenario[1],  // Scénario
        scenario[2],  // Type
        scenario[3],  // Étapes
        '',           // Statut (vide - à remplir par l'utilisateur)
        '',           // Priorité (vide - à remplir par l'utilisateur)
        '',           // Responsable (vide - à remplir par l'utilisateur)
        ''            // Date (vide - à remplir par l'utilisateur)
      ])
    ];

    // 3. Écrire les données
    console.log('\n📊 Écriture des données...');

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:H${allData.length}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: allData }
    });

    console.log(`✅ ${testScenarios.length} scénarios de test ajoutés`);

    // 4. Formater la feuille (header en gras, couleurs)
    console.log('\n🎨 Formatage...');

    // Obtenir l'ID de la feuille
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });

    const testSheet = spreadsheet.data.sheets.find(s => s.properties.title === SHEET_NAME);
    const sheetId = testSheet?.properties.sheetId;

    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            // Header row bold et background
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 1,
                  endRowIndex: 2,
                  startColumnIndex: 0,
                  endColumnIndex: 8
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            },
            // Freeze header row
            {
              updateSheetProperties: {
                properties: {
                  sheetId: sheetId,
                  gridProperties: { frozenRowCount: 2 }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            },
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 8
                }
              }
            }
          ]
        }
      });
      console.log('✅ Formatage appliqué');
    }

    console.log('\n🎉 Terminé !');
    console.log(`\n📋 Résumé:`);
    console.log(`   - Feuille: "${SHEET_NAME}"`);
    console.log(`   - Scénarios de test: ${testScenarios.length}`);
    console.log(`   - Colonnes à remplir par vous:`);
    console.log(`     • Statut de l'Implémentation`);
    console.log(`     • Priorité`);
    console.log(`     • Responsable`);
    console.log(`     • Date de Fin Prévue`);
    console.log(`\n🔗 Lien: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();
