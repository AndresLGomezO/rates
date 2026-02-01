import { db, getCollectionName } from '../utils/firestore.js';

const COLLECTION = getCollectionName('ai_tasks');

export class TaskRepository {
  async createTask(task: {
    taskId: string;
    userId: string;
    type: string;
    status: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(task.taskId)
      .set({
        ...task,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  }

  async getTask(taskId: string): Promise<Record<string, unknown> | null> {
    const doc = await db.collection(COLLECTION).doc(taskId).get();
    if (!doc.exists) return null;
    return doc.data() as Record<string, unknown>;
  }

  async updateTaskStatus(
    taskId: string,
    status: string,
    result?: unknown,
    error?: string
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (result) update.result = result;
    if (error) update.error = error;
    if (status === 'COMPLETED') update.completedAt = new Date().toISOString();
    if (status === 'FAILED') update.failedAt = new Date().toISOString();

    await db.collection(COLLECTION).doc(taskId).update(update);
  }
}
