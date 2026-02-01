import { AIMessage } from './schemas/message.js';
import { taskRepository } from './repositories/task.repository.js';
import { usageRepository } from './repositories/usage.repository.js';
import { checkpointService } from './services/checkpoint.service.js';
import { handlers } from './handlers/index.js';
import { logger } from './utils/logger.js';
import {
  PermanentError,
  TransientError,
  ShutdownError,
  ValidationError,
} from './utils/errors.js';
import { config } from './config/index.js';

export class Processor {
  async run(message: AIMessage): Promise<void> {
    const { taskId, type, userId, attemptNumber } = message;

    // 1. Load Task State
    const taskData = await taskRepository.getTask(taskId);

    if (!taskData) {
      logger.warn({ taskId }, 'Task not found, exiting success');
      return; // Exit 0
    }

    if (taskData.status === 'COMPLETED' || taskData.status === 'FAILED') {
      logger.info(
        { taskId, status: taskData.status },
        'Task already terminal, exiting success'
      );
      return; // Exit 0
    }

    // 2. Acquire / Update Status
    await taskRepository.updateTask(taskId, {
      status: 'PROCESSING',
      processingStartedAt: new Date().toISOString(),
      processorExecutionId: config.CLOUD_RUN_EXECUTION || 'local',
      attemptNumber,
    });

    try {
      // 3. Select Handler
      const HandlerClass = handlers[type];
      if (!HandlerClass) {
        throw new PermanentError(`No handler found for type: ${type}`);
      }

      const handler = new HandlerClass();
      handler.setTaskId(taskId); // Inject dependencies

      // 4. Validate Payload
      logger.debug({ taskId, type }, 'Validating payload');
      const payload = handler.validate(message.payload);

      // 5. Load Checkpoint
      const checkpoint = await checkpointService.loadCheckpoint(taskId);
      if (checkpoint) {
        logger.info(
          { taskId, version: checkpoint.version },
          'Resuming from checkpoint'
        );
      }

      // 6. Execute
      logger.info({ taskId, type }, 'Starting execution');
      const start = Date.now();

      const result = await handler.process(payload, checkpoint);

      const duration = Date.now() - start;

      // 7. Store Result
      await taskRepository.updateTask(taskId, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        result,
        processingDurationMs: duration,
        // TODO: Aggregate token usage from result if available
      });

      // 8. Record Usage
      if (result && typeof result === 'object') {
        const usage = (
          result as { tokenUsage?: { input: number; output: number } }
        ).tokenUsage;
        if (
          usage &&
          typeof usage === 'object' &&
          'input' in usage &&
          'output' in usage
        ) {
          await usageRepository.recordUsage(userId, {
            input: usage.input,
            output: usage.output,
          });
        }
      }

      logger.info({ taskId, duration }, 'Task completed successfully');
    } catch (error) {
      await this.handleError(taskId, error, attemptNumber);
    }
  }

  private async handleError(
    taskId: string,
    error: unknown,
    attemptNumber: number
  ) {
    if (error instanceof ShutdownError) {
      logger.warn({ taskId }, 'Shutdown requested, checkpoint saved');
      process.exit(1); // Retry
    }

    if (error instanceof TransientError) {
      logger.warn({ taskId, error }, 'Transient error, task will retry');
      process.exit(1); // Retry
    }

    if (error instanceof ValidationError || error instanceof PermanentError) {
      logger.error({ taskId, error }, 'Permanent error, marking FAILED');

      await taskRepository.updateTask(taskId, {
        status: 'FAILED',
        failedAt: new Date().toISOString(),
        error: {
          code:
            error instanceof ValidationError
              ? 'VALIDATION_ERROR'
              : 'PERMANENT_ERROR',
          message: (error as Error).message,
          category: 'permanent',
          timestamp: new Date().toISOString(),
          attemptNumber,
        },
      });
      return; // Exit 0
    }

    // Unknown error -> Treat as Transient (or Permanent depending on policy)
    // unique to job: unknown errors often crash, so treating as transient (exit 1) is safer for recovery,
    // but we must avoid infinite loops. Pub/Sub has max attempts.
    logger.error({ taskId, error }, 'Unknown error, treating as transient');
    process.exit(1);
  }
}

export const processor = new Processor();
