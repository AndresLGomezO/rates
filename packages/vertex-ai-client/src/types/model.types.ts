/**
 * Available generation models
 */
export type ModelId =
  | 'gemini-2.0-flash'
  | 'gemini-2.0-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro';

/**
 * Available embedding models
 */
export type EmbeddingModelId = 'text-embedding-005' | 'text-embedding-004';

/**
 * Model information
 */
export interface ModelInfo {
  /** Model identifier */
  id: ModelId | EmbeddingModelId;

  /** Display name */
  displayName: string;

  /** Model type */
  type: 'generation' | 'embedding';

  /** Maximum input tokens */
  maxInputTokens: number;

  /** Maximum output tokens (generation only) */
  maxOutputTokens?: number;

  /** Embedding dimensions (embedding only) */
  embeddingDimensions?: number;

  /** Input price per 1K tokens */
  inputPricePer1K: number;

  /** Output price per 1K tokens */
  outputPricePer1K: number;

  /** Supports streaming */
  supportsStreaming: boolean;

  /** Supports system instructions */
  supportsSystemInstruction: boolean;
}
