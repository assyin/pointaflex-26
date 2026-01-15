#!/bin/bash
#═══════════════════════════════════════════════════════════════════════════════
# LANCEMENT DE TOUS LES SCRIPTS DE SYNCHRONISATION ZKTECO
#═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════════════════════"
echo "   POINTAFLEX - SYNCHRONISATION MULTI-TERMINAUX"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install node-zklib axios
fi

# Afficher la configuration
echo "📍 Terminaux configurés:"
echo "   • CIT: 192.168.16.175 (EJB8241100244)"
echo "   • CP:  192.168.16.174 (EJB8241100241)"
echo ""
echo "🔗 API PointaFlex: http://172.17.112.163:3000/api/v1"
echo ""
echo "───────────────────────────────────────────────────────────────────"
echo ""

# Lancer chaque script en arrière-plan
echo "🚀 Démarrage des synchronisations..."
echo ""

# Sync CIT
node sync-cit.js &
PID_CIT=$!
echo "✅ Sync CIT démarré (PID: $PID_CIT)"

# Attendre un peu pour éviter les conflits de connexion
sleep 2

# Sync CP
node sync-cp.js &
PID_CP=$!
echo "✅ Sync CP démarré (PID: $PID_CP)"

echo ""
echo "───────────────────────────────────────────────────────────────────"
echo "📋 Scripts actifs. Appuyez sur Ctrl+C pour arrêter tous les scripts."
echo ""

# Fonction pour arrêter proprement tous les processus
cleanup() {
    echo ""
    echo "🛑 Arrêt de tous les scripts..."
    kill $PID_CIT 2>/dev/null
    kill $PID_CP 2>/dev/null
    echo "✅ Tous les scripts ont été arrêtés."
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT SIGTERM

# Attendre que tous les processus terminent
wait
