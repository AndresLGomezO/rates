/**
 * Token validation utilities
 * Validates Firebase ID tokens using server-side Firebase Admin SDK
 *
 * This module handles token validation by calling the auth-app's server-side
 * validation endpoint, which uses Firebase Admin SDK for proper token verification.
 */

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

type ValidationApiResponse = {
  valid: boolean;
  error?: string;
  expiresAt?: number;
};

/**
 * Decode JWT token to check expiration (client-side check only)
 * Used for determining if token needs refresh, not for validation
 */
function getTokenExpiration(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

/**
 * Check if token expires soon (within 5 minutes)
 */
function isTokenExpiringSoon(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  const expiresIn = expiresAt - Date.now();
  return expiresIn < 300000; // 5 minutes in milliseconds
}

/**
 * Validate token using server-side Firebase Admin SDK
 *
 * This function calls the auth-app's /api/validate endpoint which uses
 * Firebase Admin SDK to perform full token verification including:
 * - Signature validation
 * - Expiration checking
 * - Revocation status
 * - Issuer verification
 *
 * @param token - Firebase ID token to validate
 * @returns Validation result with token status and expiration info
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
    // Call auth-app server-side validation endpoint
    // This uses Firebase Admin SDK for proper token verification
    const response = await fetch(
      `${AUTH_APP_URL}/api/validate?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    // Parse response
    let data: ValidationApiResponse;

    try {
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from validation endpoint');
      }
      data = JSON.parse(text) as ValidationApiResponse;
    } catch (parseError) {
      // If response is not JSON, it might be HTML (error page)
      console.error('Failed to parse validation response:', parseError);
      return {
        isValid: false,
        token: null,
        user: null,
        error: 'Invalid response format from validation endpoint',
      };
    }

    if (!response.ok || !data.valid) {
      // Token is invalid according to Admin SDK
      return {
        isValid: false,
        token: null,
        user: null,
        error: data.error ?? `Token validation failed (${response.status})`,
      };
    }

    // Token is valid - check if it needs refresh based on expiration
    const expiresAt = data.expiresAt ?? getTokenExpiration(token);
    const needsRefresh = isTokenExpiringSoon(expiresAt);

    return {
      isValid: true,
      token, // Use original token (Admin SDK doesn't return refreshed tokens)
      user: null, // User object not available from API
      needsRefresh,
    };
  } catch (error) {
    // Network error or API unavailable
    console.error('Token validation error:', error);

    // In production, we should fail securely - don't allow access without validation
    // In development, we might want to allow offline mode
    const isDevelopment = import.meta.env.DEV;

    if (isDevelopment) {
      // Development fallback: check token format only
      console.warn(
        'Token validation API unavailable. Using format check only. ' +
          'Server-side verification is required in production.'
      );

      // Basic format check as last resort
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          isValid: false,
          token: null,
          user: null,
          error: 'Invalid token format',
        };
      }

      // Check expiration client-side
      const expiresAt = getTokenExpiration(token);
      if (expiresAt && expiresAt <= Date.now()) {
        return {
          isValid: false,
          token: null,
          user: null,
          error: 'Token expired (offline check)',
        };
      }

      return {
        isValid: true,
        token,
        user: null,
        needsRefresh: isTokenExpiringSoon(expiresAt),
      };
    }

    // Production: fail securely
    return {
      isValid: false,
      token: null,
      user: null,
      error:
        error instanceof Error
          ? `Validation failed: ${error.message}`
          : 'Token validation failed - service unavailable',
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
