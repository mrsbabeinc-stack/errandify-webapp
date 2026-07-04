#!/bin/bash

# Errandify Staging Deployment Script
# Usage: ./deploy-staging.sh [start|stop|logs|seed]

set -e

COMMAND=${1:-start}
COMPOSE_FILE="docker-compose.staging.yml"

echo "🚀 Errandify Staging Deployment"
echo "================================"
echo ""

case $COMMAND in
  start)
    echo "📦 Starting staging environment..."
    docker-compose -f $COMPOSE_FILE up -d

    echo ""
    echo "⏳ Waiting for services to be ready..."
    sleep 5

    echo "✅ Services started!"
    echo ""
    echo "Access URLs:"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:3000"
    echo "  Database: localhost:5433"
    echo ""
    echo "Next steps:"
    echo "  1. Create test accounts"
    echo "  2. Run: ./deploy-staging.sh seed"
    echo "  3. Visit http://localhost:5173"
    ;;

  stop)
    echo "🛑 Stopping staging environment..."
    docker-compose -f $COMPOSE_FILE down
    echo "✅ Stopped"
    ;;

  logs)
    echo "📋 Showing logs (Ctrl+C to exit)..."
    docker-compose -f $COMPOSE_FILE logs -f
    ;;

  seed)
    echo "🌱 Seeding demo data..."
    docker exec errandify-backend-staging npm run seed:errands
    echo "✅ Demo data seeded!"
    echo ""
    echo "Sample errands created:"
    echo "  - Buy groceries"
    echo "  - Fix laptop"
    echo "  - Walk dog"
    echo "  - Clean house"
    echo "  - ... and more"
    ;;

  status)
    echo "📊 Service status:"
    docker-compose -f $COMPOSE_FILE ps
    ;;

  clean)
    echo "🗑️  Cleaning up all data..."
    docker-compose -f $COMPOSE_FILE down -v
    echo "✅ Cleaned"
    ;;

  build)
    echo "🔨 Building Docker images..."
    docker-compose -f $COMPOSE_FILE build
    echo "✅ Built"
    ;;

  *)
    echo "Usage: ./deploy-staging.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start   - Start staging environment (default)"
    echo "  stop    - Stop all services"
    echo "  logs    - Show service logs"
    echo "  seed    - Seed demo data"
    echo "  status  - Show service status"
    echo "  clean   - Remove all containers and volumes"
    echo "  build   - Rebuild Docker images"
    echo ""
    echo "Examples:"
    echo "  ./deploy-staging.sh start"
    echo "  ./deploy-staging.sh seed"
    echo "  ./deploy-staging.sh logs"
    exit 1
    ;;
esac
