import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config.js';
import { logger } from './logger.js';

// Initialize Firebase Admin
if (getApps().length === 0) {
  logger.info('Initializing Firebase Admin SDK');
  initializeApp({
    projectId: config.GCP_PROJECT_ID,
  });
}

export const firestore = getFirestore();

// Helper to get collection reference with prefix
export const getCollection = (name: string) => {
  // If prefix is provided, use it. Otherwise use ENV.
  if (config.FIRESTORE_COLLECTION_PREFIX) {
    return firestore.collection(`${config.FIRESTORE_COLLECTION_PREFIX}${name}`);
  }

  return firestore.collection(`${config.ENV}_${name}`);
};

export const TASKS_COLLECTION = 'ai_tasks';
export const USAGE_COLLECTION = 'ai_usage';
