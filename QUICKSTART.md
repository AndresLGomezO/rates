# Quick Start Guide

## Prerequisites

1. **Firebase Emulators** must be running
2. **Environment variables** must be configured
3. **Both apps** need matching `VITE_NONCE_SECRET`

## Step-by-Step Setup

### 1. Configure Environment Variables

**Auth App** (`apps/auth-app/.env.local`):

```bash
cd apps/auth-app
cp env.example .env.local
```

Edit `.env.local` and set:

- `VITE_NONCE_SECRET` - Generate a random string (min 16 chars)
  ```bash
  # Generate with:
  openssl rand -hex 32
  ```

**Main App** (`apps/app/.env.local`):

```bash
cd apps/app
cp env.example .env.local
```

Edit `.env.local` and set:

- `VITE_NONCE_SECRET` - **Must match auth-app's secret exactly**
- `VITE_AUTH_APP_URL=http://localhost:5175`

### 2. Start Firebase Emulators

From project root:

```bash
pnpm firebase:emulators
```

Or using Docker:

```bash
pnpm docker:emulators:up
```

Verify emulators are running:

- Emulator UI: http://127.0.0.1:4000
- Auth Emulator: http://127.0.0.1:9099

### 3. Start Auth App

In a new terminal:

```bash
pnpm --filter auth-app dev
```

Auth app will be available at: http://127.0.0.1:5175

### 4. Start Main App

In another terminal:

```bash
pnpm --filter app dev
```

Main app will be available at: http://127.0.0.1:5174

## Testing

1. Visit http://127.0.0.1:5174 (main app)
2. Click "Sign In" → redirects to auth-app
3. Sign up or log in → redirects back with token
4. Visit Dashboard → should be accessible

## Troubleshooting

### Error: `ERR_CONNECTION_RESET` or `ERR_CONNECTION_REFUSED`

**Cause**: Firebase Auth emulator is not running.

**Fix**:

```bash
# Start emulators
pnpm firebase:emulators

# Verify it's running
curl http://127.0.0.1:9099
```

### Error: `VITE_NONCE_SECRET must be set`

**Cause**: Nonce secret missing or too short.

**Fix**:

1. Set `VITE_NONCE_SECRET` in both `.env.local` files
2. Ensure they match exactly
3. Restart both dev servers

### Error: `Invalid nonce signature`

**Cause**: Nonce secrets don't match between apps.

**Fix**: Ensure `VITE_NONCE_SECRET` is identical in:

- `apps/auth-app/.env.local`
- `apps/app/.env.local`

## Startup Order

1. ✅ Start Firebase Emulators (required first)
2. ✅ Start Auth App
3. ✅ Start Main App

## Environment Checklist

- [ ] `apps/auth-app/.env.local` exists with `VITE_NONCE_SECRET`
- [ ] `apps/app/.env.local` exists with `VITE_NONCE_SECRET` (matches auth-app)
- [ ] `apps/app/.env.local` has `VITE_AUTH_APP_URL=http://localhost:5175`
- [ ] Firebase emulators are running on port 9099
- [ ] Both dev servers restarted after env changes
