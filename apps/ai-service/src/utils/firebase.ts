import admin from 'firebase-admin';
import { config } from '../config/index.js';

// Initialize Firebase Admin
// In Cloud Run, it uses Application Default Credentials automatically
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.gcp.projectId,
  });
}

export const firebaseAuth = admin.auth();
