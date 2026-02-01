import { firestore, TASKS_COLLECTION } from './firestore.service.js';
import { logger } from '../utils/logger.js';
import { CheckpointData } from '../types/task.types.js';

export class CheckpointService {
  async saveCheckpoint(taskId: string, data: CheckpointData): Promise<void> {
    try {
      await firestore.collection(TASKS_COLLECTION).doc(taskId).update({
        checkpointData: data,
        lastCheckpointAt: new Date().toISOString(),
      });
      logger.debug({ taskId, version: data.version }, 'Checkpoint saved');
    } catch (error) {
      logger.error({ taskId, error }, 'Failed to save checkpoint');
      // Don't throw - checkpointing failure shouldn't crash the task, just log error
    }
  }

  async loadCheckpoint(taskId: string): Promise<CheckpointData | undefined> {
    const doc = await firestore.collection(TASKS_COLLECTION).doc(taskId).get();
    if (!doc.exists) return undefined;

    return doc.data()?.checkpointData as CheckpointData | undefined;
  }
}

export const checkpointService = new CheckpointService();
