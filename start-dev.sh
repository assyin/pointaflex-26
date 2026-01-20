#!/bin/bash
# =====================================================
# Start DEV Environment (ports 3000/3001)
# =====================================================

echo "🔵 Démarrage environnement DEVELOPPEMENT"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:3001"
echo "   BDD: EU North 1 (DEV)"
echo ""

# Kill any existing processes on DEV ports
fuser -k 3000/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
sleep 2

# Start Backend DEV
echo "📦 Démarrage Backend DEV (port 3000)..."
cd /home/assyin/PointaFlex/backend
npm run start:dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 10

# Start Frontend DEV
echo "🎨 Démarrage Frontend DEV (port 3001)..."
cd /home/assyin/PointaFlex/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Environnement DEV démarré!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "Pour arrêter: kill $BACKEND_PID $FRONTEND_PID"
