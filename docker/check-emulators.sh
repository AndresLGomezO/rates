#!/bin/bash
# Script to check if Firebase emulators are running and accessible

set -e

echo "🔍 Checking Firebase Emulator Status..."
echo ""

# Check if Docker container is running
echo "📦 Docker Container:"
if docker ps | grep -q rates-firebase-emulators; then
  echo "  ✅ Container is running"
  CONTAINER_ID=$(docker ps | grep rates-firebase-emulators | awk '{print $1}')
  echo "  Container ID: $CONTAINER_ID"
else
  echo "  ❌ Container is NOT running"
  echo "  Run: pnpm docker:emulators:up"
  exit 1
fi

echo ""

# Check project ID
echo "🆔 Project Configuration:"
DOCKER_PROJECT=$(docker exec rates-firebase-emulators printenv FIREBASE_PROJECT_ID 2>/dev/null || echo "not set")
echo "  Docker FIREBASE_PROJECT_ID: $DOCKER_PROJECT"

echo ""

# Check if ports are accessible
echo "🔌 Port Accessibility:"

check_port() {
  local port=$1
  local name=$2
  if curl -s --connect-timeout 2 "http://127.0.0.1:$port" > /dev/null 2>&1; then
    echo "  ✅ $name (port $port) - Accessible"
    return 0
  else
    echo "  ❌ $name (port $port) - Not accessible"
    return 1
  fi
}

check_port 4000 "Emulator UI"
check_port 9099 "Auth Emulator"
check_port 8080 "Firestore Emulator"
check_port 9199 "Storage Emulator"
check_port 5001 "Functions Emulator"

echo ""

# Check emulator logs for errors
echo "📋 Recent Container Logs (last 20 lines):"
docker logs --tail 20 rates-firebase-emulators 2>&1 | tail -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Troubleshooting:"
echo ""
echo "If ports are not accessible:"
echo "  1. Check Docker logs: docker logs rates-firebase-emulators"
echo "  2. Restart container: docker restart rates-firebase-emulators"
echo "  3. Rebuild if needed: pnpm docker:emulators:build"
echo ""
echo "If project ID is wrong:"
echo "  1. Check .env.docker: cat .env.docker"
echo "  2. Update project ID: ./fix-project-id.sh demo-project"
echo "  3. Restart container: docker restart rates-firebase-emulators"
echo ""
echo "Access Emulator UI: http://127.0.0.1:4000"

