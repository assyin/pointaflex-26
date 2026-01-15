#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE SUPPRESSION DES POINTAGES
# ═══════════════════════════════════════════════════════════════════════════════
# Usage:
#   ./clear-attendance.sh                    # Supprime les pointages d'aujourd'hui
#   ./clear-attendance.sh 2026-01-06         # Supprime les pointages d'une date spécifique
#   ./clear-attendance.sh 2026-01-01 2026-01-07  # Supprime une plage de dates
# ═══════════════════════════════════════════════════════════════════════════════

# Configuration base de données
DB_HOST="aws-1-eu-north-1.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.apeyodpxnxxwdxwcnqmo"
DB_NAME="postgres"
DB_PASSWORD="MAMPAPOLino0102"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "   SUPPRESSION DES POINTAGES - PointaFlex"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Déterminer la date ou plage de dates
if [ -z "$1" ]; then
    # Pas d'argument = aujourd'hui
    DATE=$(date +%Y-%m-%d)
    QUERY="DELETE FROM \"Attendance\" WHERE DATE(timestamp) = '$DATE'"
    echo -e "${YELLOW}Date cible: $DATE (aujourd'hui)${NC}"
elif [ -z "$2" ]; then
    # Un argument = date spécifique
    DATE="$1"
    QUERY="DELETE FROM \"Attendance\" WHERE DATE(timestamp) = '$DATE'"
    echo -e "${YELLOW}Date cible: $DATE${NC}"
else
    # Deux arguments = plage de dates
    START_DATE="$1"
    END_DATE="$2"
    QUERY="DELETE FROM \"Attendance\" WHERE DATE(timestamp) >= '$START_DATE' AND DATE(timestamp) <= '$END_DATE'"
    echo -e "${YELLOW}Plage de dates: $START_DATE à $END_DATE${NC}"
fi

echo ""

# Compter les pointages avant suppression
echo "Comptage des pointages..."
COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM \"Attendance\" WHERE $(echo "$QUERY" | sed 's/DELETE FROM \"Attendance\" WHERE//')
")
COUNT=$(echo "$COUNT" | tr -d ' ')

if [ "$COUNT" -eq 0 ]; then
    echo -e "${GREEN}Aucun pointage à supprimer.${NC}"
    echo ""
    exit 0
fi

echo -e "Pointages trouvés: ${RED}$COUNT${NC}"
echo ""

# Demander confirmation
read -p "Voulez-vous supprimer ces $COUNT pointage(s)? (o/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Oo]$ ]]; then
    # Exécuter la suppression
    RESULT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$QUERY" 2>&1)

    if [[ $RESULT == *"DELETE"* ]]; then
        DELETED=$(echo "$RESULT" | grep -oP 'DELETE \K[0-9]+')
        echo ""
        echo -e "${GREEN}✅ $DELETED pointage(s) supprimé(s) avec succès!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Erreur lors de la suppression: $RESULT${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}Opération annulée.${NC}"
fi

echo ""
