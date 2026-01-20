#!/bin/bash
# Script pour basculer entre environnements DEV et PROD

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

case "$1" in
  dev|DEV|development)
    echo "🔄 Basculement vers DEVELOPPEMENT..."
    cp "$BACKEND_DIR/.env.development" "$BACKEND_DIR/.env"
    echo "✅ Environnement DEV activé"
    echo "   Host: aws-1-eu-north-1.pooler.supabase.com"
    ;;
  prod|PROD|production)
    echo "🔄 Basculement vers PRODUCTION..."
    cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
    echo "✅ Environnement PROD activé"
    echo "   Host: aws-1-eu-west-1.pooler.supabase.com"
    ;;
  status|current)
    echo "📊 Environnement actuel:"
    grep "DATABASE_URL" "$BACKEND_DIR/.env" | head -1
    ;;
  *)
    echo "Usage: $0 {dev|prod|status}"
    echo ""
    echo "  dev    - Basculer vers l'environnement de développement"
    echo "  prod   - Basculer vers l'environnement de production"
    echo "  status - Afficher l'environnement actuel"
    exit 1
    ;;
esac
