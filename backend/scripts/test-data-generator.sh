#!/bin/bash

# Login and get token
echo "🔐 Connexion à l'API..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin@123"}')

TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "✅ Token obtenu"
echo ""

# Test data-generator stats
echo "📊 Test data-generator stats..."
curl -s -X GET "http://localhost:3000/api/v1/data-generator/stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
