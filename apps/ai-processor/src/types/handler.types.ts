import { CheckpointData } from './task.types.js';

export interface TaskHandler<TPayload, TResult> {
  validate(payload: unknown): TPayload;
  process(payload: TPayload, checkpoint?: CheckpointData): Promise<TResult>;
  setTaskId(taskId: string): void;
}

export interface HandlerRegistry {
  [key: string]: new () => TaskHandler<unknown, unknown>;
}
