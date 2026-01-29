/**
 * Firebase Admin SDK initialization
 * Used for server-side token verification
 *
 * Note: This file runs in Node.js context (via Vite middleware),
 * so it uses process.env and Node.js types
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Firebase service account credential structure (JSON format)
 * Matches the JSON format from Google Cloud service account keys
 * The cert() function accepts this format directly
 */
interface ServiceAccountJson {
  type: string;
  project_id: string;
  client_email: string;
  private_key: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
}

let adminApp: App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Supports both emulator and production modes
 */
export function initializeAdmin(): App {
  // Return existing app if already initialized
  if (adminApp) {
    console.log('[DEBUG] [initializeAdmin] Using existing admin app instance', {
      appName: adminApp.name,
      projectId: adminApp.options.projectId,
      hasCredential: !!adminApp.options.credential,
    });
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    const existingApp = existingApps[0];
    console.log(
      '[DEBUG] [initializeAdmin] Using existing Firebase app from getApps()',
      {
        appCount: existingApps.length,
        appName: existingApp?.name,
        projectId: existingApp?.options.projectId,
        hasCredential: !!existingApp?.options.credential,
      }
    );
    adminApp = existingApp;
    return adminApp;
  }

  console.log(
    '[DEBUG] [initializeAdmin] Initializing new Firebase Admin SDK instance'
  );

  // In Vite, environment variables are available via import.meta.env in client code
  // But in server-side code (middleware), we need to use process.env
  // Vite prefixes client env vars with VITE_, but server-side can access both
  const env = process.env as Record<string, string | undefined>;

  // Log environment variables (safely, without exposing secrets)
  const envDebug = {
    NODE_ENV: env.NODE_ENV,
    VITE_FIREBASE_MODE: env.VITE_FIREBASE_MODE,
    FIREBASE_MODE: env.FIREBASE_MODE,
    VITE_USE_FIREBASE_EMULATOR: env.VITE_USE_FIREBASE_EMULATOR,
    USE_FIREBASE_EMULATOR: env.USE_FIREBASE_EMULATOR,
    FIREBASE_AUTH_EMULATOR_HOST: env.FIREBASE_AUTH_EMULATOR_HOST,
    VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
    hasGOOGLE_APPLICATION_CREDENTIALS: !!env.GOOGLE_APPLICATION_CREDENTIALS,
    GOOGLE_APPLICATION_CREDENTIALS_path: env.GOOGLE_APPLICATION_CREDENTIALS,
    hasFIREBASE_SERVICE_ACCOUNT: !!env.FIREBASE_SERVICE_ACCOUNT,
    FIREBASE_SERVICE_ACCOUNT_length: env.FIREBASE_SERVICE_ACCOUNT?.length ?? 0,
    hasFIREBASE_SERVICE_ACCOUNT_JSON: !!env.FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_SERVICE_ACCOUNT_JSON_length:
      env.FIREBASE_SERVICE_ACCOUNT_JSON?.length ?? 0,
  };
  console.log('[DEBUG] [initializeAdmin] Environment variables', envDebug);

  // Check for Cloud Run FIRST (same logic as isEmulatorMode in adminValidate.ts)
  const isCloudRun = !!(
    process.env.K_SERVICE ??
    process.env.K_REVISION ??
    process.env.K_CONFIGURATION ??
    process.env.GOOGLE_CLOUD_PROJECT
  );

  // In Cloud Run, NEVER use emulator mode
  let isEmulator = false;
  if (!isCloudRun) {
    // Only check emulator flags if NOT in Cloud Run
    isEmulator =
      env.VITE_FIREBASE_MODE === 'emulator' ||
      env.FIREBASE_MODE === 'emulator' ||
      !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      env.VITE_USE_FIREBASE_EMULATOR === 'true' ||
      env.USE_FIREBASE_EMULATOR === 'true';
  }

  console.log('[DEBUG] [initializeAdmin] Emulator mode check', {
    isCloudRun,
    isEmulator,
    checks: {
      VITE_FIREBASE_MODE: env.VITE_FIREBASE_MODE === 'emulator',
      FIREBASE_MODE: env.FIREBASE_MODE === 'emulator',
      FIREBASE_AUTH_EMULATOR_HOST: !!process.env.FIREBASE_AUTH_EMULATOR_HOST,
      VITE_USE_FIREBASE_EMULATOR: env.VITE_USE_FIREBASE_EMULATOR === 'true',
      USE_FIREBASE_EMULATOR: env.USE_FIREBASE_EMULATOR === 'true',
      NODE_ENV: process.env.NODE_ENV,
    },
  });

  if (isEmulator) {
    // Double-check: Don't use emulator in Cloud Run even if isEmulator() returned true
    // This is a safety check in case the emulator detection logic has issues
    const isCloudRun = !!(
      process.env.K_SERVICE ??
      process.env.K_REVISION ??
      process.env.K_CONFIGURATION ??
      process.env.GOOGLE_CLOUD_PROJECT
    );

    if (isCloudRun) {
      console.log(
        '[DEBUG] [initializeAdmin] Cloud Run detected, overriding emulator mode and using PRODUCTION mode'
      );
      // Fall through to production initialization
    } else {
      console.log('[DEBUG] [initializeAdmin] Initializing in EMULATOR mode');
      // Connect to Auth emulator FIRST (before initializing app)
      // This must be set before any Admin SDK calls
      const emulatorHost =
        env.VITE_FIREBASE_EMULATOR_HOST ??
        env.FIREBASE_EMULATOR_HOST ??
        '127.0.0.1';
      const emulatorPort =
        env.VITE_FIREBASE_EMULATOR_AUTH_PORT ??
        env.FIREBASE_EMULATOR_AUTH_PORT ??
        '9099';
      const emulatorHostValue = `${emulatorHost}:${emulatorPort}`;
      process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHostValue;

      console.log('[DEBUG] [initializeAdmin] Emulator configuration', {
        emulatorHost,
        emulatorPort,
        FIREBASE_AUTH_EMULATOR_HOST: emulatorHostValue,
      });

      // Initialize Admin SDK for emulator
      // In emulator mode, we don't need credentials
      const projectId =
        env.VITE_FIREBASE_PROJECT_ID ??
        env.FIREBASE_PROJECT_ID ??
        'demo-project';

      console.log('[DEBUG] [initializeAdmin] Initializing app with projectId', {
        projectId,
      });
      adminApp = initializeApp({
        projectId,
      });

      console.log(
        '[DEBUG] [initializeAdmin] Admin app initialized successfully (emulator mode)',
        {
          appName: adminApp.name,
          projectId,
        }
      );

      return adminApp;
    }
  }

  console.log('[DEBUG] [initializeAdmin] Initializing in PRODUCTION mode');
  // Production mode - initialize with service account
  // Check for service account credentials
  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  // Support both FIREBASE_SERVICE_ACCOUNT (from Terraform) and FIREBASE_SERVICE_ACCOUNT_JSON (legacy)
  const serviceAccountJson =
    env.FIREBASE_SERVICE_ACCOUNT ?? env.FIREBASE_SERVICE_ACCOUNT_JSON;

  console.log('[DEBUG] [initializeAdmin] Credential detection', {
    projectId,
    hasServiceAccountPath: !!serviceAccountPath,
    serviceAccountPath,
    hasServiceAccountJson: !!serviceAccountJson,
    serviceAccountJsonLength: serviceAccountJson?.length ?? 0,
    credentialSource: serviceAccountPath
      ? 'GOOGLE_APPLICATION_CREDENTIALS (file path)'
      : serviceAccountJson
        ? 'FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_JSON (JSON string)'
        : 'Application Default Credentials (ADC)',
  });

  if (serviceAccountPath) {
    console.log('[DEBUG] [initializeAdmin] Using service account file path');
    // Initialize with service account file path
    try {
      adminApp = initializeApp({
        credential: cert(serviceAccountPath),
        projectId,
      });
      console.log(
        '[DEBUG] [initializeAdmin] Admin app initialized successfully (service account file)',
        {
          appName: adminApp.name,
          projectId,
        }
      );
    } catch (error) {
      console.error(
        '[ERROR] [initializeAdmin] Failed to initialize with service account file',
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      );
      throw error;
    }
  } else if (serviceAccountJson) {
    console.log('[DEBUG] [initializeAdmin] Using service account JSON string');
    // Initialize with service account JSON string
    try {
      // Parse service account JSON
      // cert() accepts either a string (file path) or a service account object
      // The JSON format uses snake_case (project_id, client_email) which cert() accepts
      const serviceAccount = JSON.parse(
        serviceAccountJson
      ) as ServiceAccountJson;
      console.log('[DEBUG] [initializeAdmin] Parsed service account JSON', {
        type: serviceAccount.type,
        project_id: serviceAccount.project_id,
        client_email: serviceAccount.client_email,
      });
      // cert() accepts the JSON format directly (snake_case properties)
      // TypeScript's ServiceAccount type uses camelCase, but cert() implementation
      // accepts both formats, so we use a type assertion here
      adminApp = initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
        projectId,
      });
      console.log(
        '[DEBUG] [initializeAdmin] Admin app initialized successfully (service account JSON)',
        {
          appName: adminApp.name,
          projectId,
        }
      );
    } catch (error) {
      console.error(
        '[ERROR] [initializeAdmin] Failed to parse or initialize with service account JSON',
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          jsonLength: serviceAccountJson.length,
          jsonPreview: serviceAccountJson.substring(0, 100),
        }
      );
      throw new Error(
        `Failed to parse service account JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } else {
    console.log(
      '[DEBUG] [initializeAdmin] Using Application Default Credentials (ADC)'
    );
    // Try to use Application Default Credentials (ADC)
    // This works in environments like Google Cloud Run, App Engine, etc.
    // Note: ADC requires the service account to have proper IAM permissions

    // Log ADC environment info
    console.log('[DEBUG] [initializeAdmin] ADC environment check', {
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      GCP_PROJECT: process.env.GCP_PROJECT,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      GCE_METADATA_HOST: process.env.GCE_METADATA_HOST,
      K_SERVICE: process.env.K_SERVICE,
      K_REVISION: process.env.K_REVISION,
    });

    if (!projectId) {
      console.error(
        '[ERROR] [initializeAdmin] Missing projectId for ADC initialization'
      );
      throw new Error(
        'Firebase Admin SDK initialization failed: Missing projectId. Set FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID environment variable.'
      );
    }
    try {
      adminApp = initializeApp({
        projectId,
      });

      // Try to get the credential info (if available)
      let credentialInfo = 'ADC (metadata server)';
      try {
        // The app might have credential info, but it's not easily accessible
        // We can at least confirm it initialized
        credentialInfo = 'ADC (initialized)';
      } catch {
        // Ignore
      }

      console.log(
        '[DEBUG] [initializeAdmin] Admin app initialized successfully (ADC)',
        {
          appName: adminApp.name,
          projectId,
          credentialSource: credentialInfo,
          warning:
            'If token validation fails with "invalid signature", the service account may not have Firebase Admin permissions',
        }
      );
    } catch (error) {
      console.error('[ERROR] [initializeAdmin] Failed to initialize with ADC', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        projectId,
      });
      throw error;
    }
  }

  return adminApp;
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  return getAuth(app);
}

/**
 * Get Firebase Admin App instance
 */
export function getAdminApp() {
  return initializeAdmin();
}
