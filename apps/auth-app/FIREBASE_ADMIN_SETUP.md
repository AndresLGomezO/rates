# Firebase Admin SDK Setup

This guide explains how to set up Firebase Admin SDK for server-side token validation in the auth-app.

## Overview

The auth-app now uses Firebase Admin SDK to validate ID tokens server-side. This provides:

- **Full token verification**: Signature validation, expiration checking, and revocation status
- **Security**: Server-side validation prevents token forgery
- **Production-ready**: Proper token verification as recommended by Firebase

## Installation

1. Install dependencies:

```bash
cd apps/auth-app
pnpm install
```

This will install:

- `firebase-admin` - Firebase Admin SDK
- `@types/node` - TypeScript types for Node.js

## Configuration

### For Development (Emulator Mode)

When using Firebase emulators, no additional configuration is needed. The Admin SDK will automatically connect to the emulator.

Ensure your `.env.local` has:

```bash
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_EMULATOR_AUTH_PORT=9099
VITE_FIREBASE_PROJECT_ID=demo-project
```

### For Production

You need to provide Firebase Admin SDK credentials. Choose one of the following options:

#### Option 1: Service Account JSON File (Recommended for local development)

1. Download your service account key from [Firebase Console](https://console.firebase.google.com/)
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

2. Set the environment variable:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### Option 2: Service Account JSON as Environment Variable

1. Get your service account JSON (same as Option 1)

2. Set the environment variable (base64 encoding recommended for complex JSON):

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...",...}'
```

#### Option 3: Application Default Credentials (ADC)

If running in Google Cloud environments (Cloud Run, App Engine, Compute Engine), ADC works automatically. No configuration needed.

## How It Works

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

## API Endpoint

### GET /api/validate

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

## Error Handling

The Admin SDK validation handles various error cases:

- `auth/argument-error`: Invalid token format
- `auth/id-token-expired`: Token has expired
- `auth/id-token-revoked`: Token has been revoked
- `auth/invalid-id-token`: Token is invalid

All errors are returned as JSON responses with appropriate HTTP status codes.

## Testing

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

## Security Notes

- **Never commit service account keys** to version control
- Use environment variables or secure secret management in production
- The Admin SDK has full access to your Firebase project - protect credentials carefully
- In production, consider using Google Cloud Secret Manager or similar services

## Troubleshooting

### Error: "Failed to initialize Firebase Admin SDK"

- Check that you have provided credentials (service account key or ADC)
- Verify the service account has the necessary permissions
- For emulator mode, ensure emulators are running

### Error: "Token validation failed"

- Verify the token is a valid Firebase ID token
- Check that the token hasn't expired
- Ensure the token was issued for the correct Firebase project

### Error: "Cannot find module 'firebase-admin'"

- Run `pnpm install` to install dependencies
- Ensure `firebase-admin` is in `package.json` dependencies
