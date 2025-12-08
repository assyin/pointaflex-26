#!/bin/bash

# Script de nettoyage et redémarrage du serveur Next.js
echo "========================================"
echo "  Nettoyage et redémarrage Next.js"
echo "========================================"
echo ""

# Arrêter tous les processus Node.js liés à Next.js
echo "Arrêt des processus Node.js..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Supprimer le cache Next.js
echo "Suppression du cache .next..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "✓ Cache .next supprimé"
else
    echo "✓ Pas de cache à supprimer"
fi

# Supprimer le cache node_modules/.cache si existe
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✓ Cache node_modules supprimé"
fi

echo ""
echo "========================================"
echo "  Démarrage du serveur Next.js"
echo "========================================"
echo ""
echo "Le serveur va démarrer sur http://localhost:3001"
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

# Démarrer le serveur
npm run dev

