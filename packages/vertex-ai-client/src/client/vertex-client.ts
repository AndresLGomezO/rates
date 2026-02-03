import { VertexAI } from '@google-cloud/vertexai';
import {
  VertexClientConfig,
  ModelId,
  EmbeddingModelId,
  ModelInfo,
} from '../types';
import { GenerationClient } from './generation-client';
import { EmbeddingClient } from './embedding-client';
import { RetryHandler } from '../retry/retry-handler';
import { getModelConfig } from '../config/model-config';
import { MODELS } from '../constants/models';
import { createClientConfig } from '../config/client-config';

export class VertexAIClient {
  public readonly config: VertexClientConfig;
  private vertexAI: VertexAI;
  private retryHandler: RetryHandler;

  public readonly generation: GenerationClient;
  public readonly embedding: EmbeddingClient;

  /**
   * Create a new Vertex AI client
   */
  constructor(config: VertexClientConfig) {
    const fullConfig = createClientConfig(config);
    this.config = fullConfig;

    this.vertexAI = new VertexAI({
      project: fullConfig.projectId,
      location: fullConfig.location,
    });

    this.retryHandler = new RetryHandler(fullConfig.retry!);

    this.generation = new GenerationClient(
      this.vertexAI,
      fullConfig,
      this.retryHandler
    );
    this.embedding = new EmbeddingClient(
      this.vertexAI,
      fullConfig,
      this.retryHandler
    );
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.projectId && !!this.config.location;
  }

  /**
   * Get model information
   */
  getModelInfo(modelId: ModelId | EmbeddingModelId): ModelInfo {
    return getModelConfig(modelId);
  }

  /**
   * List available models
   */
  listModels(type?: 'generation' | 'embedding'): ModelInfo[] {
    const models = Object.values(MODELS);
    if (type) {
      return models.filter((m) => m.type === type);
    }
    return models;
  }
}
