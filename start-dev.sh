#!/bin/bash

# Errandify Development Server Startup Script

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

echo "🚀 Starting Errandify Development Servers..."
echo ""

# Create a temp directory for logs
mkdir -p ./logs

# Start backend (port 3000)
echo "📦 Starting Backend (port 3000)..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
echo "   Logs: cat logs/backend.log"
echo ""

# Wait a moment for backend to start
sleep 2

# Start frontend (port 5173)
echo "⚡ Starting Frontend (port 5173)..."
cd ../frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo "   Logs: cat logs/frontend.log"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✨ Errandify is running!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Frontend:  http://localhost:5173"
echo "🔌 Backend:   http://localhost:3000"
echo "📊 Database:  postgresql://localhost/errandify"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "⛔ To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to see this message again"
echo "═══════════════════════════════════════════════════════════"

# Keep script running
wait
