import admin from 'firebase-admin';
import { config } from '../config/index.js';

// Initialize Firebase Admin
// In Cloud Run, it uses Application Default Credentials automatically
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.gcp.projectId,
  });
}

if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.log(
    '🔥 [Firebase Admin] Using Auth Emulator:',
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
} else {
  console.log(
    '⚠️ [Firebase Admin] NOT using Auth Emulator (Expect Real Tokens)'
  );
}

export const firebaseAuth = admin.auth();
