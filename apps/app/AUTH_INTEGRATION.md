# Auth App Integration Guide

This app is now integrated with the `auth-app` service for centralized authentication.

## Setup

1. **Copy environment variables:**

   ```bash
   cp env.example .env.local
   ```

2. **Set required environment variables:**
   - `VITE_AUTH_APP_URL`: URL of the auth-app (default: `http://localhost:5175`)
   - `VITE_NONCE_SECRET`: Shared secret (must match auth-app's `VITE_NONCE_SECRET`)

3. **Ensure auth-app is running:**
   ```bash
   pnpm --filter auth-app dev
   ```

## How It Works

1. **User visits protected route** → App checks for auth token
2. **No token found** → Redirects to auth-app with nonce
3. **User authenticates** → Auth-app validates nonce and issues token
4. **Redirect back** → App receives token in URL query params
5. **Token stored** → App extracts token and stores it (cookie or memory)
6. **Protected routes accessible** → User can access protected content

## Usage

### Protected Routes

Wrap any route component with `ProtectedRoute`:

```tsx
import { ProtectedRoute } from './components/ProtectedRoute';

<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>;
```

### Using Auth Context

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, token, redirectToAuth, signOut } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => redirectToAuth('login')}>Sign In</button>;
  }

  return (
    <div>
      <p>Authenticated! Token: {token}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Manual Redirect to Auth

```tsx
const { redirectToAuth } = useAuth();

// Redirect to login
await redirectToAuth('login');

// Redirect to signup
await redirectToAuth('signup');

// Redirect to session (if already authenticated)
await redirectToAuth('session');
```

## Token Handling

- **From URL**: Token is extracted from `?token=...` query param after redirect
- **From Cookie**: Token is read from `auth_app_token` cookie (if set by auth-app)
- **Priority**: URL param > Cookie

## Security Notes

- Tokens are Firebase ID tokens - verify them server-side in production
- Nonce prevents unauthorized apps from using auth-app
- Tokens expire - implement refresh logic if needed
- For production, verify tokens with Firebase Admin SDK on your backend
