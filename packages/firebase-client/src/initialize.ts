/**
 * Firebase initialization
 *
 * Handles initialization of Firebase services with support for:
 * - Emulator mode (development)
 * - Live mode (production/staging)
 * - Environment-based configuration
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import type {
  FirebaseConfig,
  FirebaseEmulatorConfig,
  FirebaseMode,
} from './types';

let firebaseApp: FirebaseApp | null = null;
let initialized = false;

/**
 * Get Firebase configuration from environment variables
 * @param isEmulatorMode - If true, uses default values for missing config when in emulator mode
 */
function getFirebaseConfig(isEmulatorMode = false): FirebaseConfig {
  // Use GCP project ID if specified and non-empty, otherwise fall back to Firebase project ID
  // With Identity Platform, both should be the same (GCP project ID)
  // Also check for GCP_PROJECT_ID as a fallback (set in Dockerfile)
  const gcpProjectId = import.meta.env.VITE_GCP_PROJECT_ID;
  const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const gcpProjectIdEnv = (
    import.meta.env as Record<string, string | undefined>
  ).GCP_PROJECT_ID;

  // Get trimmed project IDs, handling null/undefined with ??
  // Empty strings will fall through to the next option in the projectId assignment
  const trimmedGcpId = gcpProjectId?.trim() ?? '';
  const trimmedFirebaseId = firebaseProjectId?.trim() ?? '';
  const trimmedGcpEnvId = gcpProjectIdEnv?.trim() ?? '';

  // Use || here to handle empty strings (we need the first non-empty value)
  const projectId = trimmedGcpId || trimmedFirebaseId || trimmedGcpEnvId;

  // Log for debugging
  if (!projectId && !isEmulatorMode) {
    console.error(
      '[getFirebaseConfig] ERROR: No project ID found. ' +
        `VITE_GCP_PROJECT_ID: "${gcpProjectId ?? 'not set'}", ` +
        `VITE_FIREBASE_PROJECT_ID: "${firebaseProjectId ?? 'not set'}", ` +
        `GCP_PROJECT_ID: "${gcpProjectIdEnv ?? 'not set'}"`
    );
  }

  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  };

  if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    config.measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
  }

  // When using emulator, provide default values for missing config
  if (isEmulatorMode) {
    // Use default/dummy values for emulator if not provided or empty
    // The emulator doesn't actually validate these values
    config.apiKey = config.apiKey || 'demo-api-key';
    config.authDomain = config.authDomain || 'localhost';
    config.projectId = config.projectId || 'demo-project';
    config.storageBucket = config.storageBucket || 'demo-project.appspot.com';
    config.messagingSenderId = config.messagingSenderId || '123456789';
    config.appId = config.appId || '1:123456789:web:abcdef';
    return config;
  }

  // Validate required fields only in live mode
  const requiredFields: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingFields = requiredFields.filter(
    (field) => !config[field] || config[field] === ''
  );

  if (missingFields.length > 0) {
    // Provide helpful error message with environment variable names
    const envVarMap: Record<string, string> = {
      apiKey: 'VITE_FIREBASE_API_KEY',
      authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
      projectId: 'VITE_GCP_PROJECT_ID or VITE_FIREBASE_PROJECT_ID',
      storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
      messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
      appId: 'VITE_FIREBASE_APP_ID',
    };
    const missingEnvVars = missingFields.map((f) => envVarMap[f] || f);
    throw new Error(
      `Missing required Firebase configuration: ${missingFields.join(', ')}. ` +
        `Please set the following environment variables: ${missingEnvVars.join(', ')}`
    );
  }

  return config;
}

/**
 * Get emulator configuration from environment variables
 */
function getEmulatorConfig(): FirebaseEmulatorConfig {
  const useEmulator =
    import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' ||
    import.meta.env.DEV;

  if (!useEmulator) {
    return {};
  }

  const emulatorHost =
    import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? 'localhost';

  return {
    auth: {
      host: emulatorHost,
      port: Number.parseInt(
        import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_PORT ?? '9099',
        10
      ),
    },
    firestore: {
      host: emulatorHost,
      port: Number.parseInt(
        import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT ?? '8080',
        10
      ),
    },
    storage: {
      host: emulatorHost,
      port: Number.parseInt(
        import.meta.env.VITE_FIREBASE_EMULATOR_STORAGE_PORT ?? '9199',
        10
      ),
    },
    functions: {
      host: emulatorHost,
      port: Number.parseInt(
        import.meta.env.VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT ?? '5001',
        10
      ),
    },
  };
}

/**
 * Determine if we should use emulator mode
 */
function getFirebaseMode(): FirebaseMode {
  const explicitMode = import.meta.env.VITE_FIREBASE_MODE;
  if (explicitMode === 'emulator' || explicitMode === 'live') {
    return explicitMode;
  }

  // Default: use emulator in development, live in production
  return import.meta.env.DEV ? 'emulator' : 'live';
}

/**
 * Connect services to emulators
 */
function connectEmulators(
  app: FirebaseApp,
  emulatorConfig: FirebaseEmulatorConfig
): void {
  if (emulatorConfig.auth) {
    connectAuthEmulator(
      getAuth(app),
      `http://${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`,
      { disableWarnings: true }
    );
  }

  if (emulatorConfig.firestore) {
    connectFirestoreEmulator(
      getFirestore(app),
      emulatorConfig.firestore.host,
      emulatorConfig.firestore.port
    );
  }

  if (emulatorConfig.storage) {
    connectStorageEmulator(
      getStorage(app),
      emulatorConfig.storage.host,
      emulatorConfig.storage.port
    );
  }

  if (emulatorConfig.functions) {
    connectFunctionsEmulator(
      getFunctions(app),
      emulatorConfig.functions.host,
      emulatorConfig.functions.port
    );
  }
}

/**
 * Initialize Firebase app and services
 *
 * @param config - Optional Firebase config (defaults to environment variables)
 * @param forceReinit - Force re-initialization even if already initialized
 * @returns Firebase app instance
 */
export function initializeFirebase(
  config?: FirebaseConfig,
  forceReinit = false
): FirebaseApp {
  // Return existing app if already initialized and not forcing reinit
  if (initialized && !forceReinit && firebaseApp) {
    return firebaseApp;
  }

  // Check if Firebase is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0 && !forceReinit) {
    firebaseApp = existingApps[0];
    initialized = true;
    return firebaseApp;
  }

  // Get mode first to determine if we need strict validation
  const mode = getFirebaseMode();
  const isEmulatorMode = mode === 'emulator';

  // Get configuration (skip validation if using emulator)
  // With Identity Platform, all services use GCP project ID
  const firebaseConfig = config ?? getFirebaseConfig(isEmulatorMode);
  const emulatorConfig = getEmulatorConfig();

  // Initialize Firebase app (all services use GCP project ID via Identity Platform)
  if (forceReinit && firebaseApp) {
    // In a real scenario, you might want to handle cleanup
    // For now, we'll just reinitialize
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = initializeApp(firebaseConfig);
  }

  // Connect to emulators if in emulator mode
  if (mode === 'emulator' && Object.keys(emulatorConfig).length > 0) {
    try {
      console.log('🔥 [initializeFirebase] Connecting to emulators...');
      console.log('🔥 [initializeFirebase] Emulator config:', emulatorConfig);
      connectEmulators(firebaseApp, emulatorConfig);
      console.log(
        '✅ [initializeFirebase] Firebase emulators connected successfully'
      );
    } catch (error) {
      console.error(
        '🔴 [initializeFirebase] Failed to connect to emulators:',
        error
      );
      // Silently fall back to live services if emulator connection fails
    }
  } else {
    console.log('🔥 [initializeFirebase] Firebase initialized in live mode');
    if (mode !== 'emulator') {
      console.log('🔥 [initializeFirebase] Not in emulator mode, mode:', mode);
    }
    if (Object.keys(emulatorConfig).length === 0) {
      console.log('🔥 [initializeFirebase] No emulator config found');
    }
  }

  initialized = true;
  return firebaseApp;
}

/**
 * Get the initialized Firebase app instance
 * With Identity Platform, all services (Auth, Firestore, Storage, Functions) use the same app
 */
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    throw new Error(
      'Firebase not initialized. Call initializeFirebase() first.'
    );
  }
  return firebaseApp;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return initialized && firebaseApp !== null;
}
