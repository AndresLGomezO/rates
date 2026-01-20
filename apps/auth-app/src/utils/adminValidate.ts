/**
 * Server-side token validation using Firebase Admin SDK
 * This provides proper token verification with signature checking
 */

import { getAdminAuth } from './admin';
import type { ValidationResponse } from './apiValidate';

/**
 * Check if we're running in emulator mode
 */
function isEmulatorMode(): boolean {
  const env = process.env as Record<string, string | undefined>;
  return (
    env.VITE_FIREBASE_MODE === 'emulator' ||
    env.FIREBASE_MODE === 'emulator' ||
    (env.VITE_USE_FIREBASE_EMULATOR !== 'false' &&
      env.USE_FIREBASE_EMULATOR !== 'false' &&
      process.env.NODE_ENV !== 'production') ||
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
}

/**
 * Validate emulator token (simpler validation for unsigned tokens)
 * In emulator mode, we're more lenient with expired tokens for development
 */
function validateEmulatorToken(token: string): ValidationResponse {
  try {
    // Basic format check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1])) as {
      exp?: number;
      alg?: string;
      iss?: string;
      sub?: string;
    };

    // Check if it's an emulator token (alg: "none")
    if (payload.alg !== 'none') {
      // Not an emulator token, should use Admin SDK
      return {
        valid: false,
        error: 'Token is not an emulator token',
      };
    }

    // Check expiration
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    const isExpired = exp && exp <= now;

    // In emulator mode, allow expired tokens for development
    // But still indicate they're expired so client can refresh if needed
    if (isExpired) {
      // For emulator, we'll accept expired tokens but mark them as needing refresh
      // This allows development to continue without constant re-authentication
      return {
        valid: true, // Accept expired tokens in emulator for development
        expiresAt: exp ? exp * 1000 : undefined,
        // Note: We can't refresh without the user object, so client should handle this
      };
    }

    // Emulator token is valid and not expired
    return {
      valid: true,
      expiresAt: exp ? exp * 1000 : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    };
  }
}

/**
 * Validate a Firebase ID token using Admin SDK
 * This performs full server-side verification including signature validation
 * In emulator mode, uses simpler validation for unsigned tokens
 */
export async function validateTokenWithAdmin(
  token: string
): Promise<ValidationResponse> {
  // In emulator mode, use simpler validation for unsigned tokens
  if (isEmulatorMode()) {
    const emulatorResult = validateEmulatorToken(token);
    if (emulatorResult.valid) {
      return emulatorResult;
    }
    // If emulator validation fails, fall through to Admin SDK
    // (in case someone is using a real token in emulator mode)
  }

  try {
    const auth = getAdminAuth();

    // Verify the token using Admin SDK
    // This checks:
    // - Token signature
    // - Token expiration
    // - Token issuer
    // - Token audience
    // - Token revocation status
    const decodedToken = await auth.verifyIdToken(token, true); // true = check if token is revoked

    // Extract expiration time
    const expiresAt = decodedToken.exp ? decodedToken.exp * 1000 : undefined;

    // Token is valid
    return {
      valid: true,
      expiresAt,
    };
  } catch (error) {
    // Handle specific Firebase Auth errors
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string };

      switch (firebaseError.code) {
        case 'auth/argument-error':
          return {
            valid: false,
            error: 'Invalid token format',
          };
        case 'auth/id-token-expired':
          return {
            valid: false,
            error: 'Token expired',
          };
        case 'auth/id-token-revoked':
          return {
            valid: false,
            error: 'Token revoked',
          };
        case 'auth/invalid-id-token':
          // In emulator mode, if Admin SDK fails but token looks like emulator token, try emulator validation
          if (isEmulatorMode()) {
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1])) as { alg?: string };
                if (payload.alg === 'none') {
                  return validateEmulatorToken(token);
                }
              }
            } catch {
              // Fall through to error
            }
          }
          return {
            valid: false,
            error: 'Invalid token',
          };
        default:
          return {
            valid: false,
            error: firebaseError.message ?? 'Token validation failed',
          };
      }
    }

    // Generic error handling
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    };
  }
}
