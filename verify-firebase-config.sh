#!/bin/bash
# Script to verify Firebase configuration consistency

set -e

echo "🔍 Verifying Firebase Configuration..."
echo ""

ERRORS=0

# Check firebase.json ports
echo "📋 Checking firebase.json..."
AUTH_PORT=$(grep '"auth"' -A 2 firebase/firebase.json | grep '"port"' | grep -o '[0-9]*' | head -1)
FIRESTORE_PORT=$(grep '"firestore"' -A 2 firebase/firebase.json | grep '"port"' | grep -o '[0-9]*' | head -1)
STORAGE_PORT=$(grep '"storage"' -A 2 firebase/firebase.json | grep '"port"' | grep -o '[0-9]*' | head -1)
UI_PORT=$(grep '"ui"' -A 3 firebase/firebase.json | grep '"port"' | grep -o '[0-9]*' | head -1)

echo "  Auth: $AUTH_PORT"
echo "  Firestore: $FIRESTORE_PORT"
echo "  Storage: $STORAGE_PORT"
echo "  UI: $UI_PORT"
echo ""

# Check docker-compose.yml ports
echo "🐳 Checking docker-compose.yml..."
DOCKER_AUTH=$(grep -A 1 '# Auth Emulator' docker/docker-compose.yml | grep -o '[0-9]*:[0-9]*' | cut -d: -f1)
DOCKER_FIRESTORE=$(grep -A 1 '# Firestore Emulator' docker/docker-compose.yml | grep -o '[0-9]*:[0-9]*' | cut -d: -f1)
DOCKER_STORAGE=$(grep -A 1 '# Storage Emulator' docker/docker-compose.yml | grep -o '[0-9]*:[0-9]*' | cut -d: -f1)
DOCKER_UI=$(grep -A 1 '# Firebase Emulator UI' docker/docker-compose.yml | grep -o '[0-9]*:[0-9]*' | cut -d: -f1)

echo "  Auth: $DOCKER_AUTH"
echo "  Firestore: $DOCKER_FIRESTORE"
echo "  Storage: $DOCKER_STORAGE"
echo "  UI: $DOCKER_UI"
echo ""

# Verify ports match
if [ "$AUTH_PORT" != "$DOCKER_AUTH" ]; then
  echo "❌ ERROR: Auth port mismatch! firebase.json=$AUTH_PORT, docker-compose.yml=$DOCKER_AUTH"
  ERRORS=$((ERRORS + 1))
fi

if [ "$FIRESTORE_PORT" != "$DOCKER_FIRESTORE" ]; then
  echo "❌ ERROR: Firestore port mismatch! firebase.json=$FIRESTORE_PORT, docker-compose.yml=$DOCKER_FIRESTORE"
  ERRORS=$((ERRORS + 1))
fi

if [ "$STORAGE_PORT" != "$DOCKER_STORAGE" ]; then
  echo "❌ ERROR: Storage port mismatch! firebase.json=$STORAGE_PORT, docker-compose.yml=$DOCKER_STORAGE"
  ERRORS=$((ERRORS + 1))
fi

if [ "$UI_PORT" != "$DOCKER_UI" ]; then
  echo "❌ ERROR: UI port mismatch! firebase.json=$UI_PORT, docker-compose.yml=$DOCKER_UI"
  ERRORS=$((ERRORS + 1))
fi

# Check project IDs
echo "🆔 Checking Project IDs..."
DOCKER_PROJECT=$(grep 'FIREBASE_PROJECT_ID' docker/docker-compose.yml | grep -o 'demo-[^}]*' | head -1)
AUTH_PROJECT=$(grep 'VITE_FIREBASE_PROJECT_ID' apps/auth-app/env.example | cut -d= -f2)
ROOT_PROJECT=$(grep 'VITE_FIREBASE_PROJECT_ID' env.example | cut -d= -f2)

echo "  Docker: $DOCKER_PROJECT"
echo "  Auth App: $AUTH_PROJECT"
echo "  Root: $ROOT_PROJECT"
echo ""

if [ "$DOCKER_PROJECT" != "$AUTH_PROJECT" ] || [ "$DOCKER_PROJECT" != "$ROOT_PROJECT" ]; then
  echo "❌ ERROR: Project ID mismatch!"
  echo "   Docker: $DOCKER_PROJECT"
  echo "   Auth App: $AUTH_PROJECT"
  echo "   Root: $ROOT_PROJECT"
  ERRORS=$((ERRORS + 1))
fi

# Check emulator host
echo "🌐 Checking Emulator Host..."
AUTH_HOST=$(grep 'VITE_FIREBASE_EMULATOR_HOST' apps/auth-app/env.example | cut -d= -f2)
ROOT_HOST=$(grep 'VITE_FIREBASE_EMULATOR_HOST' env.example | cut -d= -f2)

echo "  Auth App: $AUTH_HOST"
echo "  Root: $ROOT_HOST"
echo ""

if [ "$AUTH_HOST" != "$ROOT_HOST" ]; then
  echo "❌ ERROR: Emulator host mismatch!"
  echo "   Auth App: $AUTH_HOST"
  echo "   Root: $ROOT_HOST"
  ERRORS=$((ERRORS + 1))
fi

# Check app ports
echo "🚀 Checking App Ports..."
AUTH_APP_PORT=$(grep '"port"' apps/auth-app/vite.config.ts | grep -o '[0-9]*')
MAIN_APP_PORT=$(grep '"port"' apps/app/vite.config.ts | grep -o '[0-9]*')
AUTH_RETURN_URL=$(grep 'VITE_DEFAULT_RETURN_URL' apps/auth-app/env.example | cut -d= -f2 | grep -o '[0-9]*')

echo "  Auth App: $AUTH_APP_PORT"
echo "  Main App: $MAIN_APP_PORT"
echo "  Auth Return URL port: $AUTH_RETURN_URL"
echo ""

if [ "$AUTH_RETURN_URL" != "$MAIN_APP_PORT" ]; then
  echo "⚠️  WARNING: Auth app return URL port ($AUTH_RETURN_URL) doesn't match main app port ($MAIN_APP_PORT)"
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo "✅ All Firebase configurations are consistent!"
else
  echo "❌ Found $ERRORS error(s). Please fix the issues above."
  exit 1
fi

