# Auth App Setup Guide

## Quick Start

### 1. Environment Setup

Copy the example environment file:

```bash
cd apps/auth-app
cp env.example .env.local
```

### 2. Required Environment Variables

Edit `.env.local` and set these **required** values:

```bash
# Firebase Configuration (can use demo values for emulator)
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_APP_ID=demo-app-id

# Emulator Configuration
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099

# Redirect Configuration
VITE_DEFAULT_RETURN_URL=http://localhost:5174
VITE_ALLOWED_REDIRECTS=http://localhost:5174,http://localhost:5173

# Nonce Secret (REQUIRED - must match your main app)
VITE_NONCE_SECRET=your-secret-key-minimum-16-chars-long
```

**Important**: Generate a strong random string for `VITE_NONCE_SECRET` (at least 16 characters). This same secret must be set in your main app's `.env.local` file.

### 3. Start Firebase Emulators

**Option A: Using Firebase CLI** (from project root):

```bash
pnpm firebase:emulators
```

**Option B: Using Docker** (from project root):

```bash
pnpm docker:emulators:up
```

The Auth emulator will run on `http://127.0.0.1:9099`.

### 4. Start Auth App

```bash
cd apps/auth-app
pnpm dev
```

The auth-app will be available at `http://127.0.0.1:5175`.

## Troubleshooting

### Error: `ERR_CONNECTION_RESET` or `net::ERR_CONNECTION_REFUSED`

**Problem**: Firebase Auth emulator is not running.

**Solution**:

1. Start the Firebase emulators (see step 3 above)
2. Verify the emulator is running by visiting `http://127.0.0.1:4000` (Firebase Emulator UI)
3. Check that `VITE_FIREBASE_EMULATOR_AUTH_PORT=9099` matches your emulator config

### Error: `VITE_NONCE_SECRET must be set`

**Problem**: Nonce secret is missing or too short.

**Solution**:

1. Set `VITE_NONCE_SECRET` in `.env.local` (min 16 characters)
2. Ensure the same secret is set in your main app's `.env.local`
3. Restart the dev server after changing env vars

### Error: `Invalid nonce signature`

**Problem**: Nonce secret mismatch between apps.

**Solution**:

1. Ensure `VITE_NONCE_SECRET` is identical in both `apps/auth-app/.env.local` and `apps/app/.env.local`
2. Restart both dev servers after changing the secret

## Testing the Setup

1. Visit `http://127.0.0.1:5175` - should see the landing page
2. Visit `http://127.0.0.1:5175/login` - should see login form
3. Try signing up with a test email - should work if emulator is running
4. Check Firebase Emulator UI at `http://127.0.0.1:4000` - should show created users

## Production Setup

For production, you'll need:

- Real Firebase project credentials
- Set `VITE_USE_FIREBASE_EMULATOR=false` or `VITE_FIREBASE_MODE=live`
- Configure `VITE_ALLOWED_REDIRECTS` with your production app URLs
- Use a secure, randomly generated `VITE_NONCE_SECRET`
