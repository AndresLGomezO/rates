import { db, getCollectionName } from '../utils/firestore.js';

const COLLECTION = getCollectionName('ai_cache');

export class CacheRepository {
  async get(key: string): Promise<Record<string, unknown> | null> {
    const doc = await db.collection(COLLECTION).doc(key).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (data && data.expiresAt < Date.now()) {
      return null; // Expired
    }
    return data?.payload;
  }

  async set(
    key: string,
    value: Record<string, unknown>,
    ttlInSeconds: number
  ): Promise<void> {
    const expiresAt = Date.now() + ttlInSeconds * 1000;
    await db.collection(COLLECTION).doc(key).set({
      payload: value,
      expiresAt,
      createdAt: Date.now(),
    });
  }
}
