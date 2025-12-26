/**
 * Token validation utilities
 * Validates Firebase ID tokens and handles refresh/revocation
 */

import { getAuth } from '@rates/firebase-client';
import { getAuthToken, clearAuthToken } from './auth';

const AUTH_APP_URL =
  (import.meta.env as Record<string, string | undefined>).VITE_AUTH_APP_URL ??
  'http://localhost:5175';

export type TokenValidationResult = {
  isValid: boolean;
  token: string | null;
  user: unknown;
  error?: string;
  needsRefresh?: boolean;
};

type TokenPayload = {
  exp?: number;
  [key: string]: unknown;
};

/**
 * Decode JWT token to check expiration without verifying signature
 * This is a client-side check - server should verify signature
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1])) as TokenPayload;
    const exp = payload.exp;
    if (!exp || typeof exp !== 'number') return true;

    // Check if token expires within the next 5 minutes (refresh threshold)
    const now = Math.floor(Date.now() / 1000);
    return exp <= now + 300; // 5 minutes buffer
  } catch {
    return true;
  }
}

/**
 * Validate token by attempting to use it with Firebase Auth
 * This will verify the token is valid and not revoked
 */
export async function validateToken(
  token: string | null
): Promise<TokenValidationResult> {
  if (!token) {
    return {
      isValid: false,
      token: null,
      user: null,
      error: 'No token provided',
    };
  }

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    // If we have a current user, check if their token matches
    if (currentUser) {
      const currentToken = await currentUser.getIdToken(false);
      if (currentToken === token) {
        // Token matches current user, check if it needs refresh
        const needsRefresh = isTokenExpired(token);
        if (needsRefresh) {
          const refreshedToken = await currentUser.getIdToken(true);
          return {
            isValid: true,
            token: refreshedToken,
            user: currentUser,
            needsRefresh: false,
          };
        }
        return {
          isValid: true,
          token: currentToken,
          user: currentUser,
          needsRefresh: false,
        };
      }
    }

    // Validate token by calling auth-app API validation endpoint
    // This is the primary validation method - more reliable than client-side checks
    try {
      const response = await fetch(
        `${AUTH_APP_URL}/api/validate?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      // Parse response
      let data: {
        valid: boolean;
        error?: string;
        refreshedToken?: string;
        expiresAt?: number;
      };

      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from validation endpoint');
        }
        data = JSON.parse(text) as typeof data;
      } catch (parseError) {
        // If response is not JSON, it might be HTML (error page)
        console.error('Failed to parse validation response:', parseError);
        throw new Error('Invalid response format from validation endpoint');
      }

      if (!response.ok) {
        // API returned an error status
        return {
          isValid: false,
          token: null,
          user: null,
          error: data.error ?? `Token validation failed (${response.status})`,
        };
      }

      if (data.valid) {
        // Token is valid
        const validatedToken = data.refreshedToken ?? token;

        // Check if token needs refresh based on expiration time
        let needsRefresh = false;
        if (data.expiresAt) {
          const expiresIn = data.expiresAt - Date.now();
          // Refresh if expires within 5 minutes
          needsRefresh = expiresIn < 300000; // 5 minutes in milliseconds
        } else {
          // Fallback to client-side expiration check
          needsRefresh = isTokenExpired(validatedToken);
        }

        return {
          isValid: true,
          token: validatedToken,
          user: null, // User object not available from API
          needsRefresh,
        };
      }

      // Token is invalid
      return {
        isValid: false,
        token: null,
        user: null,
        error: data.error ?? 'Token is invalid',
      };
    } catch (fetchError) {
      // Network error or API unavailable - fallback to client-side validation
      console.warn(
        'Token validation API unavailable, using fallback:',
        fetchError
      );

      // Check token expiration client-side as fallback
      if (isTokenExpired(token)) {
        return {
          isValid: false,
          token: null,
          user: null,
          error: 'Token expired (offline validation)',
          needsRefresh: true,
        };
      }

      // If we can't validate via API and token format looks valid,
      // assume it's okay for now (but warn in console)
      // In production, you should always validate server-side
      console.warn(
        'Token validation API unavailable. Using fallback validation. ' +
          'Token format appears valid, but server-side verification is recommended.'
      );

      return {
        isValid: true,
        token,
        user: null,
        needsRefresh: false,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      token: null,
      user: null,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Validate and refresh token if needed
 * Returns the validated/refreshed token or null if invalid
 *
 * This function:
 * 1. Gets the current token from storage (cookie or URL)
 * 2. Validates it via the auth-app API endpoint
 * 3. Returns the validated token (or refreshed token if available)
 * 4. Clears invalid tokens
 */
export async function validateAndRefreshToken(): Promise<string | null> {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  // Validate token via auth-app API
  const result = await validateToken(
    typeof token === 'string' ? token : (token?.token ?? null)
  );

  if (!result.isValid) {
    // Token is invalid, clear it
    clearAuthToken();
    return null;
  }

  // Token is valid
  // If a refreshed token was provided, use it
  // Otherwise, use the original token
  const validatedToken = result.token;

  if (!validatedToken) {
    // This shouldn't happen if isValid is true, but handle it anyway
    clearAuthToken();
    return null;
  }

  // If token was refreshed, we have the new token
  // Note: The cookie is managed by auth-app, so we don't update it here
  // The refreshed token will be used for subsequent requests
  return validatedToken;
}
