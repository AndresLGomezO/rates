export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GenerateResponse {
  requestId: string;
  content: string;
  model: string;
  finishReason: string;
  usage: TokenUsage;
  cached: boolean;
  latencyMs: number;
}

export interface EmbeddingObject {
  index: number;
  vector: number[];
}

export interface EmbedResponse {
  requestId: string;
  embeddings: EmbeddingObject[];
  model: string;
  dimensions: number;
}

export interface TaskResponse {
  taskId: string;
  status: string;
  type: string;
  createdAt: string;
  estimatedDurationSeconds?: number;
  statusUrl: string;
}

export interface TaskDetailResponse extends TaskResponse {
  completedAt?: string;
  failedAt?: string;
  progress?: number;
  result?: unknown;
  error?: string;
  usage?: TokenUsage;
}

export interface UsageStatsResponse {
  userId: string;
  period: string;
  usage: {
    requestCount: number;
    tokenInput: number;
    tokenOutput: number;
    tasksCreated: number;
    cacheHits: number;
  };
  limits: {
    requestsPerMinute: number;
    tokensPerDay: number;
  };
  quotaResetAt: string;
}
