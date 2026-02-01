import { ModelId, EmbeddingModelId } from './model.types';
import { EmbeddingTaskType } from './config.types';
import { GenerationResponse, StreamingChunk } from './response.types';

/**
 * Text generation request
 */
export interface GenerationRequest {
  /** User prompt */
  prompt: string;

  /** System instructions */
  systemContext?: string;

  /** Generation parameters */
  parameters?: GenerationParameters;

  /** Model override */
  model?: ModelId;

  /** Safety settings override */
  safetySettings?: SafetySettings;

  /** Request metadata for tracing */
  metadata?: RequestMetadata;
}

/**
 * Streaming generation request
 */
export interface StreamingGenerationRequest extends GenerationRequest {
  /** Callback for each chunk */
  onChunk: (chunk: StreamingChunk) => void;

  /** Callback on completion */
  onComplete?: (response: GenerationResponse) => void;

  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Generation parameters
 */
export interface GenerationParameters {
  /** Randomness (0.0 - 2.0) */
  temperature?: number;

  /** Nucleus sampling (0.0 - 1.0) */
  topP?: number;

  /** Top-k sampling (1 - 100) */
  topK?: number;

  /** Maximum output tokens */
  maxOutputTokens?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Candidate count (usually 1) */
  candidateCount?: number;
}

/**
 * Single embedding request
 */
export interface EmbeddingRequest {
  /** Text to embed */
  text: string;

  /** Model override */
  model?: EmbeddingModelId;

  /** Task type */
  taskType?: EmbeddingTaskType;

  /** Request metadata */
  metadata?: RequestMetadata;
}

/**
 * Batch embedding request
 */
export interface BatchEmbeddingRequest {
  /** Items to embed */
  items: EmbeddingItem[];

  /** Model override */
  model?: EmbeddingModelId;

  /** Task type */
  taskType?: EmbeddingTaskType;

  /** Batch size for API calls */
  batchSize?: number;

  /** Continue on individual failures */
  continueOnError?: boolean;

  /** Progress callback */
  onProgress?: (progress: BatchProgress) => void;

  /** Request metadata */
  metadata?: RequestMetadata;
}

/**
 * Single item for batch embedding
 */
export interface EmbeddingItem {
  /** Unique identifier */
  id: string;

  /** Text to embed */
  text: string;
}

/**
 * Request metadata for tracing
 */
export interface RequestMetadata {
  /** Request ID for correlation */
  requestId?: string;

  /** User ID for tracking */
  userId?: string;

  /** Additional labels */
  labels?: Record<string, string>;
}

/**
 * Safety settings
 */
export interface SafetySettings {
  /** Block threshold for harassment */
  harassmentThreshold?: SafetyThreshold;

  /** Block threshold for hate speech */
  hateSpeechThreshold?: SafetyThreshold;

  /** Block threshold for sexually explicit */
  sexuallyExplicitThreshold?: SafetyThreshold;

  /** Block threshold for dangerous content */
  dangerousContentThreshold?: SafetyThreshold;
}

export type SafetyThreshold =
  | 'BLOCK_NONE'
  | 'BLOCK_ONLY_HIGH'
  | 'BLOCK_MEDIUM_AND_ABOVE'
  | 'BLOCK_LOW_AND_ABOVE';

/**
 * Batch progress information
 */
export interface BatchProgress {
  /** Items processed so far */
  processed: number;

  /** Total items */
  total: number;

  /** Progress percentage */
  percentage: number;

  /** Current batch number */
  currentBatch: number;

  /** Total batches */
  totalBatches: number;
}
