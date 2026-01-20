#!/bin/bash
#═══════════════════════════════════════════════════════════════════════════════
# DÉSINSTALLATION DES SERVICES SYSTEMD - POINTAFLEX SYNC
#═══════════════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "   DÉSINSTALLATION DES SERVICES POINTAFLEX SYNC"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    echo ""
    echo "Exécutez: sudo $0"
    exit 1
fi

echo "🛑 Arrêt des services..."

# Arrêter les services
systemctl stop pointaflex-sync-cit.service 2>/dev/null || true
systemctl stop pointaflex-sync-cp.service 2>/dev/null || true
echo "✅ Services arrêtés"

# Désactiver les services
systemctl disable pointaflex-sync-cit.service 2>/dev/null || true
systemctl disable pointaflex-sync-cp.service 2>/dev/null || true
echo "✅ Services désactivés"

# Supprimer les fichiers de service
rm -f /etc/systemd/system/pointaflex-sync-cit.service
rm -f /etc/systemd/system/pointaflex-sync-cp.service
echo "✅ Fichiers de service supprimés"

# Recharger systemd
systemctl daemon-reload
echo "✅ Systemd rechargé"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "   DÉSINSTALLATION TERMINÉE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Les scripts de synchronisation ne démarreront plus automatiquement."
echo "Vous pouvez toujours les lancer manuellement avec:"
echo ""
echo "   node sync-cit.js"
echo "   node sync-cp.js"
echo ""
