# Firebase Environment Variables Setup

This guide explains how Firebase environment variables are integrated into the Terraform IaC deployment flow.

## Overview

Your apps (`app` and `auth-app`) are **Vite-built SPAs** that require Firebase Web SDK configuration at **build time**. These values are embedded into the JavaScript bundle during the Docker build process.

## Configuration Flow

### 1. Single Source of Truth: `.iaac.env`

All Firebase configuration comes from your `.iaac.env` file (per environment):

```bash
# Development
FIREBASE_API_KEY_DEV=your-dev-api-key
FIREBASE_AUTH_DOMAIN_DEV=your-dev-project.firebaseapp.com
FIREBASE_PROJECT_ID_DEV=your-dev-project-id
# ... etc

# Staging
FIREBASE_API_KEY_STAGING=your-staging-api-key
# ... etc

# Production
FIREBASE_API_KEY_PROD=your-prod-api-key
# ... etc
```

### 2. Automatic Injection into GitHub Actions

The `generate-workflow-config.sh` script reads your `.iaac.env` and injects Firebase config into `.github/workflows/deploy.yml`:

```bash
cd iaac
./scripts/generate-workflow-config.sh
```

This updates the `env-select` job to output Firebase config per environment.

### 3. Build-Time Injection

During Docker build, GitHub Actions passes Firebase config as build args:

- **App Dockerfile**: Receives `VITE_FIREBASE_*` args
- **Auth-App Dockerfile**: Receives `VITE_FIREBASE_*` args + cookie config

These are embedded into the Vite bundle at build time.

## Required Variables

### Firebase Web SDK Config (Per Environment)

Get these from **Firebase Console** → **Project Settings** → **General** → **Your apps**:

- `FIREBASE_API_KEY_[ENV]` - Web API Key
- `FIREBASE_AUTH_DOMAIN_[ENV]` - Auth Domain (usually `{project-id}.firebaseapp.com`)
- `FIREBASE_PROJECT_ID_[ENV]` - Project ID
- `FIREBASE_STORAGE_BUCKET_[ENV]` - Storage Bucket (usually `{project-id}.appspot.com`)
- `FIREBASE_MESSAGING_SENDER_ID_[ENV]` - Messaging Sender ID
- `FIREBASE_APP_ID_[ENV]` - App ID
- `FIREBASE_MEASUREMENT_ID_[ENV]` - Analytics Measurement ID (optional)

### Nonce Secret (Shared)

- `NONCE_SECRET` - Shared secret between app and auth-app (min 16 chars)
  - Generate with: `openssl rand -hex 32`
  - **Must be set as GitHub Environment Secret** (see below)

### Cookie Config (Optional, Auth-App Only)

- `AUTH_COOKIE_ENABLE` - Enable auth cookie (default: `true`)
- `AUTH_COOKIE_NAME` - Cookie name (default: `auth_app_token`)
- `AUTH_COOKIE_MAX_AGE` - Max age in seconds (default: `3600`)
- `AUTH_COOKIE_DOMAIN` - Cookie domain (default: empty)
- `AUTH_COOKIE_SAMESITE` - SameSite policy (default: `Lax`)

## Setup Steps

### Step 1: Fill Firebase Config in `.iaac.env`

1. Copy `.iaac.env.example` to `.iaac.env` (if not done)
2. Get Firebase config from Firebase Console for each environment
3. Fill in all `FIREBASE_*_[ENV]` variables

### Step 2: Set NONCE_SECRET in GitHub

**Important**: `NONCE_SECRET` is sensitive and must be set as a **GitHub Environment Secret** (not in the workflow file).

1. Go to your GitHub repository
2. Navigate to **Settings** → **Environments**
3. For each environment (`development`, `staging`, `production`):
   - Click on the environment
   - Go to **Secrets and variables** → **Secrets**
   - Click **New secret**
   - Name: `NONCE_SECRET`
   - Value: The value from your `.iaac.env` file (must match `NONCE_SECRET` there)
   - Click **Add secret**

### Step 3: Generate Workflow Config

After filling `.iaac.env`:

```bash
cd iaac
./scripts/generate-workflow-config.sh
```

This will:

- Inject Firebase config into the workflow file
- Update WIF provider names
- Update service account emails

### Step 4: Commit and Deploy

```bash
git add .github/workflows/deploy.yml
git commit -m "Update workflow with Firebase config"
git push
```

## Production Mode Flags

The workflow automatically sets these for production builds:

- `VITE_USE_FIREBASE_EMULATOR=false` - Disables emulator
- `VITE_FIREBASE_MODE=live` - Uses live Firebase (not emulator)

These ensure your deployed apps connect to **real Firebase**, not emulators.

## Verification

After deployment, verify Firebase config is embedded:

1. Visit your deployed Cloud Run service URL
2. Open browser DevTools → Network tab
3. Look for Firebase initialization requests
4. Check that `authDomain` matches your Firebase project

## Troubleshooting

### "Firebase not initialized" errors

- Check Firebase config values in `.iaac.env` are correct
- Verify `generate-workflow-config.sh` ran successfully
- Check GitHub Actions logs for build args

### "NONCE_SECRET not set" errors

- Verify `NONCE_SECRET` is set in GitHub Environment secrets
- Ensure it matches the value in `.iaac.env`
- Check the environment name matches (`development`/`staging`/`production`)

### Apps connecting to emulator instead of live Firebase

- Verify `VITE_USE_FIREBASE_EMULATOR=false` in build args
- Check `VITE_FIREBASE_MODE=live` is set
- Rebuild and redeploy

## Security Notes

✅ **Firebase Web SDK config is public** - Safe to commit in workflow file  
✅ **NONCE_SECRET is sensitive** - Must be in GitHub Secrets (not workflow file)  
✅ **Build-time embedding** - Values are compiled into JS bundle (not runtime env vars)

## Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Web SDK Docs](https://firebase.google.com/docs/web/setup)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
