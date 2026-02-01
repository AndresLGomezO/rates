import { RequestMetadata } from './request.types';

/**
 * Text generation response
 */
export interface GenerationResponse {
  /** Generated content */
  content: string;

  /** Why generation stopped */
  finishReason: FinishReason;

  /** Token usage */
  usage: TokenUsage;

  /** Safety ratings */
  safetyRatings: SafetyRating[];

  /** Model used */
  model: string;

  /** Processing latency in ms */
  latencyMs: number;

  /** Request metadata echo */
  metadata?: RequestMetadata;
}

/**
 * Streaming chunk
 */
export interface StreamingChunk {
  /** Chunk content */
  content: string;

  /** Chunk index */
  index: number;

  /** Is final chunk */
  isFinal: boolean;

  /** Finish reason (only on final) */
  finishReason?: FinishReason;

  /** Cumulative token count */
  tokenCount?: number;
}

/**
 * Single embedding response
 */
export interface EmbeddingResponse {
  /** Embedding vector */
  vector: number[];

  /** Vector dimensions */
  dimensions: number;

  /** Model used */
  model: string;

  /** Token usage */
  usage: TokenUsage;

  /** Processing latency */
  latencyMs: number;
}

/**
 * Batch embedding response
 */
export interface BatchEmbeddingResponse {
  /** Embedding results */
  embeddings: BatchEmbeddingResult[];

  /** Vector dimensions */
  dimensions: number;

  /** Model used */
  model: string;

  /** Total token usage */
  usage: TokenUsage;

  /** Success count */
  successCount: number;

  /** Failure count */
  failureCount: number;

  /** Total processing latency */
  latencyMs: number;
}

/**
 * Single result in batch
 */
export interface BatchEmbeddingResult {
  /** Item ID */
  id: string;

  /** Embedding vector (null if failed) */
  vector: number[] | null;

  /** Error message if failed */
  error?: string;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  /** Input/prompt tokens */
  inputTokens: number;

  /** Output/completion tokens */
  outputTokens: number;

  /** Total tokens */
  totalTokens: number;
}

/**
 * Finish reasons
 */
export type FinishReason =
  | 'STOP' // Natural completion
  | 'MAX_TOKENS' // Hit token limit
  | 'SAFETY' // Blocked by safety
  | 'RECITATION' // Blocked for recitation
  | 'OTHER'; // Other reason

/**
 * Safety rating
 */
export interface SafetyRating {
  /** Safety category */
  category: SafetyCategory;

  /** Probability level */
  probability: SafetyProbability;

  /** Whether blocked */
  blocked: boolean;
}

export type SafetyCategory =
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT';

export type SafetyProbability = 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
