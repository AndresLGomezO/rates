import { GenerativeModel, VertexAI } from '@google-cloud/vertexai';
import {
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
  BatchEmbeddingResult,
  TokenUsage,
  VertexClientConfig,
  EmbeddingModelId,
} from '../types';
import { RetryHandler } from '../retry/retry-handler';
import { TokenCounter } from '../utils/token-counter';
import { ErrorMapper } from '../errors/error-mapper';
import { getModelConfig } from '../config/model-config';

interface VertexEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

/**
 * Interface for internal model with embedContent method
 * This is needed because the Vertex AI SDK GenerativeModel type
 * doesn't always expose embedContent even if the model supports it.
 */
interface EmbeddableModel {
  embedContent(request: {
    content: { role: string; parts: { text: string }[] };
    taskType?: string;
  }): Promise<VertexEmbeddingResponse>;
}

export class EmbeddingClient {
  constructor(
    private _vertexAI: VertexAI,
    _config: VertexClientConfig,
    private _retryHandler: RetryHandler
  ) {}

  /**
   * Embed single text
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const modelId = request.model ?? 'text-embedding-005';
    const model = this.getModel(modelId);

    return this._retryHandler.execute(async () => {
      const startTime = Date.now();
      try {
        const result = await (model as unknown as EmbeddableModel).embedContent(
          {
            content: { role: 'user', parts: [{ text: request.text }] },
            taskType: request.taskType,
          }
        );

        const embedding = result.embedding;
        const vector = embedding.values ?? [];
        const usage: TokenUsage = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        };

        return {
          vector,
          dimensions: vector.length,
          model: modelId,
          usage,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        throw ErrorMapper.map(error);
      }
    });
  }

  /**
   * Embed multiple texts in batch
   */
  async embedBatch(
    request: BatchEmbeddingRequest
  ): Promise<BatchEmbeddingResponse> {
    const modelId = request.model ?? 'text-embedding-005';
    const batchSize = request.batchSize ?? 50;
    const startTime = Date.now();

    const chunks = [];
    for (let i = 0; i < request.items.length; i += batchSize) {
      chunks.push(request.items.slice(i, i + batchSize));
    }

    let results: BatchEmbeddingResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let totalProcessed = 0;
    let currentBatch = 0;

    for (const chunk of chunks) {
      currentBatch++;
      const chunkPromises = chunk.map(async (item) => {
        try {
          const response = await this.embed({
            text: item.text,
            model: request.model,
            taskType: request.taskType,
          });
          return {
            id: item.id,
            vector: response.vector,
          };
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (request.continueOnError) {
            return {
              id: item.id,
              vector: null,
              error: message,
            };
          }
          throw error;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results = [...results, ...chunkResults];

      const chunkSuccess = chunkResults.filter((r) => r.vector !== null).length;
      const chunkFail = chunkResults.length - chunkSuccess;

      successCount += chunkSuccess;
      failureCount += chunkFail;
      totalProcessed += chunk.length;

      if (request.onProgress) {
        request.onProgress({
          processed: totalProcessed,
          total: request.items.length,
          percentage: Math.round((totalProcessed / request.items.length) * 100),
          currentBatch,
          totalBatches: chunks.length,
        });
      }
    }

    return {
      embeddings: results,
      dimensions: results.find((r) => r.vector)?.vector?.length ?? 0,
      model: modelId,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      successCount,
      failureCount,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Get embedding dimensions for a model
   */
  getDimensions(model?: string): number {
    const modelId = (model ?? 'text-embedding-005') as EmbeddingModelId;
    const config = getModelConfig(modelId);
    return config.embeddingDimensions ?? 768;
  }

  /**
   * Estimate tokens for embedding
   */
  estimateTokens(text: string): number {
    return TokenCounter.estimate(text);
  }

  private getModel(modelId: string): GenerativeModel {
    return this._vertexAI.getGenerativeModel({
      model: modelId,
    });
  }
}
