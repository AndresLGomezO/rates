import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Initialize Firebase Admin
if (getApps().length === 0) {
  logger.info(
    { projectId: config.GCP_PROJECT_ID },
    'Initializing Firebase Admin SDK'
  );
  initializeApp({
    projectId: config.GCP_PROJECT_ID,
  });
}

export const firestore = getFirestore();

export const TASKS_COLLECTION = config.FIRESTORE_COLLECTION_PREFIX
  ? `${config.FIRESTORE_COLLECTION_PREFIX}ai_tasks`
  : `${config.ENV}_ai_tasks`;
