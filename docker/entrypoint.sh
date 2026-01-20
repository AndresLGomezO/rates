#!/bin/sh
set -e

# Default project ID (using demo- prefix to avoid production API calls)
PROJECT_ID=${FIREBASE_PROJECT_ID:-demo-default}

# Change to app directory where firebase.json is located
cd /app

# Start Firebase emulators with the specified project
# firebase.json is in the current directory (/app)
exec firebase emulators:start \
  --project "$PROJECT_ID"

