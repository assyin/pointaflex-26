#!/bin/bash
#═══════════════════════════════════════════════════════════════════════════════
# INSTALLATION DES SERVICES SYSTEMD - POINTAFLEX SYNC
#═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "   INSTALLATION DES SERVICES POINTAFLEX SYNC"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    echo ""
    echo "Exécutez: sudo $0"
    exit 1
fi

# Vérifier que Node.js est installé (via nvm ou système)
NODE_PATH="/home/assyin/.nvm/versions/node/v18.20.8/bin/node"
if [ ! -f "$NODE_PATH" ]; then
    # Essayer le chemin système
    NODE_PATH=$(which node 2>/dev/null || echo "")
    if [ -z "$NODE_PATH" ] || [ ! -f "$NODE_PATH" ]; then
        echo "❌ Node.js n'est pas installé"
        exit 1
    fi
fi
echo "✅ Node.js trouvé: $NODE_PATH"

# Installer les dépendances npm si nécessaire
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    cd "$SCRIPT_DIR"
    sudo -u assyin /home/assyin/.nvm/versions/node/v18.20.8/bin/npm install node-zklib axios
fi

echo ""
echo "📋 Installation des services systemd..."
echo ""

# Copier les fichiers de service
cp "$SCRIPT_DIR/pointaflex-sync-cit.service" /etc/systemd/system/
cp "$SCRIPT_DIR/pointaflex-sync-cp.service" /etc/systemd/system/

echo "✅ Fichiers de service copiés dans /etc/systemd/system/"

# Recharger systemd
systemctl daemon-reload
echo "✅ Systemd rechargé"

# Activer les services au démarrage
systemctl enable pointaflex-sync-cit.service
systemctl enable pointaflex-sync-cp.service
echo "✅ Services activés au démarrage"

# Démarrer les services
systemctl start pointaflex-sync-cit.service
systemctl start pointaflex-sync-cp.service
echo "✅ Services démarrés"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "   INSTALLATION TERMINÉE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "📊 État des services:"
echo ""
systemctl status pointaflex-sync-cit.service --no-pager -l | head -5
echo ""
systemctl status pointaflex-sync-cp.service --no-pager -l | head -5
echo ""
echo "───────────────────────────────────────────────────────────────────"
echo ""
echo "📝 Commandes utiles:"
echo ""
echo "   Voir les logs CIT:    sudo journalctl -u pointaflex-sync-cit -f"
echo "   Voir les logs CP:     sudo journalctl -u pointaflex-sync-cp -f"
echo ""
echo "   Redémarrer CIT:       sudo systemctl restart pointaflex-sync-cit"
echo "   Redémarrer CP:        sudo systemctl restart pointaflex-sync-cp"
echo ""
echo "   Arrêter CIT:          sudo systemctl stop pointaflex-sync-cit"
echo "   Arrêter CP:           sudo systemctl stop pointaflex-sync-cp"
echo ""
echo "   Désactiver CIT:       sudo systemctl disable pointaflex-sync-cit"
echo "   Désactiver CP:        sudo systemctl disable pointaflex-sync-cp"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
