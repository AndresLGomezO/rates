# Rates App

Main financial accounts application for tracking accounts, payment periods, and amortization.

## Features

- Financial account management
- Payment period tracking
- Amortization calculations
- Account filtering and search
- Dashboard with metrics and charts

## Quick Start

### Prerequisites

1. **Start Firebase Emulators** (for local development):

   ```bash
   # From project root
   pnpm firebase:emulators
   ```

2. **Set up environment variables**:

   ```bash
   cp env.example .env.local
   # Edit .env.local with your Firebase configuration
   ```

3. **Start the app**:

   ```bash
   pnpm dev
   ```

The app will be available at `http://127.0.0.1:5174`.

---

## Account Migration

This guide explains how to migrate your initial accounts from spreadsheet data to the app's database.

### Overview

The migration script (`src/utils/migrateAccounts.ts`) converts your spreadsheet account data into the app's financial account data model and creates all accounts in Firestore.

### How to Run the Migration

#### Option 1: Using the UI (Recommended)

1. **Start the app** (make sure Firebase emulators are running):

   ```bash
   pnpm dev
   ```

2. **Navigate to the Migration page**:
   - Sign in to the app
   - Click on "Migrate Accounts" in the sidebar (🔄 icon)
   - Or go directly to: http://localhost:5174/migrate

3. **Preview the migration**:
   - Click "Preview Migration" to see what accounts will be created
   - Review the output to ensure all accounts are correctly mapped

4. **Run the migration**:
   - Click "Run Migration" to create all accounts in the database
   - Confirm when prompted
   - Review the results

#### Option 2: Using the Browser Console

1. Open the app in your browser
2. Open the browser console (F12 or Cmd+Option+I)
3. Run:

   ```javascript
   // Preview migration
   import('./src/utils/migrateAccounts.ts').then((m) => m.previewMigration());

   // Run migration
   import('./src/utils/migrateAccounts.ts').then((m) => m.runMigration());
   ```

### Account Data Mapping

The migration script maps your spreadsheet columns to the app's data model:

| Spreadsheet Column    | App Field                                              | Notes                                  |
| --------------------- | ------------------------------------------------------ | -------------------------------------- |
| Fecha Maxima          | `nextDueDate`                                          | Parsed from DD-MM-YYYY format          |
| Account Name          | `accountName`                                          | Used as-is                             |
| Total                 | `totalAmountRemaining`                                 | Multiplied by 1000 (assumes thousands) |
| Cuota / Total Payment | `monthlyPayment`                                       | Monthly payment amount                 |
| Rate                  | `rate`                                                 | Interest rate as percentage            |
| Cap / Int             | `metadata.capitalPortion` / `metadata.interestPortion` | Stored in metadata                     |

### Account Type Mapping

The script automatically maps account names to account types:

- **Mortgages**: Accounts with "hipotecario" in the name
- **Credit Cards**: Accounts with "tc " or "tarjeta" in the name
- **Auto Loans**: Accounts with "auto" in the name
- **Personal Loans**: Accounts with "prestamo" in the name
- **Bills**: Accounts like "planilla", "administracion", "agua", "luz", "gas", "internet", "cel"
- **Other**: Savings accounts ("ahorro", "scaleno") and other accounts

### Troubleshooting

#### Error: "Validation failed"

- Check that all required fields are present
- Ensure dates are in the correct format
- Verify amounts are valid numbers

#### Error: "Account already exists"

- The migration uses account numbers as document IDs
- If an account with the same number exists, it will be skipped
- Delete existing accounts first if you want to re-run the migration

#### Accounts not appearing

- Check the browser console for errors
- Verify you're logged in with the correct user
- Ensure Firebase emulators are running (if in development)

### Modifying the Migration

To modify the account data or add new accounts:

1. Edit `src/utils/migrateAccounts.ts`
2. Update the `rawAccounts` array with your data
3. Ensure the data format matches the `RawAccountData` interface
4. Re-run the migration

### Notes

- The migration creates accounts for the currently logged-in user
- Account numbers are auto-generated from account names
- All amounts are in COP (Colombian Pesos)
- Dates are parsed from DD-MM-YYYY format
- The migration is idempotent - running it multiple times will create duplicate accounts (use with caution)

---

## Authentication Integration

This app is integrated with the `auth-app` service for centralized authentication.

### Setup

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

### How It Works

1. **User visits protected route** → App checks for auth token
2. **No token found** → Redirects to auth-app with nonce
3. **User authenticates** → Auth-app validates nonce and issues token
4. **Redirect back** → App receives token in URL query params
5. **Token stored** → App extracts token and stores it (cookie or memory)
6. **Protected routes accessible** → User can access protected content

### Usage

#### Protected Routes

Wrap any route component with `ProtectedRoute`:

```tsx
import { ProtectedRoute } from './components/ProtectedRoute';

<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>;
```

#### Using Auth Context

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

#### Manual Redirect to Auth

```tsx
const { redirectToAuth } = useAuth();

// Redirect to login
await redirectToAuth('login');

// Redirect to signup
await redirectToAuth('signup');

// Redirect to session (if already authenticated)
await redirectToAuth('session');
```

### Token Handling

- **From URL**: Token is extracted from `?token=...` query param after redirect
- **From Cookie**: Token is read from `auth_app_token` cookie (if set by auth-app)
- **Priority**: URL param > Cookie

### Security Notes

- Tokens are Firebase ID tokens - verify them server-side in production
- Nonce prevents unauthorized apps from using auth-app
- Tokens expire - implement refresh logic if needed
- For production, verify tokens with Firebase Admin SDK on your backend

---

## Token Validation Setup

This guide explains how to set up and configure server-side token validation.

### Overview

The app now uses **server-side token validation** via Firebase Admin SDK. When a user authenticates, their Firebase ID token is validated by calling the auth-app's `/api/validate` endpoint, which uses Firebase Admin SDK to perform proper token verification.

### How It Works

1. **User Authentication**: User logs in through auth-app and receives a Firebase ID token
2. **Token Storage**: Token is stored in a cookie and passed to the main app
3. **Token Validation**: Main app calls `auth-app/api/validate?token=<id-token>`
4. **Server-Side Verification**: Auth-app uses Firebase Admin SDK to verify:
   - Token signature
   - Token expiration
   - Token revocation status
   - Token issuer
5. **Response**: Returns validation result (valid/invalid, expiration time, errors)

### Setup Steps

#### Step 1: Configure Main App Environment

Edit `apps/app/.env.local`:

```bash
# Auth App URL - must point to your auth-app service
VITE_AUTH_APP_URL=http://localhost:5175

# For production, use your production auth-app URL:
# VITE_AUTH_APP_URL=https://auth.yourdomain.com
```

#### Step 2: Start Services

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

### Verification

#### Test Token Validation

1. Open the main app in your browser
2. Log in through the auth-app
3. Check the browser console - you should see successful token validation
4. Check the auth-app terminal - you should see validation requests logged

#### Verify Admin SDK is Working

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

### Troubleshooting

#### Error: "Token validation failed - service unavailable"

**Problem**: The auth-app validation endpoint is not accessible.

**Solutions**:

1. Ensure auth-app is running on the correct port (default: 5175)
2. Check `VITE_AUTH_APP_URL` in main app's `.env.local` matches auth-app URL
3. Verify CORS is configured correctly (should be handled automatically)
4. Check auth-app terminal for errors

#### Token Validation Always Fails

**Problem**: Valid tokens are being rejected.

**Solutions**:

1. Verify Firebase Admin SDK is connected to the correct Firebase project
2. For emulator: Ensure Admin SDK is connected to emulator (`FIREBASE_AUTH_EMULATOR_HOST` set)
3. Check token format - should be a valid JWT with 3 parts
4. Verify the token was issued for the correct Firebase project

### Security Notes

- ✅ **Server-side validation**: All tokens are validated server-side using Firebase Admin SDK
- ✅ **Signature verification**: Admin SDK verifies token signatures cryptographically
- ✅ **Revocation checking**: Admin SDK checks if tokens have been revoked
- ✅ **Expiration checking**: Tokens are checked for expiration automatically
- ⚠️ **Never trust client-side validation alone**: Always validate server-side
- ⚠️ **Protect service account keys**: Never commit credentials to version control

### API Reference

#### Validation Endpoint

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

> **Note**: See `apps/auth-app/FIREBASE_ADMIN_SETUP.md` for detailed instructions on setting up Firebase Admin SDK in the auth-app.

---

## Redirect Flow

The app preserves the original URL when redirecting to auth-app, ensuring users return to the page they were trying to access after authentication.

### Flow Diagram

```
User tries to access /dashboard
    ↓
App checks authentication
    ↓
Not authenticated → Redirect to auth-app
    ↓
URL: http://auth-app/login?redirectTo=http://app/dashboard&nonce=...
    ↓
User authenticates in auth-app
    ↓
Auth-app redirects back with token
    ↓
URL: http://app/dashboard?token=...&redirectTo=http://app/dashboard&nonce=...
    ↓
App extracts token, validates it
    ↓
App navigates to /dashboard (from redirectTo)
    ↓
User is on the page they originally wanted
```

### Features

✅ **Preserves Original URL** - Users return to the exact page they were trying to access  
✅ **Preserves Query Params** - Original query parameters are maintained  
✅ **Security** - Only same-origin redirects are allowed  
✅ **Clean URLs** - Auth-related query params are removed after token extraction  
✅ **Token Validation** - Token is validated before navigation

### Example Scenarios

#### Scenario 1: Protected Route Access

1. User visits `/dashboard`
2. Not authenticated → Redirects to auth-app with `redirectTo=http://127.0.0.1:5174/dashboard`
3. User logs in
4. Redirects back to `/dashboard` with token
5. App validates token and navigates to `/dashboard`
6. ✅ User is on `/dashboard`

#### Scenario 2: Protected Route with Query Params

1. User visits `/dashboard?filter=active&sort=date`
2. Not authenticated → Redirects with full URL preserved
3. User logs in
4. Redirects back with token and original URL
5. App validates token and navigates to `/dashboard?filter=active&sort=date`
6. ✅ User is on `/dashboard?filter=active&sort=date` (query params preserved)

### Security Considerations

- **Same-Origin Check**: Only redirects to same origin are allowed
- **URL Validation**: Invalid URLs are ignored
- **Token Validation**: Token format is validated before navigation
- **Nonce Verification**: Nonce is validated in auth-app before redirect

### Testing

To test the redirect flow:

1. **Clear authentication**: Sign out or clear cookies
2. **Access protected route**: Visit `http://127.0.0.1:5174/dashboard`
3. **Verify redirect**: Should redirect to auth-app with correct `redirectTo`
4. **Authenticate**: Log in or sign up
5. **Verify return**: Should return to `/dashboard` (not home page)
6. **Check URL**: Should be clean (no auth params)

---

## Development

### Project Structure

```
apps/app/
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts (Auth)
│   ├── pages/          # Page components
│   ├── services/       # Firebase service wrappers
│   └── utils/          # Utility functions
├── public/             # Static assets
└── package.json
```

### Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

### Environment Variables

See `env.example` for all available environment variables.

Key variables:

- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_USE_FIREBASE_EMULATOR` - Set to `true` to use emulators
- `VITE_AUTH_APP_URL` - Auth app URL
- `VITE_NONCE_SECRET` - Shared nonce secret (must match auth-app)

# Test
