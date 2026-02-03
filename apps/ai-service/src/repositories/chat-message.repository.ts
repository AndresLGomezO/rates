import { Timestamp } from '@google-cloud/firestore';
import { db, getCollectionName } from '../utils/firestore.js';
import { ChatMessage } from '../types/index.js';

const COLLECTION = getCollectionName('chat_messages');

export class ChatMessageRepository {
  async create(
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const timestamp = Timestamp.now();
    const data = {
      ...message,
      timestamp,
    };

    const docRef = await db.collection(COLLECTION).add(data);
    return { id: docRef.id, ...data } as ChatMessage;
  }

  async listBySession(sessionId: string, limit = 50): Promise<ChatMessage[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('sessionId', '==', sessionId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    // Reverse to get chronological order (oldest first) for context building
    // but we fetched newest first for efficiency
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as ChatMessage)
      .reverse();
  }
}
