import {
  VertexAIService,
  vertexAIService,
} from '../services/vertex-ai.service.js';
import { checkpointService } from '../services/checkpoint.service.js';
import { taskRepository } from '../repositories/task.repository.js';
import { CheckpointData } from '../types/task.types.js';
import { isShutdownRequested } from '../utils/shutdown.js';
import { ShutdownError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export abstract class BaseHandler<TPayload, TResult> {
  protected vertexAI: VertexAIService = vertexAIService;
  protected logger = logger;
  protected taskId!: string; // Injected before process

  abstract validate(payload: unknown): TPayload;
  abstract process(
    payload: TPayload,
    checkpoint?: CheckpointData
  ): Promise<TResult>;

  setTaskId(taskId: string) {
    this.taskId = taskId;
  }

  protected async saveCheckpoint(data: CheckpointData): Promise<void> {
    if (!this.taskId) return;
    await checkpointService.saveCheckpoint(this.taskId, data);
  }

  protected async updateProgress(progress: number): Promise<void> {
    if (!this.taskId) return;
    await taskRepository.updateTask(this.taskId, { progress });
  }

  protected checkShutdown(): void {
    if (isShutdownRequested()) {
      throw new ShutdownError();
    }
  }
}
