#!/bin/bash
# Quick fix script for Firebase Emulator UI errors

set -e

echo "🔧 Fixing Firebase Emulator UI Configuration..."
echo ""

# Step 1: Ensure .env.docker exists
if [ ! -f .env.docker ]; then
  echo "📝 Creating .env.docker..."
  ./setup-env-docker.sh
else
  echo "✅ .env.docker exists"
fi

# Step 2: Verify project ID
CURRENT_PROJECT=$(grep FIREBASE_PROJECT_ID .env.docker | cut -d= -f2 || echo "")
if [ "$CURRENT_PROJECT" != "demo-project" ]; then
  echo "⚠️  Project ID is '$CURRENT_PROJECT', updating to 'demo-project'..."
  sed -i '' 's/FIREBASE_PROJECT_ID=.*/FIREBASE_PROJECT_ID=demo-project/' .env.docker
  echo "✅ Updated project ID to demo-project"
else
  echo "✅ Project ID is correct: demo-project"
fi

# Step 3: Check if container is running
if docker ps | grep -q rates-firebase-emulators; then
  echo ""
  echo "🔄 Restarting Docker container to apply changes..."
  docker-compose -f docker/docker-compose.yml restart
  echo "✅ Container restarted"
else
  echo ""
  echo "🚀 Starting Docker container..."
  pnpm docker:emulators:up
fi

echo ""
echo "⏳ Waiting for emulators to fully start (15 seconds)..."
sleep 15

echo ""
echo "🔍 Checking emulator status..."
./docker/check-emulators.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Fix complete!"
echo ""
echo "📊 Next steps:"
echo "  1. Open Emulator UI: http://127.0.0.1:4000"
echo "  2. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)"
echo "  3. If errors persist, check logs: docker logs rates-firebase-emulators"
echo ""






