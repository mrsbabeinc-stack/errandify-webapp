#!/bin/bash

# Errandify Stable Production Deployment Script
# This ensures the app stays running and auto-restarts on crashes

set -e

echo "🚀 Starting Errandify in STABLE MODE"
echo "===================================="
echo ""
echo "This will:"
echo "  ✓ Stop any existing instances"
echo "  ✓ Start backend & frontend with auto-restart"
echo "  ✓ Monitor and log all activity"
echo "  ✓ Keep running even if processes crash"
echo ""

# Kill any existing PM2 processes
pm2 delete all 2>/dev/null || true
sleep 1

# Start services with PM2
echo "Starting services..."
pm2 start ecosystem.config.js

echo ""
echo "✅ Services started!"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000"
echo ""
echo "Monitor status:"
echo "  pm2 status"
echo ""
echo "View logs:"
echo "  pm2 logs errandify-backend"
echo "  pm2 logs errandify-frontend"
echo ""
echo "Stop services:"
echo "  pm2 stop all"
echo ""
echo "Restart services:"
echo "  pm2 restart all"
echo ""

# Show initial status
pm2 status
