/**
 * Server-side token validation using Firebase Admin SDK
 * This provides proper token verification with signature checking
 */

import { getAdminAuth, getAdminApp } from './admin';
import type { ValidationResponse } from './apiValidate';

/**
 * Check if we're running in emulator mode
 * In production (Cloud Run), we should NOT use emulator mode unless explicitly set
 */
function isEmulatorMode(): boolean {
  const env = process.env as Record<string, string | undefined>;

  // In Cloud Run, NODE_ENV might not be 'production', so check for Cloud Run environment FIRST
  // Cloud Run sets K_SERVICE, K_REVISION, K_CONFIGURATION
  const isCloudRun = !!(
    process.env.K_SERVICE ??
    process.env.K_REVISION ??
    process.env.K_CONFIGURATION ??
    process.env.GOOGLE_CLOUD_PROJECT
  );

  const debugInfo = {
    VITE_FIREBASE_MODE: env.VITE_FIREBASE_MODE,
    FIREBASE_MODE: env.FIREBASE_MODE,
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    VITE_USE_FIREBASE_EMULATOR: env.VITE_USE_FIREBASE_EMULATOR,
    USE_FIREBASE_EMULATOR: env.USE_FIREBASE_EMULATOR,
    NODE_ENV: process.env.NODE_ENV,
    K_SERVICE: process.env.K_SERVICE,
    K_REVISION: process.env.K_REVISION,
    K_CONFIGURATION: process.env.K_CONFIGURATION,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    isCloudRun,
  };

  // If we're in Cloud Run, NEVER use emulator mode (even if FIREBASE_AUTH_EMULATOR_HOST is set)
  // This prevents accidental emulator mode in production
  if (isCloudRun) {
    console.log(
      '[DEBUG] [isEmulatorMode] Cloud Run detected, forcing PRODUCTION mode (emulator disabled)',
      debugInfo
    );
    return false;
  }

  // Explicit emulator mode flags take precedence (for local development)
  if (
    env.VITE_FIREBASE_MODE === 'emulator' ||
    env.FIREBASE_MODE === 'emulator'
  ) {
    console.log(
      '[DEBUG] [isEmulatorMode] Emulator mode detected: explicit flag set',
      debugInfo
    );
    return true;
  }

  // FIREBASE_AUTH_EMULATOR_HOST being set is a strong indicator (for local development)
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.log(
      '[DEBUG] [isEmulatorMode] Emulator mode detected: FIREBASE_AUTH_EMULATOR_HOST is set',
      debugInfo
    );
    return true;
  }

  // For local development, check emulator flags
  // Only use emulator if explicitly enabled (not just "not false")
  const useEmulator =
    env.VITE_USE_FIREBASE_EMULATOR === 'true' ||
    env.USE_FIREBASE_EMULATOR === 'true';

  console.log('[DEBUG] [isEmulatorMode] Local development check', {
    ...debugInfo,
    useEmulator,
  });

  return useEmulator;
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
  token: string,
  requestId?: string
): Promise<ValidationResponse> {
  const logPrefix = requestId ? `[${requestId}]` : '[DEBUG]';
  const tokenPreview =
    token.length > 20
      ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
      : `${token.length} chars`;

  console.log(`${logPrefix} [validateTokenWithAdmin] Starting validation`, {
    tokenLength: token.length,
    tokenPreview,
    isEmulatorMode: isEmulatorMode(),
  });

  // In emulator mode, use simpler validation for unsigned tokens
  if (isEmulatorMode()) {
    console.log(
      `${logPrefix} [validateTokenWithAdmin] Using emulator mode validation`
    );
    const emulatorResult = validateEmulatorToken(token);
    console.log(
      `${logPrefix} [validateTokenWithAdmin] Emulator validation result`,
      {
        valid: emulatorResult.valid,
        error: emulatorResult.error,
      }
    );
    if (emulatorResult.valid) {
      return emulatorResult;
    }
    // If emulator validation fails, fall through to Admin SDK
    // (in case someone is using a real token in emulator mode)
    console.log(
      `${logPrefix} [validateTokenWithAdmin] Emulator validation failed, falling back to Admin SDK`
    );
  }

  try {
    console.log(
      `${logPrefix} [validateTokenWithAdmin] Getting Admin Auth instance`
    );
    const auth = getAdminAuth();
    const app = getAdminApp();
    const projectId = app.options.projectId;
    console.log(
      `${logPrefix} [validateTokenWithAdmin] Admin Auth instance obtained`,
      {
        projectId,
        appName: app.name,
      }
    );

    // Decode token to check issuer/project (without verification)
    let tokenProjectId: string | undefined;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1])) as {
          iss?: string;
          aud?: string;
        };
        // iss format: https://securetoken.google.com/{project-id}
        if (payload.iss) {
          const match = payload.iss.match(/securetoken\.google\.com\/([^/]+)/);
          if (match) {
            tokenProjectId = match[1];
          }
        }
        // aud is also the project ID
        if (!tokenProjectId && payload.aud) {
          tokenProjectId = payload.aud;
        }
      }
    } catch {
      // Ignore decode errors
    }

    console.log(`${logPrefix} [validateTokenWithAdmin] Token project info`, {
      tokenProjectId,
      adminProjectId: projectId,
      projectMatch: tokenProjectId === projectId,
    });

    // Verify the token using Admin SDK
    // This checks:
    // - Token signature
    // - Token expiration
    // - Token issuer
    // - Token audience
    // - Token revocation status
    console.log(
      `${logPrefix} [validateTokenWithAdmin] Calling auth.verifyIdToken (checkRevoked=true)`
    );
    const decodedToken = await auth.verifyIdToken(token, true); // true = check if token is revoked

    // Extract expiration time
    const expiresAt = decodedToken.exp ? decodedToken.exp * 1000 : undefined;

    console.log(
      `${logPrefix} [validateTokenWithAdmin] Token verified successfully`,
      {
        uid: decodedToken.uid,
        email: decodedToken.email,
        expiresAt,
        exp: decodedToken.exp,
        iss: decodedToken.iss,
        aud: decodedToken.aud,
      }
    );

    // Token is valid - create a custom token for client-side Firebase Auth sign-in
    // This allows the client app to authenticate with Firebase Auth SDK
    // which is required for Firestore security rules to work
    let customToken: string | undefined;
    try {
      customToken = await auth.createCustomToken(decodedToken.uid);
      console.log(
        `${logPrefix} [validateTokenWithAdmin] Custom token created successfully`,
        {
          uid: decodedToken.uid,
          customTokenLength: customToken.length,
        }
      );
    } catch (customTokenError) {
      console.error(
        `${logPrefix} [validateTokenWithAdmin] Failed to create custom token`,
        {
          error:
            customTokenError instanceof Error
              ? customTokenError.message
              : String(customTokenError),
        }
      );
      // Continue without custom token - client can still use ID token for validation
    }

    // Token is valid
    return {
      valid: true,
      expiresAt,
      customToken, // Include custom token for client-side Firebase Auth sign-in
    };
  } catch (error) {
    console.error(
      `${logPrefix} [validateTokenWithAdmin] Error during verification`,
      {
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode:
          error && typeof error === 'object' && 'code' in error
            ? (error as { code: string }).code
            : undefined,
        errorStack: error instanceof Error ? error.stack : undefined,
      }
    );

    // Handle specific Firebase Auth errors
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string };

      console.log(
        `${logPrefix} [validateTokenWithAdmin] Firebase error code: ${firebaseError.code}`
      );

      switch (firebaseError.code) {
        case 'app/invalid-credential':
          // Service account credential is invalid, revoked, or doesn't exist
          console.error(
            `${logPrefix} [validateTokenWithAdmin] CRITICAL: Invalid service account credential`,
            {
              error: firebaseError.message,
              action: 'Check if service account key exists and is valid',
              url: 'https://console.firebase.google.com/iam-admin/serviceaccounts/project',
            }
          );
          return {
            valid: false,
            error:
              'Service account credential is invalid or revoked. Please check the service account key in Secret Manager.',
          };
        case 'auth/argument-error':
          // auth/argument-error can mean different things - use the actual error message
          // Common causes: invalid signature, wrong project, malformed token
          return {
            valid: false,
            error: firebaseError.message ?? 'Invalid token format',
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
                  console.log(
                    `${logPrefix} [validateTokenWithAdmin] Token appears to be emulator token, retrying emulator validation`
                  );
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
