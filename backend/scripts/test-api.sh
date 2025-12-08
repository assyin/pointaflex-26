#!/bin/bash

# Login et récupération du token
echo "🔐 Connexion à l'API..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin@123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "✅ Token obtenu"
echo ""

# Récupération des employés
echo "👥 Récupération des employés..."
curl -s http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -80
