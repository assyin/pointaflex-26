#!/bin/bash

# =============================================================================
# SCRIPT DE TEST - SIMULATION DE BADGES TERMINAL
# =============================================================================
# Ce script simule les badges envoyés par un terminal ZKTeco vers PointaFlex
#
# Usage: ./scripts/test-terminal-badges.sh [test_name]
# Exemples:
#   ./scripts/test-terminal-badges.sh           # Lance tous les tests
#   ./scripts/test-terminal-badges.sh debounce  # Lance uniquement le test anti-rebond
#   ./scripts/test-terminal-badges.sh pause     # Lance uniquement le test pause
#   ./scripts/test-terminal-badges.sh orphan    # Lance uniquement le test session orpheline
# =============================================================================

# Configuration
API_URL="http://localhost:3000/api/v1"
DEVICE_ID="TEST-DEVICE-001"
TENANT_ID="340a6c2a-160e-4f4b-917e-6eea8fd5ff2d"

# Employés de test
EMP_NORMAL="EMP001"      # Jean Normal
EMP_LIMITE="EMP002"      # Marie Limite
EMP_NUIT="EMP004"        # Sophie Nuit

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

print_header() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════════${NC}"
}

print_subheader() {
    echo ""
    echo -e "${CYAN}───────────────────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}───────────────────────────────────────────────────────────────────────────${NC}"
}

print_step() {
    echo -e "${YELLOW}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Fonction pour envoyer un badge via le webhook
send_badge() {
    local matricule=$1
    local timestamp=$2
    local state=$3  # 0=OUT, 1=IN
    local verifymode=${4:-1}  # 1=fingerprint par défaut

    local type_label="IN"
    if [ "$state" == "0" ]; then
        type_label="OUT"
    fi

    print_step "Badge $type_label pour $matricule à $timestamp"

    response=$(curl -s -X POST "$API_URL/attendance/webhook" \
        -H "Content-Type: application/json" \
        -H "X-Device-ID: $DEVICE_ID" \
        -H "X-Tenant-ID: $TENANT_ID" \
        -d "{
            \"employeeId\": \"$matricule\",
            \"timestamp\": \"$timestamp\",
            \"type\": \"$type_label\",
            \"method\": \"FINGERPRINT\",
            \"rawData\": {
                \"pin\": \"$matricule\",
                \"time\": \"$timestamp\",
                \"state\": $state,
                \"verifymode\": $verifymode,
                \"source\": \"TEST_SCRIPT\"
            }
        }")

    echo -e "   Réponse: ${CYAN}$response${NC}"
    echo ""

    # Retourner la réponse pour analyse
    echo "$response"
}

# Fonction pour envoyer un badge via le push URL (format ZKTeco natif)
send_badge_push() {
    local matricule=$1
    local timestamp=$2
    local state=$3  # 0=OUT, 1=IN
    local verifymode=${4:-1}

    local type_label="IN"
    if [ "$state" == "0" ]; then
        type_label="OUT"
    fi

    print_step "Badge Push $type_label pour $matricule à $timestamp"

    response=$(curl -s -X POST "$API_URL/attendance/push" \
        -H "Content-Type: application/json" \
        -H "X-Tenant-ID: $TENANT_ID" \
        -d "{
            \"SN\": \"$DEVICE_ID\",
            \"pin\": \"$matricule\",
            \"time\": \"$timestamp\",
            \"state\": $state,
            \"verifymode\": $verifymode
        }")

    echo -e "   Réponse: ${CYAN}$response${NC}"
    echo ""
}

# Générer un timestamp ISO
get_timestamp() {
    local offset_minutes=${1:-0}
    date -d "+$offset_minutes minutes" -Iseconds
}

# Générer un timestamp pour une heure spécifique aujourd'hui
get_timestamp_at() {
    local hour=$1
    local minute=${2:-0}
    date -d "today $hour:$minute:00" -Iseconds
}

# Nettoyer les pointages de test d'aujourd'hui
cleanup_today() {
    print_step "Nettoyage des pointages de test d'aujourd'hui..."
    # Cette fonction pourrait appeler un endpoint admin ou une requête SQL
    echo "   (Nettoyage manuel requis si nécessaire)"
}

# =============================================================================
# TEST 1: ANTI-REBOND (Double Badge)
# =============================================================================
test_debounce() {
    print_header "TEST 1: ANTI-REBOND (Double Badge)"

    print_info "Configuration actuelle: doublePunchToleranceMinutes = 4 min"
    print_info "Comportement attendu: Le 2ème badge dans les 4 min sera ignoré"
    echo ""

    local now=$(get_timestamp 0)
    local soon=$(get_timestamp 1)  # 1 minute après
    local later=$(get_timestamp 5) # 5 minutes après

    print_subheader "Scénario 1.1: Badge rapproché (< 4 min)"

    # Premier badge
    print_step "1er badge à $now"
    send_badge "$EMP_NORMAL" "$now" "1"

    sleep 2

    # Deuxième badge rapide (devrait être ignoré)
    print_step "2ème badge à $soon (1 min après - devrait être IGNORÉ)"
    response=$(send_badge "$EMP_NORMAL" "$soon" "1")

    if echo "$response" | grep -q "DEBOUNCE\|ignored"; then
        print_success "Le badge a été correctement ignoré (DEBOUNCE)"
    else
        print_warning "Vérifiez les logs backend pour confirmation"
    fi

    echo ""
    print_subheader "Scénario 1.2: Badge espacé (> 4 min)"

    # Troisième badge après délai (devrait être accepté)
    print_step "3ème badge à $later (5 min après - devrait être ACCEPTÉ)"
    send_badge "$EMP_NORMAL" "$later" "1"

    print_info "Vérifiez les logs backend pour: '⚠️ [DEBOUNCE] Badge ignoré'"
}

# =============================================================================
# TEST 2: PAUSES IMPLICITES
# =============================================================================
test_implicit_pause() {
    print_header "TEST 2: PAUSES IMPLICITES"

    print_info "Configuration actuelle:"
    print_info "  - allowImplicitBreaks = true"
    print_info "  - minImplicitBreakMinutes = 30 min"
    print_info "  - maxImplicitBreakMinutes = 120 min"
    echo ""

    # Utiliser des timestamps relatifs à maintenant
    local morning_in=$(get_timestamp_at "08" "00")
    local lunch_out=$(get_timestamp_at "12" "00")
    local lunch_in_normal=$(get_timestamp_at "13" "00")   # 60 min - pause normale
    local lunch_in_short=$(get_timestamp_at "12" "15")    # 15 min - trop court
    local lunch_in_long=$(get_timestamp_at "15" "30")     # 210 min - trop long

    print_subheader "Scénario 2.1: Pause déjeuner normale (60 min)"
    print_info "Attendu: Le retour ne génère PAS d'anomalie (pause implicite reconnue)"

    send_badge "$EMP_LIMITE" "$morning_in" "1"  # IN 08:00
    sleep 1
    send_badge "$EMP_LIMITE" "$lunch_out" "0"   # OUT 12:00
    sleep 1
    send_badge "$EMP_LIMITE" "$lunch_in_normal" "1"  # IN 13:00 (60 min après)

    print_info "Vérifiez les logs: '✅ Pause implicite détectée'"

    echo ""
    print_subheader "Scénario 2.2: Pause trop courte (15 min)"
    print_info "Attendu: Peut être traité comme double badge ou anomalie"

    # Reset avec nouveau employé
    send_badge "$EMP_NUIT" "$lunch_out" "0"     # OUT 12:00
    sleep 1
    send_badge "$EMP_NUIT" "$lunch_in_short" "1" # IN 12:15 (15 min - trop court)

    print_warning "15 min < 30 min minimum → peut générer anomalie"

    echo ""
    print_subheader "Scénario 2.3: Pause trop longue (210 min)"
    print_info "Attendu: Génère anomalie ABSENCE_PARTIAL"

    # Utiliser un autre matricule pour éviter conflits
    local other_out=$(get_timestamp_at "10" "00")
    local other_in=$(get_timestamp_at "13" "30")  # 210 min après

    send_badge "EMP003" "$other_out" "0"    # OUT 10:00
    sleep 1
    send_badge "EMP003" "$other_in" "1"     # IN 13:30 (210 min après)

    print_warning "210 min > 120 min maximum → devrait générer ABSENCE_PARTIAL"
}

# =============================================================================
# TEST 3: SESSION ORPHELINE (préparation pour job auto-close)
# =============================================================================
test_orphan_session() {
    print_header "TEST 3: SESSION ORPHELINE (préparation)"

    print_info "Configuration actuelle:"
    print_info "  - autoCloseOrphanSessions = true"
    print_info "  - autoCloseDefaultTime = 23:59"
    print_info "  - autoCloseOvertimeBuffer = 60 min"
    print_info "  - autoCloseCheckApprovedOvertime = true"
    echo ""

    print_subheader "Création d'une session orpheline"

    local orphan_in=$(get_timestamp_at "08" "30")

    # Créer un IN sans OUT
    send_badge "EMP005" "$orphan_in" "1"  # IN 08:30

    print_info "Session créée: IN à 08:30 SANS OUT"
    print_info "Cette session sera marquée MISSING_OUT"
    print_info "Le job à 2h00 du matin créera un OUT automatique"

    echo ""
    print_warning "Pour tester le job de clôture automatique:"
    echo "  1. Attendre 2h00 du matin"
    echo "  2. OU modifier le cron pour tester immédiatement"
    echo "  3. OU déclencher manuellement via endpoint admin"
}

# =============================================================================
# TEST 4: FLUX COMPLET D'UNE JOURNÉE
# =============================================================================
test_full_day() {
    print_header "TEST 4: FLUX COMPLET D'UNE JOURNÉE"

    print_info "Simulation d'une journée complète de travail"
    echo ""

    local day_in=$(get_timestamp_at "08" "00")
    local break_out=$(get_timestamp_at "12" "00")
    local break_in=$(get_timestamp_at "13" "00")
    local day_out=$(get_timestamp_at "17" "00")

    print_subheader "Journée de Jean Normal (EMP001)"

    echo "📅 Timeline prévue:"
    echo "   08:00 → IN (arrivée)"
    echo "   12:00 → OUT (pause déjeuner)"
    echo "   13:00 → IN (retour pause)"
    echo "   17:00 → OUT (départ)"
    echo ""

    print_step "08:00 - Arrivée"
    send_badge "$EMP_NORMAL" "$day_in" "1"
    sleep 1

    print_step "12:00 - Pause déjeuner"
    send_badge "$EMP_NORMAL" "$break_out" "0"
    sleep 1

    print_step "13:00 - Retour de pause"
    send_badge "$EMP_NORMAL" "$break_in" "1"
    sleep 1

    print_step "17:00 - Départ"
    send_badge "$EMP_NORMAL" "$day_out" "0"

    echo ""
    print_success "Journée complète simulée!"
    print_info "Résultat attendu: 4 pointages sans anomalie"
    print_info "  - IN 08:00"
    print_info "  - OUT 12:00"
    print_info "  - IN 13:00 (pause implicite reconnue)"
    print_info "  - OUT 17:00"
}

# =============================================================================
# TEST 5: FORMAT ZKTECO PUSH URL
# =============================================================================
test_push_format() {
    print_header "TEST 5: FORMAT ZKTECO PUSH URL"

    print_info "Test du format natif ZKTeco (endpoint /push)"
    echo ""

    local now=$(get_timestamp 0)

    print_subheader "Format BioTime standard"

    print_step "Envoi via Push URL"
    curl -s -X POST "$API_URL/attendance/push" \
        -H "Content-Type: application/json" \
        -d "{
            \"SN\": \"$DEVICE_ID\",
            \"pin\": \"$EMP_NORMAL\",
            \"time\": \"$now\",
            \"state\": 1,
            \"verifymode\": 1
        }" | jq . 2>/dev/null || cat

    echo ""

    print_subheader "Format BioTime avec données imbriquées"

    curl -s -X POST "$API_URL/attendance/push" \
        -H "Content-Type: application/json" \
        -d "{
            \"sn\": \"$DEVICE_ID\",
            \"table\": \"attendance\",
            \"data\": {
                \"pin\": \"$EMP_LIMITE\",
                \"time\": \"$now\",
                \"state\": 0,
                \"verifymode\": 4
            }
        }" | jq . 2>/dev/null || cat

    echo ""
    print_info "Les deux formats sont supportés par l'endpoint /push"
}

# =============================================================================
# TEST 6: VÉRIFICATION DE LA CONFIGURATION
# =============================================================================
test_config() {
    print_header "TEST 6: VÉRIFICATION CONFIGURATION"

    print_info "Requête SQL pour vérifier les settings actuels"
    echo ""

    echo "Configuration IN/OUT Détection:"
    PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres -c "
    SELECT
        'Anti-rebond (min)' as setting, \"doublePunchToleranceMinutes\"::text as value
    FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID'
    UNION ALL
    SELECT 'Pauses implicites', \"allowImplicitBreaks\"::text FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID'
    UNION ALL
    SELECT 'Min pause (min)', \"minImplicitBreakMinutes\"::text FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID'
    UNION ALL
    SELECT 'Max pause (min)', \"maxImplicitBreakMinutes\"::text FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID'
    UNION ALL
    SELECT 'Clôture auto', \"autoCloseOrphanSessions\"::text FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID'
    UNION ALL
    SELECT 'Heure clôture', \"autoCloseDefaultTime\"::text FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID'
    UNION ALL
    SELECT 'Buffer overtime (min)', \"autoCloseOvertimeBuffer\"::text FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID'
    UNION ALL
    SELECT 'Check overtime APPROVED', \"autoCloseCheckApprovedOvertime\"::text FROM \"TenantSettings\" WHERE \"tenantId\" = '$TENANT_ID';
    "
}

# =============================================================================
# TEST 7: VÉRIFIER LES POINTAGES CRÉÉS
# =============================================================================
test_verify() {
    print_header "TEST 7: VÉRIFICATION DES POINTAGES"

    print_info "Affiche les derniers pointages créés"
    echo ""

    PGPASSWORD='MAMPAPOLino0102' psql -h aws-1-eu-north-1.pooler.supabase.com -p 6543 -U postgres.apeyodpxnxxwdxwcnqmo -d postgres -c "
    SELECT
        a.\"timestamp\"::timestamp,
        a.type,
        e.matricule,
        e.\"firstName\" || ' ' || e.\"lastName\" as employee,
        a.\"hasAnomaly\",
        a.\"anomalyType\"
    FROM \"Attendance\" a
    JOIN \"Employee\" e ON a.\"employeeId\" = e.id
    WHERE a.\"tenantId\" = '$TENANT_ID'
    AND a.\"createdAt\" > NOW() - INTERVAL '2 hours'
    ORDER BY a.\"timestamp\" DESC
    LIMIT 15;
    "
}

# =============================================================================
# MENU PRINCIPAL
# =============================================================================
show_menu() {
    print_header "SCRIPT DE TEST - TERMINAL BADGES"

    echo ""
    echo "Configuration:"
    echo "  API URL:   $API_URL"
    echo "  Device:    $DEVICE_ID"
    echo "  Tenant:    $TENANT_ID"
    echo ""
    echo "Tests disponibles:"
    echo "  1) debounce   - Test anti-rebond (double badge)"
    echo "  2) pause      - Test pauses implicites"
    echo "  3) orphan     - Test session orpheline"
    echo "  4) fullday    - Test journée complète"
    echo "  5) push       - Test format ZKTeco push"
    echo "  6) config     - Vérifier la configuration"
    echo "  7) verify     - Vérifier les pointages créés"
    echo "  8) all        - Lancer tous les tests"
    echo ""
    echo "Usage: $0 [test_name]"
    echo ""
}

# =============================================================================
# EXÉCUTION
# =============================================================================

# Vérifier que le serveur est accessible
check_server() {
    if ! curl -s --connect-timeout 5 "$API_URL" > /dev/null 2>&1; then
        print_error "Le serveur n'est pas accessible à $API_URL"
        print_info "Démarrez le backend avec: cd /home/assyin/PointaFlex/backend && npm run start:dev"
        exit 1
    fi
    print_success "Serveur accessible à $API_URL"
}

# Main
main() {
    local test_name=${1:-"menu"}

    case $test_name in
        "debounce"|"1")
            check_server
            test_debounce
            ;;
        "pause"|"2")
            check_server
            test_implicit_pause
            ;;
        "orphan"|"3")
            check_server
            test_orphan_session
            ;;
        "fullday"|"4")
            check_server
            test_full_day
            ;;
        "push"|"5")
            check_server
            test_push_format
            ;;
        "config"|"6")
            test_config
            ;;
        "verify"|"7")
            test_verify
            ;;
        "all"|"8")
            check_server
            test_config
            test_debounce
            test_implicit_pause
            test_orphan_session
            test_full_day
            test_push_format
            test_verify
            ;;
        "menu"|*)
            show_menu
            ;;
    esac

    echo ""
    print_header "FIN DES TESTS"
}

main "$@"
