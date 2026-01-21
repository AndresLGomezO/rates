/**
 * Firebase initialization for the app
 *
 * This file initializes Firebase when the app starts.
 * Import this file in your main entry point (main.tsx) to ensure
 * Firebase is initialized before any components use it
 */

import { initializeFirebase } from '@rates/firebase-client';

// Initialize Firebase on app startup
// This will automatically use emulators in development mode
// and live Firebase in production mode.
console.log('🔥 [firebase.ts] Initializing Firebase...');
console.log('🔥 [firebase.ts] Environment variables:');
console.log(
  '🔥 [firebase.ts] - VITE_FIREBASE_API_KEY:',
  import.meta.env.VITE_FIREBASE_API_KEY ? 'SET' : 'NOT SET'
);
console.log(
  '🔥 [firebase.ts] - VITE_FIREBASE_PROJECT_ID:',
  import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'NOT SET'
);
console.log(
  '🔥 [firebase.ts] - VITE_FIREBASE_AUTH_DOMAIN:',
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'NOT SET'
);
console.log(
  '🔥 [firebase.ts] - VITE_USE_FIREBASE_EMULATOR:',
  import.meta.env.VITE_USE_FIREBASE_EMULATOR ?? 'NOT SET'
);
console.log(
  '🔥 [firebase.ts] - VITE_FIREBASE_MODE:',
  import.meta.env.VITE_FIREBASE_MODE ?? 'NOT SET'
);
console.log(
  '🔥 [firebase.ts] - VITE_FIREBASE_EMULATOR_HOST:',
  import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? 'NOT SET'
);
console.log(
  '🔥 [firebase.ts] - VITE_FIREBASE_EMULATOR_FIRESTORE_PORT:',
  import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT ?? 'NOT SET'
);
console.log('🔥 [firebase.ts] - DEV:', import.meta.env.DEV);
console.log('🔥 [firebase.ts] - PROD:', import.meta.env.PROD);

try {
  const app = initializeFirebase();
  console.log('✅ [firebase.ts] Firebase initialized successfully');
  console.log('✅ [firebase.ts] Firebase app:', app);
  console.log('✅ [firebase.ts] Firebase app name:', app.name);
  console.log('✅ [firebase.ts] Firebase app options:', {
    apiKey: app.options.apiKey ? 'SET' : 'NOT SET',
    projectId: app.options.projectId ?? 'NOT SET',
    authDomain: app.options.authDomain ?? 'NOT SET',
    storageBucket: app.options.storageBucket ?? 'NOT SET',
  });
} catch (error) {
  console.error('🔴 [firebase.ts] Failed to initialize Firebase:', error);
  throw error;
}
