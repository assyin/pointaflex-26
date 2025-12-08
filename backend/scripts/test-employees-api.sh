#!/bin/bash

echo "🔐 Connexion à l'API..."
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin@123"}' > /tmp/login.json

TOKEN=$(cat /tmp/login.json | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "✅ Token obtenu"
echo ""

echo "👥 Test API Employees..."
curl -s http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -80
