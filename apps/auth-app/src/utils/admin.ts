/**
 * Firebase Admin SDK initialization
 * Used for server-side token verification
 *
 * Note: This file runs in Node.js context (via Vite middleware),
 * so it uses process.env and Node.js types
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Supports both emulator and production modes
 */
export function initializeAdmin(): App {
  // Return existing app if already initialized
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // In Vite, environment variables are available via import.meta.env in client code
  // But in server-side code (middleware), we need to use process.env
  // Vite prefixes client env vars with VITE_, but server-side can access both
  const env = process.env as Record<string, string | undefined>;
  const isEmulator =
    env.VITE_FIREBASE_MODE === 'emulator' ||
    env.FIREBASE_MODE === 'emulator' ||
    (env.VITE_USE_FIREBASE_EMULATOR !== 'false' &&
      env.USE_FIREBASE_EMULATOR !== 'false' &&
      process.env.NODE_ENV !== 'production');

  if (isEmulator) {
    // Initialize Admin SDK for emulator
    // In emulator mode, we don't need credentials
    const projectId =
      env.VITE_FIREBASE_PROJECT_ID ?? env.FIREBASE_PROJECT_ID ?? 'demo-project';
    adminApp = initializeApp({
      projectId,
    });

    // Connect to Auth emulator
    const emulatorHost =
      env.VITE_FIREBASE_EMULATOR_HOST ??
      env.FIREBASE_EMULATOR_HOST ??
      '127.0.0.1';
    const emulatorPort =
      env.VITE_FIREBASE_EMULATOR_AUTH_PORT ??
      env.FIREBASE_EMULATOR_AUTH_PORT ??
      '9099';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost}:${emulatorPort}`;

    return adminApp;
  }

  // Production mode - initialize with service account
  // Check for service account credentials
  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountPath) {
    // Initialize with service account file path
    adminApp = initializeApp({
      credential: cert(serviceAccountPath),
      projectId,
    });
  } else if (serviceAccountJson) {
    // Initialize with service account JSON string
    try {
      // Parse service account JSON
      // cert() accepts either a string (file path) or a service account object
      // We parse the JSON and pass it directly - cert() will validate it
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        credential: cert(serviceAccount),
        projectId,
      });
    } catch (error) {
      throw new Error(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } else {
    // Try to use Application Default Credentials (ADC)
    // This works in environments like Google Cloud Run, App Engine, etc.
    adminApp = initializeApp({
      projectId,
    });
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
