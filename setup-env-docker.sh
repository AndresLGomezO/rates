#!/bin/bash
# Script to create .env.docker from example if it doesn't exist

set -e

ENV_DOCKER=".env.docker"
ENV_DOCKER_EXAMPLE="docker/env.docker.example"

if [ ! -f "$ENV_DOCKER" ]; then
  echo "📝 Creating $ENV_DOCKER from $ENV_DOCKER_EXAMPLE..."
  cp "$ENV_DOCKER_EXAMPLE" "$ENV_DOCKER"
  echo "✅ Created $ENV_DOCKER"
  echo ""
  echo "⚠️  Please review and update $ENV_DOCKER if needed"
  echo "   (especially FIREBASE_PROJECT_ID)"
else
  echo "✅ $ENV_DOCKER already exists"
fi






