import { db, getCollectionName } from '../utils/firestore.js';

const COLLECTION = getCollectionName('ai_rate_limits');

export class RateLimitRepository {
  // Simple counter based approach for now, could use Redis for better performance in future
  async incrementCounter(key: string, windowSeconds: number): Promise<number> {
    const docRef = db.collection(COLLECTION).doc(key);
    const now = Date.now();
    const expiresAt = now + windowSeconds * 1000;

    // Transaction to ensure atomicity
    return await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      let count = 0;
      let existingExpiresAt = 0;

      if (doc.exists) {
        const data = doc.data();
        if (data && data.expiresAt > now) {
          count = data.count;
          existingExpiresAt = data.expiresAt;
        }
      }

      count++;

      t.set(docRef, {
        count,
        expiresAt: existingExpiresAt || expiresAt,
        updatedAt: now,
      });

      return count;
    });
  }
}
