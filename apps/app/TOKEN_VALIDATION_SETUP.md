# Token Validation Setup Guide

This guide explains how to set up and configure server-side token validation for the main app.

## Overview

The app now uses **server-side token validation** via Firebase Admin SDK. When a user authenticates, their Firebase ID token is validated by calling the auth-app's `/api/validate` endpoint, which uses Firebase Admin SDK to perform proper token verification.

## How It Works

1. **User Authentication**: User logs in through auth-app and receives a Firebase ID token
2. **Token Storage**: Token is stored in a cookie and passed to the main app
3. **Token Validation**: Main app calls `auth-app/api/validate?token=<id-token>`
4. **Server-Side Verification**: Auth-app uses Firebase Admin SDK to verify:
   - Token signature
   - Token expiration
   - Token revocation status
   - Token issuer
5. **Response**: Returns validation result (valid/invalid, expiration time, errors)

## Setup Steps

### Step 1: Install Dependencies in Auth-App

The auth-app needs Firebase Admin SDK installed:

```bash
cd apps/auth-app
pnpm install
```

This installs:

- `firebase-admin` - Firebase Admin SDK
- `@types/node` - TypeScript types for Node.js

### Step 2: Configure Auth-App Environment

Edit `apps/auth-app/.env.local`:

#### For Development (Emulator Mode)

No additional configuration needed if using Firebase emulators:

```bash
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_PROJECT_ID=demo-project
```

#### For Production

You need to provide Firebase Admin SDK credentials. Choose one option:

**Option 1: Service Account JSON File** (Recommended for local development)

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Option 2: Service Account JSON as Environment Variable**

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...",...}'
```

**Option 3: Application Default Credentials (ADC)**

If running in Google Cloud (Cloud Run, App Engine, etc.), ADC works automatically - no configuration needed.

> **Note**: See `apps/auth-app/FIREBASE_ADMIN_SETUP.md` for detailed instructions on obtaining service account credentials.

### Step 3: Configure Main App Environment

Edit `apps/app/.env.local`:

```bash
# Auth App URL - must point to your auth-app service
VITE_AUTH_APP_URL=http://localhost:5175

# For production, use your production auth-app URL:
# VITE_AUTH_APP_URL=https://auth.yourdomain.com
```

### Step 4: Start Services

1. **Start Firebase Emulators** (for development):

   ```bash
   pnpm firebase:emulators
   ```

2. **Start Auth-App**:

   ```bash
   pnpm --filter auth-app dev
   ```

3. **Start Main App**:
   ```bash
   pnpm --filter app dev
   ```

## Verification

### Test Token Validation

1. Open the main app in your browser
2. Log in through the auth-app
3. Check the browser console - you should see successful token validation
4. Check the auth-app terminal - you should see validation requests logged

### Verify Admin SDK is Working

Test the validation endpoint directly:

```bash
# Get a token from your app (check cookies or localStorage)
TOKEN="your-firebase-id-token"

# Test validation endpoint
curl "http://localhost:5175/api/validate?token=$TOKEN"
```

Expected response for valid token:

```json
{
  "valid": true,
  "expiresAt": 1234567890000
}
```

Expected response for invalid token:

```json
{
  "valid": false,
  "error": "Token expired"
}
```

## Troubleshooting

### Error: "Token validation failed - service unavailable"

**Problem**: The auth-app validation endpoint is not accessible.

**Solutions**:

1. Ensure auth-app is running on the correct port (default: 5175)
2. Check `VITE_AUTH_APP_URL` in main app's `.env.local` matches auth-app URL
3. Verify CORS is configured correctly (should be handled automatically)
4. Check auth-app terminal for errors

### Error: "Failed to initialize Firebase Admin SDK"

**Problem**: Firebase Admin SDK cannot be initialized in auth-app.

**Solutions**:

1. For emulator: Ensure emulators are running and `VITE_USE_FIREBASE_EMULATOR=true`
2. For production: Verify service account credentials are configured correctly
3. Check auth-app logs for specific error messages

### Error: "Invalid response format from validation endpoint"

**Problem**: The validation endpoint is returning non-JSON (likely HTML error page).

**Solutions**:

1. Check that `/api/validate` route is handled by the Vite plugin (not React Router)
2. Verify the Vite plugin is loaded in `vite.config.ts`
3. Check auth-app terminal for middleware errors

### Token Validation Always Fails

**Problem**: Valid tokens are being rejected.

**Solutions**:

1. Verify Firebase Admin SDK is connected to the correct Firebase project
2. For emulator: Ensure Admin SDK is connected to emulator (`FIREBASE_AUTH_EMULATOR_HOST` set)
3. Check token format - should be a valid JWT with 3 parts
4. Verify the token was issued for the correct Firebase project

## Security Notes

- ✅ **Server-side validation**: All tokens are validated server-side using Firebase Admin SDK
- ✅ **Signature verification**: Admin SDK verifies token signatures cryptographically
- ✅ **Revocation checking**: Admin SDK checks if tokens have been revoked
- ✅ **Expiration checking**: Tokens are checked for expiration automatically
- ⚠️ **Never trust client-side validation alone**: Always validate server-side
- ⚠️ **Protect service account keys**: Never commit credentials to version control

## Production Checklist

Before deploying to production:

- [ ] Firebase Admin SDK credentials configured in auth-app
- [ ] `VITE_AUTH_APP_URL` points to production auth-app URL
- [ ] CORS configured correctly (if auth-app and main app are on different domains)
- [ ] Service account has minimal required permissions
- [ ] Service account keys stored securely (use secret management service)
- [ ] Error handling tested for network failures
- [ ] Monitoring/logging set up for validation failures

## API Reference

### Validation Endpoint

**URL**: `GET /api/validate`

**Query Parameters**:

- `token` (required): Firebase ID token to validate

**Response** (200 OK):

```json
{
  "valid": true,
  "expiresAt": 1234567890000
}
```

**Response** (401 Unauthorized):

```json
{
  "valid": false,
  "error": "Token expired"
}
```

**Response** (400 Bad Request):

```json
{
  "valid": false,
  "error": "Token parameter is required"
}
```

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase ID Token Verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Auth-App Admin SDK Setup](./../auth-app/FIREBASE_ADMIN_SETUP.md)
