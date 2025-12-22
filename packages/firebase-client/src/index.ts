/**
 * Firebase Client SDK
 * 
 * Centralized Firebase initialization and service exports.
 * Supports both emulator and live mode based on environment configuration.
 */

export { initializeFirebase } from './initialize';
export { getAuth, getFirestore, getStorage, getFunctions } from './services';
export type { FirebaseConfig, FirebaseServices } from './types';

