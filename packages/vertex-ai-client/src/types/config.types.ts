import { ModelId, EmbeddingModelId } from './model.types';
import { GenerationParameters, SafetySettings } from './request.types';

/**
 * Main client configuration
 */
export interface VertexClientConfig {
  /** GCP Project ID */
  projectId: string;

  /** Vertex AI region */
  location: string;

  /** Default model for generation */
  defaultModel?: ModelId;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: RetryConfig;

  /** Default generation parameters */
  defaultParameters?: Partial<GenerationParameters>;

  /** Default safety settings */
  defaultSafetySettings?: SafetySettings;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxRetries: number;

  /** Initial delay in milliseconds */
  initialDelayMs: number;

  /** Maximum delay in milliseconds */
  maxDelayMs: number;

  /** Backoff multiplier */
  backoffMultiplier: number;

  /** Jitter factor (0-1) */
  jitterFactor: number;
}

/**
 * Generation-specific configuration
 */
export interface GenerationConfig {
  /** Model to use */
  model?: ModelId;

  /** Generation parameters */
  parameters?: GenerationParameters;

  /** Safety settings */
  safetySettings?: SafetySettings;

  /** Request timeout override */
  timeout?: number;
}

/**
 * Embedding-specific configuration
 */
export interface EmbeddingConfig {
  /** Embedding model to use */
  model?: EmbeddingModelId;

  /** Task type for optimization */
  taskType?: EmbeddingTaskType;

  /** Output dimensionality (if model supports) */
  outputDimensionality?: number;
}

/**
 * Embedding task types
 */
export type EmbeddingTaskType =
  | 'RETRIEVAL_QUERY'
  | 'RETRIEVAL_DOCUMENT'
  | 'SEMANTIC_SIMILARITY'
  | 'CLASSIFICATION'
  | 'CLUSTERING';
