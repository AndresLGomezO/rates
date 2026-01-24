#!/bin/bash
# Script to completely remove and recreate Firebase Emulator Docker resources

set -e

echo "🧹 Cleaning up Docker Firebase Emulator resources..."

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.yml"

cd "$PROJECT_DIR"

# Step 1: Stop and remove containers, volumes, and networks
echo "📦 Stopping and removing containers, volumes, and networks..."
docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true

# Step 2: Remove any orphaned containers
echo "🗑️  Removing orphaned containers..."
docker ps -a --filter "name=rates-firebase-emulators" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true

# Step 3: Remove Docker images
echo "🖼️  Removing Docker images..."
docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(rates|firebase-emulator|docker-firebase-emulators)" | xargs -r docker rmi -f 2>/dev/null || true

# Step 4: Remove volumes
echo "💾 Removing volumes..."
docker volume ls --format "{{.Name}}" | grep -E "(rates|firebase|docker)" | xargs -r docker volume rm 2>/dev/null || true

# Step 5: Remove networks
echo "🌐 Removing networks..."
docker network ls --format "{{.Name}}" | grep -E "(rates|docker)" | xargs -r docker network rm 2>/dev/null || true

# Step 6: Prune system (optional - removes unused resources)
echo "🧼 Pruning unused Docker resources..."
docker system prune -f --volumes 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "🔨 Rebuilding Docker image..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

echo ""
echo "🚀 Starting emulators..."
docker-compose -f "$COMPOSE_FILE" up -d

echo ""
echo "⏳ Waiting for emulators to start..."
sleep 5

echo ""
echo "📊 Emulator status:"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "✅ Done! Emulators should be running at:"
echo "   - Emulator UI: http://localhost:4000"
echo "   - Auth:         http://localhost:9099"
echo "   - Firestore:    http://localhost:8080"
echo "   - Storage:      http://localhost:9199"
echo "   - Functions:    http://localhost:5001"

