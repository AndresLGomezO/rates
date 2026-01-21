import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const env = import.meta.env as Record<string, string | undefined>;
const isEmulator =
  env.VITE_FIREBASE_MODE === 'emulator' ||
  (env.VITE_USE_FIREBASE_EMULATOR !== 'false' && import.meta.env.PROD !== true);

// Provide safe defaults so the emulator can run without real keys..
const projectId = env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project';
const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID ?? 'demo-app-id',
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

if (isEmulator) {
  const host = env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1';
  const port = Number(env.VITE_FIREBASE_EMULATOR_AUTH_PORT ?? 9099);
  connectAuthEmulator(auth, `http://${host}:${port}`, {
    disableWarnings: true,
  });
}
