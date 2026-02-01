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

export class VertexAIClient {
  private vertexAI: VertexAI;
  private retryHandler: RetryHandler;

  public readonly generation: GenerationClient;
  public readonly embedding: EmbeddingClient;

  /**
   * Create a new Vertex AI client
   */
  constructor(public readonly config: VertexClientConfig) {
    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
      // googleAuthOptions: can be passed if needed, assuming default credentials
    });

    this.retryHandler = new RetryHandler(config.retry!);

    this.generation = new GenerationClient(
      this.vertexAI,
      config,
      this.retryHandler
    );
    this.embedding = new EmbeddingClient(
      this.vertexAI,
      config,
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
