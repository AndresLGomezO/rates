import { BaseHandler } from './base.handler.js';
import {
  BatchClassificationPayload,
  BatchClassificationResult,
} from '../types/task.types.js';
import { BatchClassificationPayloadSchema } from '../schemas/task.schema.js';
import { CheckpointData } from '../types/task.types.js';
import { ValidationError } from '../utils/errors.js';

export class BatchClassificationHandler extends BaseHandler<
  BatchClassificationPayload,
  BatchClassificationResult
> {
  validate(payload: unknown): BatchClassificationPayload {
    const result = BatchClassificationPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new ValidationError(
        'Invalid payload for BATCH_CLASSIFICATION',
        result.error.format()
      );
    }
    return result.data;
  }

  async process(
    payload: BatchClassificationPayload,
    _checkpoint?: CheckpointData
  ): Promise<BatchClassificationResult> {
    this.checkShutdown();

    // Mock implementation for scaffold
    // Real impl would loop over items and ask LLM to classify

    const classifications = payload.items.map((item) => ({
      id: item.id,
      labels: [{ categoryId: payload.categories[0].id, confidence: 0.95 }],
    }));

    return {
      classifications,
      successCount: classifications.length,
      failureCount: 0,
    };
  }
}
