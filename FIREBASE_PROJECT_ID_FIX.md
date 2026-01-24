# Firebase Project ID Configuration Fix

## Problem

The error `GET http://127.0.0.1:9099/emulator/v1/projects/your-project-id/config net::ERR_CONNECTION_RESET` occurs because:

1. The project ID is set to placeholder `your-project-id` instead of a real value
2. The Docker container and your apps must use the **same project ID**

## Solution

### Step 1: Set Project ID in Docker

Create `.env.docker` in project root (or set environment variable):

```bash
# In project root
echo "FIREBASE_PROJECT_ID=demo-project" > .env.docker
```

Or set it when starting Docker:

```bash
FIREBASE_PROJECT_ID=demo-project docker-compose -f docker/docker-compose.yml up -d
```

### Step 2: Set Project ID in Your Apps

**Auth App** (`apps/auth-app/.env.local`):

```bash
VITE_FIREBASE_PROJECT_ID=demo-project
```

**Main App** (`apps/app/.env.local`):

```bash
VITE_FIREBASE_PROJECT_ID=demo-project
```

**Important**: The project ID must match in:

- Docker container (`FIREBASE_PROJECT_ID`)
- Auth app (`VITE_FIREBASE_PROJECT_ID`)
- Main app (`VITE_FIREBASE_PROJECT_ID`)

### Step 3: Restart Everything

```bash
# Stop Docker
docker-compose -f docker/docker-compose.yml down

# Start Docker with correct project ID
FIREBASE_PROJECT_ID=demo-project docker-compose -f docker/docker-compose.yml up -d

# Restart your apps (they'll pick up the new env vars)
```

## Quick Fix Script

Run this to set everything correctly:

```bash
# Set project ID
export PROJECT_ID="demo-project"

# Update Docker
echo "FIREBASE_PROJECT_ID=$PROJECT_ID" > .env.docker

# Restart Docker
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml up -d

# Update app env files (if they exist)
if [ -f apps/auth-app/.env.local ]; then
  sed -i '' "s/VITE_FIREBASE_PROJECT_ID=.*/VITE_FIREBASE_PROJECT_ID=$PROJECT_ID/" apps/auth-app/.env.local
fi

if [ -f apps/app/.env.local ]; then
  sed -i '' "s/VITE_FIREBASE_PROJECT_ID=.*/VITE_FIREBASE_PROJECT_ID=$PROJECT_ID/" apps/app/.env.local
fi

echo "✅ Project ID set to $PROJECT_ID"
echo "🔄 Restart your apps to pick up the changes"
```

## Verify

1. Check Docker is using correct project ID:

   ```bash
   docker exec rates-firebase-emulators printenv FIREBASE_PROJECT_ID
   ```

   Should output: `demo-project`

2. Check Emulator UI: http://localhost:4000
   - Should show project `demo-project` (or whatever you set)
   - Should not show `your-project-id`

3. Check your app logs - should not have connection errors

## Common Project IDs

- `demo-project` - Good for development
- `default` - Firebase emulator default
- `demo-default` - Another safe option

All of these work with Firebase emulators. Just make sure they match everywhere!
