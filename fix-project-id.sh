#!/bin/bash
# Quick fix script to set Firebase Project ID consistently across Docker and apps

set -e

PROJECT_ID="${1:-demo-project}"

echo "🔧 Setting Firebase Project ID to: $PROJECT_ID"
echo ""

# Step 1: Create .env.docker for Docker
echo "📝 Creating .env.docker..."
cat > .env.docker << EOF
# Firebase Project ID for Docker emulators
FIREBASE_PROJECT_ID=$PROJECT_ID
EOF
echo "✅ Created .env.docker with FIREBASE_PROJECT_ID=$PROJECT_ID"

# Step 2: Update auth-app .env.local if it exists
if [ -f apps/auth-app/.env.local ]; then
  echo "📝 Updating apps/auth-app/.env.local..."
  if grep -q "VITE_FIREBASE_PROJECT_ID" apps/auth-app/.env.local; then
    sed -i '' "s/VITE_FIREBASE_PROJECT_ID=.*/VITE_FIREBASE_PROJECT_ID=$PROJECT_ID/" apps/auth-app/.env.local
  else
    echo "VITE_FIREBASE_PROJECT_ID=$PROJECT_ID" >> apps/auth-app/.env.local
  fi
  echo "✅ Updated apps/auth-app/.env.local"
else
  echo "⚠️  apps/auth-app/.env.local not found - create it from env.example"
fi

# Step 3: Update app .env.local if it exists
if [ -f apps/app/.env.local ]; then
  echo "📝 Updating apps/app/.env.local..."
  if grep -q "VITE_FIREBASE_PROJECT_ID" apps/app/.env.local; then
    sed -i '' "s/VITE_FIREBASE_PROJECT_ID=.*/VITE_FIREBASE_PROJECT_ID=$PROJECT_ID/" apps/app/.env.local
  else
    echo "VITE_FIREBASE_PROJECT_ID=$PROJECT_ID" >> apps/app/.env.local
  fi
  echo "✅ Updated apps/app/.env.local"
else
  echo "⚠️  apps/app/.env.local not found - create it from env.example"
fi

echo ""
echo "✅ Project ID configuration updated!"
echo ""
echo "🔄 Next steps:"
echo "   1. Restart Docker: docker-compose -f docker/docker-compose.yml restart"
echo "   2. Restart your apps to pick up the new env vars"
echo ""
echo "📊 Verify with:"
echo "   docker exec rates-firebase-emulators printenv FIREBASE_PROJECT_ID"


