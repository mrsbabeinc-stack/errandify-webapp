#!/bin/bash

# Simple, Reliable Startup Script for Errandify Demo
# No PM2 required - just background processes

set -e

REPO="/Users/celestia/Claude code/260616 Errandify WebApp"
cd "$REPO"

echo "🚀 Starting Errandify - STABLE DEMO MODE"
echo "========================================"
echo ""

# Kill any existing processes
echo "Cleaning up old processes..."
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

echo "Starting services..."
echo ""

# Start Backend
cd "$REPO/backend"
npm run dev > /tmp/backend_final.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
echo "   Logs: tail -f /tmp/backend_final.log"

# Give backend time to initialize
sleep 8

# Start Frontend
cd "$REPO/frontend"
npm run dev > /tmp/frontend_final.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo "   Logs: tail -f /tmp/frontend_final.log"

cd "$REPO"

# Wait for services to be ready
sleep 5

echo ""
echo "🎯 SERVICES READY FOR DEMO!"
echo ""
echo "Access:"
echo "  🌐 Frontend: http://localhost:5173"
echo "  🔌 Backend:  http://localhost:3000"
echo ""
echo "Demo Accounts:"
echo "  Doer:  sarah, john"
echo "  Asker: alice, bob"
echo "  Admin: admin"
echo ""
echo "Features Ready:"
echo "  ✓ 4 demo errands"
echo "  ✓ 44 news articles (with July 1-4 fresh content)"
echo "  ✓ MyErrands sorting by deadline"
echo "  ✓ All tabs in MyAccount"
echo ""
echo "Stop services: pkill -f tsx && pkill -f vite"
echo ""
echo "Good luck! 🎉"
