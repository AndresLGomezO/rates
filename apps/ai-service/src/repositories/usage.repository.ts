import { db, getCollectionName } from '../utils/firestore.js';
import { FieldValue } from '@google-cloud/firestore';

const COLLECTION = getCollectionName('ai_usage');

export class UsageRepository {
  private getDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDocId(userId: string): string {
    return `${userId}_${this.getDateKey()}`;
  }

  async incrementUsage(
    userId: string,
    usage: {
      requests?: number;
      tokensInput?: number;
      tokensOutput?: number;
      tasks?: number;
      cacheHits?: number;
    }
  ): Promise<void> {
    const docRef = db.collection(COLLECTION).doc(this.getDocId(userId));

    const update: Record<string, unknown> = {};
    if (usage.requests)
      update['usage.requestCount'] = FieldValue.increment(usage.requests);
    if (usage.tokensInput)
      update['usage.tokenInput'] = FieldValue.increment(usage.tokensInput);
    if (usage.tokensOutput)
      update['usage.tokenOutput'] = FieldValue.increment(usage.tokensOutput);
    if (usage.tasks)
      update['usage.tasksCreated'] = FieldValue.increment(usage.tasks);
    if (usage.cacheHits)
      update['usage.cacheHits'] = FieldValue.increment(usage.cacheHits);

    await docRef.set(
      {
        userId,
        date: this.getDateKey(),
        updatedAt: new Date().toISOString(),
        ...update,
      },
      { merge: true }
    );
  }

  async getUsage(userId: string): Promise<Record<string, unknown> | null> {
    const doc = await db
      .collection(COLLECTION)
      .doc(this.getDocId(userId))
      .get();

    if (!doc.exists) {
      return {
        requestCount: 0,
        tokenInput: 0,
        tokenOutput: 0,
        tasksCreated: 0,
        cacheHits: 0,
      };
    }

    const data = doc.data();
    return (
      (data?.usage as Record<string, unknown>) || {
        requestCount: 0,
        tokenInput: 0,
        tokenOutput: 0,
        tasksCreated: 0,
        cacheHits: 0,
      }
    );
  }
}
