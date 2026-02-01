import { Timestamp } from '@google-cloud/firestore';
import { db, getCollectionName } from '../utils/firestore.js';
import { ChatSession } from '../types/index.js';

const COLLECTION = getCollectionName('chat_sessions');

export class ChatSessionRepository {
  async get(sessionId: string): Promise<ChatSession | null> {
    const doc = await db.collection(COLLECTION).doc(sessionId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as ChatSession;
  }

  async create(userId: string, initialPrompt: string): Promise<ChatSession> {
    const now = Timestamp.now();
    // Generate a title based on the first few words of the prompt
    const title =
      initialPrompt.length > 50
        ? initialPrompt.substring(0, 50) + '...'
        : initialPrompt;

    const data: Omit<ChatSession, 'id'> = {
      userId,
      title,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      messageCount: 0,
      totalTokensUsed: 0,
    };

    const docRef = await db.collection(COLLECTION).add(data);
    return { id: docRef.id, ...data };
  }

  async update(sessionId: string, data: Partial<ChatSession>): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(sessionId)
      .update({
        ...data,
        updatedAt: Timestamp.now(),
      });
  }

  async listByUser(userId: string, limit = 20): Promise<ChatSession[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as ChatSession
    );
  }
}
