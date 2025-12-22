/**
 * Firebase initialization for the app
 * 
 * This file initializes Firebase when the app starts.
 * Import this file in your main entry point (main.tsx) to ensure
 * Firebase is initialized before any components use it.
 */

import { initializeFirebase } from '@rates/firebase-client';

// Initialize Firebase on app startup
// This will automatically use emulators in development mode
// and live Firebase in production mode
initializeFirebase();

