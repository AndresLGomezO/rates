import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const env = import.meta.env as Record<string, string | undefined>;
// EXPLICIT: Use emulator ONLY if:
// 1. VITE_FIREBASE_MODE is NOT 'live' (if it's 'live', never use emulator)
// 2. VITE_USE_FIREBASE_EMULATOR is NOT 'false' (if it's 'false', never use emulator)
// 3. Either VITE_FIREBASE_MODE is 'emulator' OR we're in dev mode (PROD !== true)
//
// IMPORTANT: In production builds (PROD=true), default to live Firebase unless explicitly set to emulator
// This ensures Cloud Run deployments use live Firebase even if env vars are missing
const isProduction = import.meta.env.PROD === true;
const firebaseMode = env.VITE_FIREBASE_MODE;
const useEmulator = env.VITE_USE_FIREBASE_EMULATOR;

const isEmulator =
  // If explicitly set to 'live', never use emulator
  firebaseMode === 'live'
    ? false
    : // If explicitly set to 'false', never use emulator
      useEmulator === 'false'
      ? false
      : // If in production mode (PROD=true), default to live (not emulator)
        isProduction
        ? false
        : // Otherwise, check if explicitly set to emulator or in dev mode
          firebaseMode === 'emulator' || !isProduction;

// Provide safe defaults so the emulator can run without real keys.
const projectId = env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project';
const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID ?? 'demo-app-id',
};

// DEBUG: Log all project identifiers and configuration
console.log('[DEBUG] Firebase Project Identifiers:', {
  // Environment variables (raw from import.meta.env)
  envVars: {
    VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY
      ? `${env.VITE_FIREBASE_API_KEY.substring(0, 10)}...`
      : 'undefined',
    VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  },
  // Resolved Firebase config values (what's actually being used)
  resolvedConfig: {
    projectId: projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    appId: firebaseConfig.appId,
    apiKey: firebaseConfig.apiKey
      ? `${firebaseConfig.apiKey.substring(0, 10)}...`
      : 'undefined',
    messagingSenderId: firebaseConfig.messagingSenderId,
  },
  // Build environment
  buildEnv: {
    PROD: import.meta.env.PROD,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    NODE_ENV:
      typeof process !== 'undefined' && process.env
        ? process.env.NODE_ENV
        : 'undefined (process not available)',
  },
  // Emulator configuration
  emulatorConfig: {
    VITE_FIREBASE_MODE: env.VITE_FIREBASE_MODE,
    VITE_USE_FIREBASE_EMULATOR: env.VITE_USE_FIREBASE_EMULATOR,
    isEmulator,
    isProduction,
    firebaseMode,
    useEmulator,
  },
  // Project identifiers that Firebase uses
  projectIdentifiers: {
    projectId: projectId,
    projectNumber: 'Check Firebase Console or gcloud projects describe',
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    appId: firebaseConfig.appId,
  },
});

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

if (isEmulator) {
  const host = env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(env.VITE_FIREBASE_EMULATOR_AUTH_PORT ?? 9099);
  connectAuthEmulator(auth, `http://${host}:${port}`, {
    disableWarnings: true,
  });
}
