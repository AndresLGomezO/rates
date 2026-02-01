import { firestore } from '../services/firestore.service.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const USAGE_COLLECTION = `${config.FIRESTORE_COLLECTION_PREFIX}ai_usage`;

export class UsageRepository {
  async recordUsage(
    userId: string,
    tokens: { input: number; output: number },
    _model?: string
  ) {
    try {
      // In a real app we might batch this or write to a subcollection
      // For now, simple console log or fire-and-forget write
      const today = new Date().toISOString().split('T')[0];
      const docRef = firestore
        .collection(USAGE_COLLECTION)
        .doc(`${userId}_${today}`);

      await docRef.set(
        {
          totalInput: FieldValue.increment(tokens.input),
          totalOutput: FieldValue.increment(tokens.output),
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.warn({ userId, error }, 'Failed to record usage stats');
      // Don't throw, usage recording shouldn't fail the task
    }
  }
}

export const usageRepository = new UsageRepository();
