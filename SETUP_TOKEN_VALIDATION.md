# Quick Setup: Token Validation with Firebase Admin SDK

This is a quick reference guide for setting up server-side token validation.

## Prerequisites

- Firebase project configured
- Firebase emulators (for development) or production Firebase project
- Both `auth-app` and `app` services in the monorepo

## Setup Steps

### 1. Install Dependencies

```bash
cd apps/auth-app
pnpm install
```

This installs `firebase-admin` and `@types/node` required for server-side validation.

### 2. Configure Auth-App (Server-Side Validation)

Edit `apps/auth-app/.env.local`:

#### Development (Emulator) - Easiest Option ✅

```bash
# Already configured if using emulators
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_PROJECT_ID=demo-project
```

**No additional setup needed for emulator mode!**

#### Production - Choose One Option

**Option A: Service Account File** (Recommended)

```bash
# Download service account key from Firebase Console:
# Project Settings → Service Accounts → Generate New Private Key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Option B: Service Account JSON String**

```bash
# Paste the entire service account JSON (base64 encode if needed)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**Option C: Application Default Credentials**

```bash
# No config needed if running in Google Cloud (Cloud Run, App Engine, etc.)
# ADC works automatically
```

### 3. Configure Main App

Edit `apps/app/.env.local`:

```bash
# Point to your auth-app URL
VITE_AUTH_APP_URL=http://localhost:5175

# For production:
# VITE_AUTH_APP_URL=https://auth.yourdomain.com
```

### 4. Start Services

```bash
# Terminal 1: Start Firebase Emulators (development)
pnpm firebase:emulators

# Terminal 2: Start Auth-App
pnpm --filter auth-app dev

# Terminal 3: Start Main App
pnpm --filter app dev
```

### 5. Verify It Works

1. Open main app: `http://localhost:5174`
2. Log in through auth-app
3. Check browser console - should see successful validation
4. Check auth-app terminal - should see validation requests

**Test endpoint directly:**

```bash
# Replace YOUR_TOKEN with an actual Firebase ID token
curl "http://localhost:5175/api/validate?token=YOUR_TOKEN"
```

Expected response:

```json
{ "valid": true, "expiresAt": 1234567890000 }
```

## Troubleshooting

| Error                            | Solution                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| "service unavailable"            | Check auth-app is running on port 5175                      |
| "Failed to initialize Admin SDK" | Verify emulator is running OR service account is configured |
| "Invalid response format"        | Check Vite plugin is loaded in `vite.config.ts`             |
| CORS errors                      | Should be handled automatically, check middleware           |

## What Changed?

- ✅ Token validation now uses **Firebase Admin SDK** server-side
- ✅ Full signature verification and revocation checking
- ✅ Production-ready secure validation
- ✅ Main app calls `/api/validate` endpoint (already configured)

## Next Steps

- See `apps/app/TOKEN_VALIDATION_SETUP.md` for detailed documentation
- See `apps/auth-app/FIREBASE_ADMIN_SETUP.md` for Admin SDK setup details
