/**
 * API endpoint handler for token validation
 * This intercepts requests to /api/validate and returns JSON responses
 */

import { User } from 'firebase/auth';

export type ValidationResponse = {
  valid: boolean;
  error?: string;
  refreshedToken?: string;
  expiresAt?: number;
  customToken?: string; // Custom token for Firebase Auth sign-in (client-side)
};

/**
 * Validate a Firebase ID token
 * This function can be called from API routes or used internally
 */
export async function validateTokenAPI(
  token: string,
  user: User | null
): Promise<ValidationResponse> {
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
    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);

    if (exp && exp <= now) {
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    // If we have a user, try to refresh their token
    if (user) {
      try {
        const currentToken = await user.getIdToken(false);
        const refreshedToken = await user.getIdToken(true);

        return {
          valid: true,
          refreshedToken:
            refreshedToken !== currentToken ? refreshedToken : undefined,
          expiresAt: exp ? exp * 1000 : undefined,
        };
      } catch (error) {
        return {
          valid: false,
          error:
            error instanceof Error ? error.message : 'Token refresh failed',
        };
      }
    }

    // Token format is valid and not expired
    return {
      valid: true,
      expiresAt: exp ? exp * 1000 : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}
