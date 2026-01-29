import { AIMessage, AITaskType } from '@rates/firebase-client/ai-tasks';
import { TaskHandler, TaskResult } from './types.js';
import { textGenerationHandler } from './text-generation.js';
import { summarizationHandler } from './summarization.js';

const handlers: Partial<Record<AITaskType, TaskHandler>> = {
  TEXT_GENERATION: textGenerationHandler,
  SUMMARIZATION: summarizationHandler,
  // Other handlers to be added:
  // BATCH_EMBEDDING
  // DOCUMENT_QA
  // BATCH_CLASSIFICATION
  // MULTI_STEP_PIPELINE
};

export async function processTask(message: AIMessage): Promise<TaskResult> {
  const handler = handlers[message.type];

  if (!handler) {
    throw new Error(`No handler implemented for task type: ${message.type}`);
  }

  return handler.process(message);
}
