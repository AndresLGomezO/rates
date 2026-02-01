export interface VertexGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
}

export interface VertexRequest {
  model: string;
  prompt: string;
  systemContext?: string;
  config?: VertexGenerationConfig;
}

export interface VertexResponse {
  content: string;
  finishReason: string;
  tokenUsage: {
    input: number;
    output: number;
  };
  safetyRatings?: unknown[];
}

export interface EmbeddingRequest {
  model: string;
  items: Array<{ id: string; text: string }>;
  batchSize?: number;
}

export interface EmbeddingResponse {
  embeddings: Array<{
    id: string;
    vector: number[];
    error?: string;
  }>;
  tokenUsage?: {
    input: number;
    output: number;
  };
  dimensions?: number;
  successCount?: number;
  failureCount?: number;
}
