# Rates Auth App

Standalone authentication UI that signs users in with Firebase Auth, issues an ID token, optionally sets a SameSite cookie, and redirects back to a calling app.

## Quick Start

### Prerequisites

1. **Start Firebase Emulators** (required for local development):

   ```bash
   # From project root
   pnpm firebase:emulators
   # Or using Docker
   pnpm docker:emulators:up
   ```

2. **Set up environment variables**:

   ```bash
   cd apps/auth-app
   cp env.example .env.local
   # Edit .env.local and set your values, especially VITE_NONCE_SECRET
   ```

3. **Start the auth-app**:
   ```bash
   pnpm dev
   ```

The dev server listens on `http://127.0.0.1:5175`.

> **Important**: The Firebase Auth emulator must be running on port 9099 (default) for authentication to work in development mode.

---

## Setup Guide

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

### Troubleshooting

#### Error: `ERR_CONNECTION_RESET` or `net::ERR_CONNECTION_REFUSED`

**Problem**: Firebase Auth emulator is not running.

**Solution**:

1. Start the Firebase emulators (see step 3 above)
2. Verify the emulator is running by visiting `http://127.0.0.1:4000` (Firebase Emulator UI)
3. Check that `VITE_FIREBASE_EMULATOR_AUTH_PORT=9099` matches your emulator config

#### Error: `VITE_NONCE_SECRET must be set`

**Problem**: Nonce secret is missing or too short.

**Solution**:

1. Set `VITE_NONCE_SECRET` in `.env.local` (min 16 characters)
2. Ensure the same secret is set in your main app's `.env.local`
3. Restart the dev server after changing env vars

#### Error: `Invalid nonce signature`

**Problem**: Nonce secret mismatch between apps.

**Solution**:

1. Ensure `VITE_NONCE_SECRET` is identical in both `apps/auth-app/.env.local` and `apps/app/.env.local`
2. Restart both dev servers after changing the secret

### Testing the Setup

1. Visit `http://127.0.0.1:5175` - should see the landing page
2. Visit `http://127.0.0.1:5175/login` - should see login form
3. Try signing up with a test email - should work if emulator is running
4. Check Firebase Emulator UI at `http://127.0.0.1:4000` - should show created users

### Production Setup

For production, you'll need:

- Real Firebase project credentials
- Set `VITE_USE_FIREBASE_EMULATOR=false` or `VITE_FIREBASE_MODE=live`
- Configure `VITE_ALLOWED_REDIRECTS` with your production app URLs
- Use a secure, randomly generated `VITE_NONCE_SECRET`

## Environment

Copy `env.example` to `.env.local` (or `.env`) inside `apps/auth-app` and set:

- `VITE_FIREBASE_*`: Firebase web config.
- `VITE_USE_FIREBASE_EMULATOR=true` and `VITE_FIREBASE_EMULATOR_AUTH_PORT` to use the emulator.
- `VITE_DEFAULT_RETURN_URL`: where to send users when no `redirectTo` is provided.
- `VITE_ALLOWED_REDIRECTS`: comma-separated list of allowed origins for `redirectTo`. Requests outside this list fall back to `VITE_DEFAULT_RETURN_URL`.
- `VITE_ENABLE_AUTH_COOKIE`: `true` (default) to set a SameSite cookie with the ID token.
- `VITE_AUTH_COOKIE_*`: cookie name, max age, domain, and SameSite strategy.
- `VITE_NONCE_SECRET`: **Required** - Shared secret (min 16 chars) for nonce generation/validation. Must match the secret in all consumer apps.
- `VITE_NONCE_MAX_AGE_MS`: Nonce expiration time in milliseconds (default: 300000 = 5 minutes).

> Security note: the cookie is not HttpOnly because this is a client-only app. Prefer a backend to issue HttpOnly cookies after verifying the Firebase ID token when possible.

## Nonce Security

The auth-app uses HMAC-SHA256 signed nonces to ensure only authorized apps can initiate authentication requests. **All requests must include a valid nonce**, or they will be rejected.

### Generating Nonces in Your App

Copy the nonce generation logic from `src/utils/nonce-generator.ts` to your main app, or use it directly:

```typescript
import { buildAuthAppUrl } from './utils/nonce-generator';

// Generate auth URL with nonce
const authUrl = await buildAuthAppUrl(
  'http://localhost:5175',
  window.location.href,
  'login'
);
window.location.href = authUrl;
```

**Important**: Your app must have the same `VITE_NONCE_SECRET` environment variable set as auth-app.

## Usage flow

1. Your app generates a nonce and redirects users to `auth-app` with `?redirectTo=<consumer-url>&nonce=<nonce>`.
2. Auth-app validates the nonce (checks signature, expiration, format).
3. If valid, the user logs in or signs up.
4. `auth-app` obtains a Firebase ID token, optionally sets a cookie, and redirects to `redirectTo` with `token`, `provider=firebase`, `expiresIn`, and `nonce` query params.
5. The consumer validates the token (recommended: send it to your backend to verify and mint its own HttpOnly session).

---

## Firebase Admin SDK Setup

This guide explains how to set up Firebase Admin SDK for server-side token validation.

### Overview

The auth-app uses Firebase Admin SDK to validate ID tokens server-side. This provides:

- **Full token verification**: Signature validation, expiration checking, and revocation status
- **Security**: Server-side validation prevents token forgery
- **Production-ready**: Proper token verification as recommended by Firebase

### Installation

1. Install dependencies:

```bash
cd apps/auth-app
pnpm install
```

This will install:

- `firebase-admin` - Firebase Admin SDK
- `@types/node` - TypeScript types for Node.js

### Configuration

#### For Development (Emulator Mode)

When using Firebase emulators, no additional configuration is needed. The Admin SDK will automatically connect to the emulator.

Ensure your `.env.local` has:

```bash
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_PROJECT_ID=demo-project
```

#### For Production

You need to provide Firebase Admin SDK credentials. Choose one of the following options:

##### Option 1: Service Account JSON File (Recommended for local development)

1. Download your service account key from [Firebase Console](https://console.firebase.google.com/)
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

2. Set the environment variable:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

##### Option 2: Service Account JSON as Environment Variable

1. Get your service account JSON (same as Option 1)

2. Set the environment variable (base64 encoding recommended for complex JSON):

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...",...}'
```

##### Option 3: Application Default Credentials (ADC)

If running in Google Cloud environments (Cloud Run, App Engine, Compute Engine), ADC works automatically. No configuration needed.

### How It Works

1. **Client Request**: The main app sends a token validation request to `/api/validate?token=<id-token>`

2. **Server-Side Validation**: The Vite middleware intercepts the request and:
   - Initializes Firebase Admin SDK (if not already initialized)
   - Calls `admin.auth().verifyIdToken(token)` to verify:
     - Token signature
     - Token expiration
     - Token issuer
     - Token revocation status

3. **Response**: Returns JSON with validation result:
   ```json
   {
     "valid": true,
     "expiresAt": 1234567890000
   }
   ```
   or
   ```json
   {
     "valid": false,
     "error": "Token expired"
   }
   ```

### API Endpoint

#### GET /api/validate

Validates a Firebase ID token using Admin SDK.

**Query Parameters:**

- `token` (required): Firebase ID token to validate

**Response:**

- `200 OK`: Token is valid
  ```json
  {
    "valid": true,
    "expiresAt": 1234567890000
  }
  ```
- `401 Unauthorized`: Token is invalid
  ```json
  {
    "valid": false,
    "error": "Token expired"
  }
  ```
- `400 Bad Request`: Missing token parameter
  ```json
  {
    "valid": false,
    "error": "Token parameter is required"
  }
  ```

### Error Handling

The Admin SDK validation handles various error cases:

- `auth/argument-error`: Invalid token format
- `auth/id-token-expired`: Token has expired
- `auth/id-token-revoked`: Token has been revoked
- `auth/invalid-id-token`: Token is invalid

All errors are returned as JSON responses with appropriate HTTP status codes.

### Testing

1. Start Firebase emulators:

```bash
pnpm firebase:emulators
```

2. Start auth-app:

```bash
cd apps/auth-app
pnpm dev
```

3. Test the endpoint:

```bash
curl "http://127.0.0.1:5175/api/validate?token=YOUR_TOKEN_HERE"
```

### Security Notes

- **Never commit service account keys** to version control
- Use environment variables or secure secret management in production
- The Admin SDK has full access to your Firebase project - protect credentials carefully
- In production, consider using Google Cloud Secret Manager or similar services

### Troubleshooting

#### Error: "Failed to initialize Firebase Admin SDK"

- Check that you have provided credentials (service account key or ADC)
- Verify the service account has the necessary permissions
- For emulator mode, ensure emulators are running

#### Error: "Token validation failed"

- Verify the token is a valid Firebase ID token
- Check that the token hasn't expired
- Ensure the token was issued for the correct Firebase project

#### Error: "Cannot find module 'firebase-admin'"

- Run `pnpm install` to install dependencies
- Ensure `firebase-admin` is in `package.json` dependencies

---

## Routes

- `/` landing/overview
- `/login`
- `/signup`
- `/session` to reuse an existing session and trigger redirect
