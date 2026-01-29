/**
 * Firebase service getters
 *
 * Provides typed access to Firebase services (Auth, Firestore, Storage, Functions).
 * Services are lazily initialized and cached.
 */

import { getAuth as getFirebaseAuth } from 'firebase/auth';
import { getFirestore as getFirebaseFirestore } from 'firebase/firestore';
import { getStorage as getFirebaseStorage } from 'firebase/storage';
import { getFunctions as getFirebaseFunctions } from 'firebase/functions';
import { getFirebaseApp } from './initialize.js';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Functions } from 'firebase/functions';

let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let functionsInstance: Functions | null = null;

/**
 * Get Firebase Auth instance
 *
 * @returns Auth instance
 */
export function getAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getFirebaseAuth(app);
  }
  return authInstance;
}

/**
 * Get Firestore instance
 *
 * @param databaseId - Optional database ID (defaults to default database)
 * @returns Firestore instance
 */
export function getFirestore(databaseId?: string): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    firestoreInstance = databaseId
      ? getFirebaseFirestore(app, databaseId)
      : getFirebaseFirestore(app);

    // Debug logging for Firestore connection
    console.log('🔥 [getFirestore] Firestore instance created');
    console.log(
      '🔥 [getFirestore] Firebase app name:',
      app.name,
      '(this is [DEFAULT] for the default app - correct)'
    );
    console.log('🔥 [getFirestore] Project ID:', app.options.projectId);
    console.log(
      '🔥 [getFirestore] API Key:',
      app.options.apiKey ? 'SET' : 'NOT SET'
    );
    console.log('🔥 [getFirestore] Auth Domain:', app.options.authDomain);
    console.log('🔥 [getFirestore] Storage Bucket:', app.options.storageBucket);
    console.log(
      '🔥 [getFirestore] Database ID:',
      databaseId ?? '(default)',
      '- This is correct for the default Firestore database'
    );
    console.log('🔥 [getFirestore] Firestore type:', firestoreInstance.type);
    console.log(
      '🔥 [getFirestore] Firestore app name:',
      firestoreInstance.app.name
    );
    console.log('🔥 [getFirestore] Firestore app options:', {
      projectId: firestoreInstance.app.options.projectId,
      apiKey: firestoreInstance.app.options.apiKey ? 'SET' : 'NOT SET',
      authDomain: firestoreInstance.app.options.authDomain,
      storageBucket: firestoreInstance.app.options.storageBucket,
    });
    console.log('🔥 [getFirestore] Connection Info:');
    console.log(
      '🔥 [getFirestore]   - Using Firebase SDK (which connects to GCP Firestore)'
    );
    console.log(
      '🔥 [getFirestore]   - Project:',
      firestoreInstance.app.options.projectId
    );
    console.log('🔥 [getFirestore]   - Database:', databaseId ?? '(default)');
    console.log(
      '🔥 [getFirestore]   - Full path: projects/' +
        firestoreInstance.app.options.projectId +
        '/databases/(default)/documents'
    );
  } else {
    // Log when returning cached instance
    console.log('🔥 [getFirestore] Returning cached Firestore instance');
    console.log(
      '🔥 [getFirestore] Project ID:',
      firestoreInstance.app.options.projectId
    );
  }

  return firestoreInstance;
}

/**
 * Get Firebase Storage instance
 *
 * @param bucket - Optional storage bucket name
 * @returns FirebaseStorage instance
 */
export function getStorage(bucket?: string): FirebaseStorage {
  if (!storageInstance) {
    const app = getFirebaseApp();
    storageInstance = bucket
      ? getFirebaseStorage(app, bucket)
      : getFirebaseStorage(app);
  }
  return storageInstance;
}

/**
 * Get Cloud Functions instance
 *
 * @param region - Optional region for functions (defaults to us-central1)
 * @returns Functions instance
 */
export function getFunctions(region?: string): Functions {
  if (!functionsInstance) {
    const app = getFirebaseApp();
    functionsInstance = region
      ? getFirebaseFunctions(app, region)
      : getFirebaseFunctions(app);
  }
  return functionsInstance;
}

/**
 * Reset all service instances (useful for testing)
 */
export function resetServices(): void {
  authInstance = null;
  firestoreInstance = null;
  storageInstance = null;
  functionsInstance = null;
}
