import { TaskHandler, TaskResult } from './types.js';
import { AIMessage } from '@rates/firebase-client/ai-tasks';
import { logger } from '../lib/logger.js';
import { SummarizationPayload } from '../schemas/message.js';

export const summarizationHandler: TaskHandler = {
  async process(message: AIMessage): Promise<TaskResult> {
    logger.info({ taskId: message.taskId }, 'Processing SUMMARIZATION task');

    const payloadResult = SummarizationPayload.safeParse(message.payload);
    if (!payloadResult.success) {
      throw new Error(
        `Invalid payload for SUMMARIZATION: ${payloadResult.error.message}`
      );
    }

    // Stub implementation
    logger.info('Stub: Fetching content and summarizing...');

    return {
      summary: 'Stubbed summary of the content',
      originalLength: 1000,
      summaryLength: 100,
    };
  },
};
