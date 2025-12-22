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
import { getFirebaseApp } from './initialize';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Storage } from 'firebase/storage';
import type { Functions } from 'firebase/functions';

let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: Storage | null = null;
let functionsInstance: Functions | null = null;

/**
 * Get Firebase Auth instance
 * 
 * @param region - Optional region for auth (defaults to default region)
 * @returns Auth instance
 */
export function getAuth(region?: string): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getFirebaseAuth(app, region);
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
    firestoreInstance = getFirebaseFirestore(app, databaseId);
  }
  return firestoreInstance;
}

/**
 * Get Firebase Storage instance
 * 
 * @param bucket - Optional storage bucket name
 * @returns Storage instance
 */
export function getStorage(bucket?: string): Storage {
  if (!storageInstance) {
    const app = getFirebaseApp();
    storageInstance = getFirebaseStorage(app, bucket);
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
    functionsInstance = getFirebaseFunctions(app, region);
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

