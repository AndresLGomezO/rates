import { BaseHandler } from './base.handler.js';
import {
  MultiStepPipelinePayload,
  MultiStepPipelineResult,
} from '../types/task.types.js';
import { MultiStepPipelinePayloadSchema } from '../schemas/task.schema.js';
import { CheckpointData } from '../types/task.types.js';
import { ValidationError } from '../utils/errors.js';

export class MultiStepPipelineHandler extends BaseHandler<
  MultiStepPipelinePayload,
  MultiStepPipelineResult
> {
  validate(payload: unknown): MultiStepPipelinePayload {
    const result = MultiStepPipelinePayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new ValidationError(
        'Invalid payload for MULTI_STEP_PIPELINE',
        result.error.format()
      );
    }
    return result.data;
  }

  async process(
    payload: MultiStepPipelinePayload,
    _checkpoint?: CheckpointData
  ): Promise<MultiStepPipelineResult> {
    this.checkShutdown();

    // Mock implementation for scaffold

    return {
      finalOutput: payload.initialInput,
      stepResults: [],
      completedSteps: 0,
      totalSteps: payload.steps.length,
      totalDurationMs: 0,
    };
  }
}
