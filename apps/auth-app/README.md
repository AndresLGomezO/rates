# Rates Auth App

Standalone authentication UI that signs users in with Firebase Auth, issues an ID token, optionally sets a SameSite cookie, and redirects back to a calling app.

## Running locally

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

## Routes

- `/` landing/overview
- `/login`
- `/signup`
- `/session` to reuse an existing session and trigger redirect
