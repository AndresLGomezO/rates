# Redirect Flow Documentation

## Overview

The app now preserves the original URL when redirecting to auth-app, ensuring users return to the page they were trying to access after authentication.

## Flow Diagram

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

## Implementation Details

### 1. Redirect to Auth-App

When a user tries to access a protected route:

```typescript
// In AuthContext.redirectToAuth()
const currentUrl = new URL(window.location.href);
const redirectTo = currentUrl.toString(); // Full URL including path and query
const authUrl = await buildAuthAppUrl(AUTH_APP_URL, redirectTo, 'login');
window.location.href = authUrl;
```

**Example:**

- User on: `http://127.0.0.1:5174/dashboard?filter=active`
- Redirects to: `http://127.0.0.1:5175/login?redirectTo=http://127.0.0.1:5174/dashboard?filter=active&nonce=...`

### 2. Auth-App Redirects Back

After successful authentication, auth-app:

```typescript
// In completeAuthRedirect()
const target = resolveRedirect(originalRedirectTo, allowedRedirects, defaultReturnUrl);
const url = buildRedirectUrl(target, { token, ... }, originalRedirectTo);
window.location.replace(url);
```

**Example:**

- Redirects to: `http://127.0.0.1:5174/dashboard?filter=active&token=...&redirectTo=http://127.0.0.1:5174/dashboard?filter=active&nonce=...`

### 3. App Handles Return

When the app receives the redirect:

```typescript
// In AuthContext useEffect
const { token, redirectTo } = getAuthToken(true);
if (token && isValidTokenFormat(token)) {
  setToken(token);
  if (redirectTo) {
    const redirectUrl = new URL(redirectTo);
    // Extract clean path (without auth params)
    const finalPath = redirectUrl.pathname + cleanSearchParams;
    navigate(finalPath, { replace: true });
  }
}
```

**Result:**

- User ends up on: `http://127.0.0.1:5174/dashboard?filter=active`
- Original query params preserved
- Auth params removed

## Features

✅ **Preserves Original URL** - Users return to the exact page they were trying to access
✅ **Preserves Query Params** - Original query parameters are maintained
✅ **Security** - Only same-origin redirects are allowed
✅ **Clean URLs** - Auth-related query params are removed after token extraction
✅ **Token Validation** - Token is validated before navigation

## Example Scenarios

### Scenario 1: Protected Route Access

1. User visits `/dashboard`
2. Not authenticated → Redirects to auth-app with `redirectTo=http://127.0.0.1:5174/dashboard`
3. User logs in
4. Redirects back to `/dashboard` with token
5. App validates token and navigates to `/dashboard`
6. ✅ User is on `/dashboard`

### Scenario 2: Protected Route with Query Params

1. User visits `/dashboard?filter=active&sort=date`
2. Not authenticated → Redirects with full URL preserved
3. User logs in
4. Redirects back with token and original URL
5. App validates token and navigates to `/dashboard?filter=active&sort=date`
6. ✅ User is on `/dashboard?filter=active&sort=date` (query params preserved)

### Scenario 3: Already Authenticated

1. User visits `/dashboard` with valid token
2. ✅ Direct access, no redirect needed

## Security Considerations

- **Same-Origin Check**: Only redirects to same origin are allowed
- **URL Validation**: Invalid URLs are ignored
- **Token Validation**: Token format is validated before navigation
- **Nonce Verification**: Nonce is validated in auth-app before redirect

## Testing

To test the redirect flow:

1. **Clear authentication**: Sign out or clear cookies
2. **Access protected route**: Visit `http://127.0.0.1:5174/dashboard`
3. **Verify redirect**: Should redirect to auth-app with correct `redirectTo`
4. **Authenticate**: Log in or sign up
5. **Verify return**: Should return to `/dashboard` (not home page)
6. **Check URL**: Should be clean (no auth params)
