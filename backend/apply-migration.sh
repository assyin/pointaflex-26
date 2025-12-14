#!/bin/bash

# Script pour appliquer la migration Prisma pour SiteManager

echo "🔍 Vérification du schéma Prisma..."
npx prisma format

echo ""
echo "📦 Application de la migration..."
npx prisma db push --accept-data-loss

echo ""
echo "🔄 Régénération du client Prisma..."
npx prisma generate

echo ""
echo "✅ Migration terminée !"
echo ""
echo "📝 Prochaines étapes :"
echo "   1. Redémarrer le serveur backend"
echo "   2. Tester la génération de données avec la nouvelle structure"
