/**
 * Server-side token validation using Firebase Admin SDK
 * This provides proper token verification with signature checking
 */

import { getAdminAuth } from './admin';
import type { ValidationResponse } from './apiValidate';

/**
 * Validate a Firebase ID token using Admin SDK
 * This performs full server-side verification including signature validation
 */
export async function validateTokenWithAdmin(
  token: string
): Promise<ValidationResponse> {
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
