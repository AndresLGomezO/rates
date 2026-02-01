import {
  VertexAIClient,
  VertexAIError,
  ModelId,
  EmbeddingModelId,
  createClientConfig,
} from '@rates/vertex-ai-client';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  VertexRequest,
  VertexResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../types/vertex-ai.types.js';
import { PermanentError, TransientError } from '../utils/errors.js';

export const MODELS = {
  GEMINI_FLASH: 'gemini-2.0-flash-001',
  GEMINI_PRO: 'gemini-2.0-pro-001',
  EMBEDDING: 'text-embedding-005',
};

export class VertexAIService {
  private client: VertexAIClient;

  constructor() {
    logger.info(
      { location: config.VERTEX_AI_LOCATION },
      'Initializing Vertex AI Client'
    );
    this.client = new VertexAIClient(
      createClientConfig({
        projectId: config.GCP_PROJECT_ID,
        location: config.VERTEX_AI_LOCATION,
        retry: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
        },
      })
    );
  }

  async generateContent(request: VertexRequest): Promise<VertexResponse> {
    try {
      const result = await this.client.generation.generate({
        model: request.model as ModelId,
        prompt: request.prompt,
        parameters: request.config,
      });

      return {
        content: result.content,
        finishReason: result.finishReason || 'UNKNOWN',
        tokenUsage: {
          input: result.usage?.inputTokens || 0,
          output: result.usage?.outputTokens || 0,
        },
        safetyRatings: result.safetyRatings,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  async embedContent(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const result = await this.client.embedding.embedBatch({
        model: request.model as EmbeddingModelId,
        items: request.items.map((item) => ({ id: item.id, text: item.text })),
        continueOnError: true,
      });

      return {
        embeddings: result.embeddings.map((r) => ({
          id: r.id,
          vector: r.vector || [],
          error: r.error,
        })),
        dimensions: result.dimensions,
        successCount: result.successCount,
        failureCount: result.failureCount,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  private handleError(err: unknown): never {
    if (err instanceof VertexAIError) {
      if (err.classification === 'transient') {
        throw new TransientError(err.message, err);
      } else {
        throw new PermanentError(err.message, err);
      }
    }

    // Check if it's already one of our errors (methods shouldn't normally throw them unless rethrowing)
    if (err instanceof TransientError || err instanceof PermanentError) {
      throw err;
    }

    throw new TransientError('Unknown Vertex AI error', err);
  }
}

export const vertexAIService = new VertexAIService();
