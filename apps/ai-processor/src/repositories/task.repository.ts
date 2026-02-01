import { firestore, TASKS_COLLECTION } from '../services/firestore.service.js';
import { TaskStatusUpdate } from '../types/task.types.js';
import { logger } from '../utils/logger.js';

export class TaskRepository {
  async getTask(taskId: string) {
    const doc = await firestore.collection(TASKS_COLLECTION).doc(taskId).get();
    if (!doc.exists) return null;
    return doc.data(); // TODO: Add type safety here if needed
  }

  async updateTask(taskId: string, update: Partial<TaskStatusUpdate>) {
    try {
      await firestore.collection(TASKS_COLLECTION).doc(taskId).update(update);
      logger.debug({ taskId, update }, 'Task updated in Firestore');
    } catch (error) {
      logger.error({ taskId, error }, 'Failed to update task in Firestore');
      throw error;
    }
  }
}

export const taskRepository = new TaskRepository();
