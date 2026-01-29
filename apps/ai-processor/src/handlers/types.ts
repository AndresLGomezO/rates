import { AIMessage } from '@rates/firebase-client/ai-tasks';

export interface TaskResult {
  [key: string]: unknown;
}

export interface TaskHandler {
  process(message: AIMessage): Promise<TaskResult>;
}
