import { BaseHandler } from './base.handler.js';
import {
  BatchEmbeddingPayload,
  BatchEmbeddingResult,
} from '../types/task.types.js';
import { BatchEmbeddingPayloadSchema } from '../schemas/task.schema.js';
import { CheckpointData } from '../types/task.types.js';
import { MODELS } from '../services/vertex-ai.service.js';
import { ValidationError } from '../utils/errors.js';

export class BatchEmbeddingHandler extends BaseHandler<
  BatchEmbeddingPayload,
  BatchEmbeddingResult
> {
  validate(payload: unknown): BatchEmbeddingPayload {
    const result = BatchEmbeddingPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new ValidationError(
        'Invalid payload for BATCH_EMBEDDING',
        result.error.format()
      );
    }
    return result.data;
  }

  async process(
    payload: BatchEmbeddingPayload,
    checkpoint?: CheckpointData
  ): Promise<BatchEmbeddingResult> {
    this.checkShutdown();

    // Checkpoint logic would go here for large batches (resume from last processed index)
    // For now, simple full processing

    // Filter items if resuming?
    let itemsToProcess = payload.items;

    // Stub checkpoint usage
    if (checkpoint?.handlerState?.lastProcessedId) {
      const lastId = checkpoint.handlerState.lastProcessedId as string;
      const index = itemsToProcess.findIndex((i) => i.id === lastId);
      if (index !== -1) {
        itemsToProcess = itemsToProcess.slice(index + 1);
      }
    }

    const result = await this.vertexAI.embedContent({
      model: payload.model || MODELS.EMBEDDING,
      items: itemsToProcess,
      batchSize: payload.batchSize,
    });

    // We'd merge with previous results if we were doing real checkpointed accumulation,
    // but typically we'd store intermediate results in the checkpoint or a separate storage.
    // For this impl, assumes complete run.

    return {
      embeddings: result.embeddings,
      dimensions: result.dimensions || 768,
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      tokenUsage: result.tokenUsage,
    };
  }
}
