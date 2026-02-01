# Vertex AI Client Package Specification

## Document Information

| Field          | Value                       |
| -------------- | --------------------------- |
| Version        | 1.0                         |
| Created        | 2026                        |
| Status         | Implementation Ready        |
| Package Name   | `@rates/vertex-ai-client`   |
| Location       | `packages/vertex-ai-client` |
| Parent Project | Rates Monorepo              |

---

## 1. Package Overview

### 1.1 Purpose

The Vertex AI Client is an **internal TypeScript library** that provides a simplified, type-safe interface for interacting with Google Cloud Vertex AI services. It abstracts the complexity of the official SDK, implements retry logic, handles error mapping, and provides utilities for token estimation and prompt management.

### 1.2 Problem Statement

Direct usage of the `@google-cloud/aiplatform` SDK presents challenges:

- Complex API surface with many configuration options
- No built-in retry logic for transient failures
- Raw error responses require mapping to application errors
- Token counting requires separate implementation
- Prompt template management not included
- Type definitions are verbose and hard to work with

The Vertex AI Client solves this by:

- Providing a simplified, opinionated API surface
- Implementing automatic retry with exponential backoff
- Mapping Vertex AI errors to typed application errors
- Including token estimation utilities
- Supporting prompt templates with variable substitution
- Exposing clean TypeScript interfaces

### 1.3 Design Principles

| Principle                   | Description                                  |
| --------------------------- | -------------------------------------------- |
| **Single Responsibility**   | Only handles Vertex AI communication         |
| **No Side Effects**         | No logging, no persistence, no HTTP servers  |
| **Configuration Injection** | All config passed in, no environment reading |
| **Error Transparency**      | Errors are typed and actionable              |
| **Testability**             | Easy to mock for consumer testing            |
| **Tree-Shakeable**          | Unused exports don't increase bundle size    |

### 1.4 Consumers

| Consumer       | Usage                                     |
| -------------- | ----------------------------------------- |
| `ai-service`   | Synchronous generation, embeddings        |
| `ai-processor` | Long-running generation, batch operations |

### 1.5 What This Package Does NOT Do

| Responsibility               | Owner                 |
| ---------------------------- | --------------------- |
| HTTP request handling        | Consumer applications |
| Authentication/authorization | Consumer applications |
| Rate limiting                | `ai-service`          |
| Caching                      | `ai-service`          |
| Persistence                  | Consumer applications |
| Logging                      | Consumer applications |
| Usage tracking               | Consumer applications |

---

## 2. Functional Requirements

### 2.1 Core Capabilities

#### 2.1.1 Text Generation

| Capability           | Description                   |
| -------------------- | ----------------------------- |
| Single generation    | Generate text from prompt     |
| Streaming generation | Stream tokens as generated    |
| System context       | Support system instructions   |
| Parameter control    | Temperature, topP, topK, etc. |
| Stop sequences       | Custom stop tokens            |
| Safety settings      | Configure content filtering   |

#### 2.1.2 Embeddings

| Capability       | Description                        |
| ---------------- | ---------------------------------- |
| Single embedding | Embed single text                  |
| Batch embedding  | Embed multiple texts efficiently   |
| Model selection  | Support different embedding models |

#### 2.1.3 Token Utilities

| Capability       | Description                      |
| ---------------- | -------------------------------- |
| Token estimation | Estimate tokens before API call  |
| Token counting   | Parse actual usage from response |
| Cost estimation  | Estimate cost based on tokens    |

#### 2.1.4 Prompt Management

| Capability            | Description                      |
| --------------------- | -------------------------------- |
| Template loading      | Load templates from definitions  |
| Variable substitution | Replace placeholders with values |
| Template validation   | Validate all variables provided  |

#### 2.1.5 Error Handling

| Capability           | Description                          |
| -------------------- | ------------------------------------ |
| Error classification | Transient vs permanent errors        |
| Error mapping        | Map SDK errors to typed errors       |
| Retry logic          | Automatic retry for transient errors |

### 2.2 Supported Models

| Model ID             | Type       | Use Case                        |
| -------------------- | ---------- | ------------------------------- |
| `gemini-2.0-flash`   | Generation | Fast, cost-effective generation |
| `gemini-2.0-pro`     | Generation | Complex reasoning tasks         |
| `gemini-1.5-flash`   | Generation | Legacy support                  |
| `gemini-1.5-pro`     | Generation | Legacy support                  |
| `text-embedding-005` | Embedding  | Text embeddings                 |
| `text-embedding-004` | Embedding  | Legacy embedding support        |

### 2.3 Non-Goals

- WebSocket/real-time connections (use streaming instead)
- Image/video/audio generation (text only)
- Model fine-tuning operations
- Model deployment management
- Batch prediction jobs (different API)

---

## 3. Package Structure

### 3.1 Directory Layout

```
packages/vertex-ai-client/
├── src/
│   ├── index.ts                    # Public exports
│   │
│   ├── client/
│   │   ├── vertex-client.ts        # Main client class
│   │   ├── generation-client.ts    # Text generation operations
│   │   ├── embedding-client.ts     # Embedding operations
│   │   └── streaming-client.ts     # Streaming generation
│   │
│   ├── config/
│   │   ├── client-config.ts        # Client configuration
│   │   ├── model-config.ts         # Model definitions
│   │   └── defaults.ts             # Default values
│   │
│   ├── types/
│   │   ├── index.ts                # Type exports
│   │   ├── config.types.ts         # Configuration types
│   │   ├── request.types.ts        # Request types
│   │   ├── response.types.ts       # Response types
│   │   ├── model.types.ts          # Model types
│   │   └── error.types.ts          # Error types
│   │
│   ├── errors/
│   │   ├── index.ts                # Error exports
│   │   ├── vertex-error.ts         # Base error class
│   │   ├── error-codes.ts          # Error code definitions
│   │   └── error-mapper.ts         # SDK error mapping
│   │
│   ├── retry/
│   │   ├── retry-handler.ts        # Retry logic
│   │   └── retry-config.ts         # Retry configuration
│   │
│   ├── prompts/
│   │   ├── template-engine.ts      # Template processing
│   │   ├── template-loader.ts      # Template loading
│   │   └── templates/              # Built-in templates
│   │       ├── index.ts
│   │       ├── summarization.ts
│   │       ├── classification.ts
│   │       └── extraction.ts
│   │
│   ├── utils/
│   │   ├── token-counter.ts        # Token estimation
│   │   ├── cost-calculator.ts      # Cost estimation
│   │   ├── response-parser.ts      # Response parsing
│   │   └── validators.ts           # Input validation
│   │
│   └── constants/
│       ├── models.ts               # Model constants
│       ├── limits.ts               # API limits
│       └── pricing.ts              # Pricing constants
│
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
└── README.md
```

### 3.2 Public Exports

```typescript
// packages/vertex-ai-client/src/index.ts

// Main client
export { VertexAIClient } from './client/vertex-client';
export { GenerationClient } from './client/generation-client';
export { EmbeddingClient } from './client/embedding-client';

// Configuration
export { createClientConfig } from './config/client-config';
export { ModelConfig, getModelConfig } from './config/model-config';

// Types
export type {
  // Config
  VertexClientConfig,
  GenerationConfig,
  EmbeddingConfig,

  // Requests
  GenerationRequest,
  StreamingGenerationRequest,
  EmbeddingRequest,
  BatchEmbeddingRequest,

  // Responses
  GenerationResponse,
  StreamingChunk,
  EmbeddingResponse,
  BatchEmbeddingResponse,

  // Common
  GenerationParameters,
  SafetySettings,
  UsageMetadata,
  TokenUsage,

  // Models
  ModelId,
  ModelInfo,
} from './types';

// Errors
export {
  VertexAIError,
  TransientError,
  PermanentError,
  ValidationError,
  SafetyBlockError,
  QuotaExceededError,
  ModelUnavailableError,
  TimeoutError,
} from './errors';
export { VertexErrorCode } from './errors/error-codes';

// Utilities
export { TokenCounter } from './utils/token-counter';
export { CostCalculator } from './utils/cost-calculator';

// Prompts
export { TemplateEngine } from './prompts/template-engine';
export { loadTemplate, BuiltInTemplate } from './prompts/template-loader';

// Constants
export { MODELS, DEFAULT_MODEL } from './constants/models';
export { MODEL_LIMITS } from './constants/limits';
```

---

## 4. Type Definitions

### 4.1 Configuration Types

```typescript
// src/types/config.types.ts

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
```

### 4.2 Request Types

```typescript
// src/types/request.types.ts

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
  onError?: (error: VertexAIError) => void;
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
 * Embedding task types
 */
export type EmbeddingTaskType =
  | 'RETRIEVAL_QUERY'
  | 'RETRIEVAL_DOCUMENT'
  | 'SEMANTIC_SIMILARITY'
  | 'CLASSIFICATION'
  | 'CLUSTERING';

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
```

### 4.3 Response Types

```typescript
// src/types/response.types.ts

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
```

### 4.4 Model Types

```typescript
// src/types/model.types.ts

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
```

### 4.5 Error Types

```typescript
// src/types/error.types.ts

/**
 * Error classification
 */
export type ErrorClassification = 'transient' | 'permanent';

/**
 * Vertex AI error codes
 */
export enum VertexErrorCode {
  // Transient errors (retryable)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DEADLINE_EXCEEDED = 'DEADLINE_EXCEEDED',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Permanent errors (not retryable)
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  INVALID_MODEL = 'INVALID_MODEL',
  SAFETY_BLOCKED = 'SAFETY_BLOCKED',
  RECITATION_BLOCKED = 'RECITATION_BLOCKED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',

  // Client errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error details structure
 */
export interface VertexErrorDetails {
  /** Error code */
  code: VertexErrorCode;

  /** Error message */
  message: string;

  /** Error classification */
  classification: ErrorClassification;

  /** Whether retryable */
  retryable: boolean;

  /** Suggested retry delay (ms) */
  retryAfterMs?: number;

  /** Original error from SDK */
  cause?: Error;

  /** Additional context */
  context?: Record<string, unknown>;
}
```

---

## 5. Core Classes

### 5.1 VertexAIClient

**Purpose:** Main entry point for all Vertex AI operations

**Responsibilities:**

- Initialize SDK connection
- Manage sub-clients (generation, embedding)
- Provide unified configuration
- Handle client lifecycle

**Public Interface:**

```typescript
class VertexAIClient {
  /**
   * Create a new Vertex AI client
   */
  constructor(config: VertexClientConfig);

  /**
   * Get generation client for text operations
   */
  readonly generation: GenerationClient;

  /**
   * Get embedding client for embedding operations
   */
  readonly embedding: EmbeddingClient;

  /**
   * Get current configuration
   */
  readonly config: Readonly<VertexClientConfig>;

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean;

  /**
   * Get model information
   */
  getModelInfo(modelId: ModelId | EmbeddingModelId): ModelInfo;

  /**
   * List available models
   */
  listModels(type?: 'generation' | 'embedding'): ModelInfo[];
}
```

**Usage Example:**

```typescript
const client = new VertexAIClient({
  projectId: 'rates-production',
  location: 'us-central1',
  defaultModel: 'gemini-2.0-flash',
  timeout: 30000,
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
});

// Use generation client
const response = await client.generation.generate({
  prompt: 'Hello, world!',
});

// Use embedding client
const embedding = await client.embedding.embed({
  text: 'Sample text',
});
```

### 5.2 GenerationClient

**Purpose:** Handle all text generation operations

**Responsibilities:**

- Synchronous text generation
- Streaming text generation
- Parameter validation
- Response parsing

**Public Interface:**

```typescript
class GenerationClient {
  /**
   * Generate text synchronously
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse>;

  /**
   * Generate text with streaming
   */
  async generateStream(
    request: StreamingGenerationRequest
  ): Promise<GenerationResponse>;

  /**
   * Estimate tokens for a prompt
   */
  estimateTokens(text: string, model?: ModelId): number;

  /**
   * Estimate cost for a request
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model?: ModelId
  ): CostEstimate;

  /**
   * Validate generation parameters
   */
  validateParameters(
    params: GenerationParameters,
    model?: ModelId
  ): ValidationResult;
}
```

**Usage Example:**

```typescript
// Simple generation
const response = await client.generation.generate({
  prompt: 'Explain quantum computing in simple terms.',
  parameters: {
    temperature: 0.7,
    maxOutputTokens: 1024,
  },
});

console.log(response.content);
console.log(`Tokens used: ${response.usage.totalTokens}`);

// Streaming generation
await client.generation.generateStream({
  prompt: 'Write a short story.',
  onChunk: (chunk) => {
    process.stdout.write(chunk.content);
  },
  onComplete: (response) => {
    console.log(`\nTotal tokens: ${response.usage.totalTokens}`);
  },
});
```

### 5.3 EmbeddingClient

**Purpose:** Handle all embedding operations

**Responsibilities:**

- Single text embedding
- Batch text embedding
- Batch progress reporting
- Error handling for partial failures

**Public Interface:**

```typescript
class EmbeddingClient {
  /**
   * Embed single text
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Embed multiple texts in batch
   */
  async embedBatch(
    request: BatchEmbeddingRequest
  ): Promise<BatchEmbeddingResponse>;

  /**
   * Get embedding dimensions for a model
   */
  getDimensions(model?: EmbeddingModelId): number;

  /**
   * Estimate tokens for embedding
   */
  estimateTokens(text: string): number;
}
```

**Usage Example:**

```typescript
// Single embedding
const embedding = await client.embedding.embed({
  text: 'Sample text for embedding',
  taskType: 'SEMANTIC_SIMILARITY',
});

console.log(`Dimensions: ${embedding.dimensions}`);
console.log(`Vector length: ${embedding.vector.length}`);

// Batch embedding
const batchResult = await client.embedding.embedBatch({
  items: [
    { id: '1', text: 'First document' },
    { id: '2', text: 'Second document' },
    { id: '3', text: 'Third document' },
  ],
  batchSize: 50,
  continueOnError: true,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  },
});

console.log(`Success: ${batchResult.successCount}`);
console.log(`Failed: ${batchResult.failureCount}`);
```

---

## 6. Error Handling

### 6.1 Error Class Hierarchy

```
VertexAIError (base)
├── TransientError (retryable)
│   ├── ServiceUnavailableError
│   ├── TimeoutError
│   ├── QuotaExceededError
│   └── InternalError
│
└── PermanentError (not retryable)
    ├── ValidationError
    ├── SafetyBlockError
    ├── RecitationBlockError
    ├── InvalidModelError
    ├── PermissionDeniedError
    └── ConfigurationError
```

### 6.2 Base Error Class

```typescript
// src/errors/vertex-error.ts

export abstract class VertexAIError extends Error {
  /** Error code */
  abstract readonly code: VertexErrorCode;

  /** Error classification */
  abstract readonly classification: ErrorClassification;

  /** Whether error is retryable */
  abstract readonly retryable: boolean;

  /** Suggested retry delay */
  readonly retryAfterMs?: number;

  /** Original cause */
  readonly cause?: Error;

  /** Additional context */
  readonly context?: Record<string, unknown>;

  constructor(message: string, options?: VertexErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    this.retryAfterMs = options?.retryAfterMs;
    this.cause = options?.cause;
    this.context = options?.context;
  }

  /** Convert to plain object for logging */
  toJSON(): VertexErrorDetails {
    return {
      code: this.code,
      message: this.message,
      classification: this.classification,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      context: this.context,
    };
  }
}
```

### 6.3 Specific Error Classes

```typescript
// Transient errors
export class ServiceUnavailableError extends VertexAIError {
  readonly code = VertexErrorCode.SERVICE_UNAVAILABLE;
  readonly classification = 'transient';
  readonly retryable = true;
}

export class TimeoutError extends VertexAIError {
  readonly code = VertexErrorCode.DEADLINE_EXCEEDED;
  readonly classification = 'transient';
  readonly retryable = true;
}

export class QuotaExceededError extends VertexAIError {
  readonly code = VertexErrorCode.RESOURCE_EXHAUSTED;
  readonly classification = 'transient';
  readonly retryable = true;
}

// Permanent errors
export class ValidationError extends VertexAIError {
  readonly code = VertexErrorCode.VALIDATION_ERROR;
  readonly classification = 'permanent';
  readonly retryable = false;

  /** Validation failures */
  readonly validationErrors: ValidationFailure[];
}

export class SafetyBlockError extends VertexAIError {
  readonly code = VertexErrorCode.SAFETY_BLOCKED;
  readonly classification = 'permanent';
  readonly retryable = false;

  /** Safety ratings that triggered block */
  readonly safetyRatings: SafetyRating[];

  /** Categories that were blocked */
  readonly blockedCategories: SafetyCategory[];
}

export class InvalidModelError extends VertexAIError {
  readonly code = VertexErrorCode.INVALID_MODEL;
  readonly classification = 'permanent';
  readonly retryable = false;

  /** Requested model */
  readonly requestedModel: string;

  /** Available models */
  readonly availableModels: string[];
}
```

### 6.4 Error Mapper

**Purpose:** Map SDK errors to typed errors

```typescript
// src/errors/error-mapper.ts

export class ErrorMapper {
  /**
   * Map SDK error to VertexAIError
   */
  static map(error: unknown): VertexAIError {
    // Handle Google Cloud SDK errors
    if (isGoogleCloudError(error)) {
      return this.mapGoogleCloudError(error);
    }

    // Handle network errors
    if (isNetworkError(error)) {
      return new ServiceUnavailableError(
        'Network error communicating with Vertex AI',
        { cause: error as Error }
      );
    }

    // Handle timeout errors
    if (isTimeoutError(error)) {
      return new TimeoutError('Request timed out', { cause: error as Error });
    }

    // Unknown error
    return new VertexAIError(
      error instanceof Error ? error.message : 'Unknown error',
      {
        cause: error instanceof Error ? error : undefined,
        code: VertexErrorCode.UNKNOWN,
      }
    );
  }

  private static mapGoogleCloudError(error: GoogleCloudError): VertexAIError {
    switch (error.code) {
      case 'UNAVAILABLE':
        return new ServiceUnavailableError(error.message, { cause: error });

      case 'DEADLINE_EXCEEDED':
        return new TimeoutError(error.message, { cause: error });

      case 'RESOURCE_EXHAUSTED':
        return new QuotaExceededError(error.message, {
          cause: error,
          retryAfterMs: this.extractRetryAfter(error),
        });

      case 'INVALID_ARGUMENT':
        return new ValidationError(error.message, { cause: error });

      case 'PERMISSION_DENIED':
        return new PermissionDeniedError(error.message, { cause: error });

      default:
        return new InternalError(error.message, { cause: error });
    }
  }
}
```

---

## 7. Retry Logic

### 7.1 Retry Handler

**Purpose:** Implement automatic retry with exponential backoff

```typescript
// src/retry/retry-handler.ts

export class RetryHandler {
  constructor(private config: RetryConfig) {}

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, context?: RetryContext): Promise<T> {
    let lastError: VertexAIError | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const vertexError = ErrorMapper.map(error);
        lastError = vertexError;

        // Don't retry permanent errors
        if (!vertexError.retryable) {
          throw vertexError;
        }

        // Don't retry if max attempts reached
        if (attempt === this.config.maxRetries) {
          throw vertexError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, vertexError);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, error: VertexAIError): number {
    // Use server-suggested delay if available
    if (error.retryAfterMs) {
      return error.retryAfterMs;
    }

    // Calculate exponential backoff
    const exponentialDelay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt);

    // Apply max delay cap
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);

    // Apply jitter
    const jitter = cappedDelay * this.config.jitterFactor * Math.random();

    return Math.floor(cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 7.2 Default Retry Configuration

```typescript
// src/retry/retry-config.ts

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 500,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelayMs: 2000,
  maxDelayMs: 10000,
  backoffMultiplier: 1.5,
  jitterFactor: 0.1,
};
```

---

## 8. Token Utilities

### 8.1 Token Counter

**Purpose:** Estimate tokens before making API calls

```typescript
// src/utils/token-counter.ts

export class TokenCounter {
  /**
   * Estimate tokens for text
   * Uses approximation: ~4 characters per token for English
   */
  static estimate(text: string): number {
    if (!text) return 0;

    // More accurate estimation considering:
    // - Whitespace tokenization
    // - Punctuation as separate tokens
    // - Numbers and special characters

    const words = text.split(/\s+/).filter((w) => w.length > 0);
    let tokenCount = 0;

    for (const word of words) {
      // Base: each word is at least 1 token
      tokenCount += 1;

      // Long words get split into subwords
      if (word.length > 10) {
        tokenCount += Math.floor(word.length / 5);
      }

      // Punctuation often separate tokens
      const punctuation = word.match(/[.,!?;:'"()\[\]{}]/g);
      if (punctuation) {
        tokenCount += punctuation.length;
      }
    }

    return tokenCount;
  }

  /**
   * Estimate tokens for generation request
   */
  static estimateRequest(request: GenerationRequest): TokenEstimate {
    let inputTokens = this.estimate(request.prompt);

    if (request.systemContext) {
      inputTokens += this.estimate(request.systemContext);
    }

    const maxOutputTokens = request.parameters?.maxOutputTokens ?? 1024;

    return {
      inputTokens,
      estimatedOutputTokens: maxOutputTokens,
      totalEstimate: inputTokens + maxOutputTokens,
    };
  }

  /**
   * Check if request exceeds model limits
   */
  static checkLimits(
    inputTokens: number,
    maxOutputTokens: number,
    model: ModelId
  ): LimitCheckResult {
    const modelInfo = getModelConfig(model);

    const issues: string[] = [];

    if (inputTokens > modelInfo.maxInputTokens) {
      issues.push(
        `Input tokens (${inputTokens}) exceed model limit (${modelInfo.maxInputTokens})`
      );
    }

    if (maxOutputTokens > modelInfo.maxOutputTokens!) {
      issues.push(
        `Output tokens (${maxOutputTokens}) exceed model limit (${modelInfo.maxOutputTokens})`
      );
    }

    const totalTokens = inputTokens + maxOutputTokens;
    const contextWindow = modelInfo.maxInputTokens + modelInfo.maxOutputTokens!;

    if (totalTokens > contextWindow) {
      issues.push(
        `Total tokens (${totalTokens}) exceed context window (${contextWindow})`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export interface TokenEstimate {
  inputTokens: number;
  estimatedOutputTokens: number;
  totalEstimate: number;
}

export interface LimitCheckResult {
  valid: boolean;
  issues: string[];
}
```

### 8.2 Cost Calculator

**Purpose:** Estimate API costs

```typescript
// src/utils/cost-calculator.ts

export class CostCalculator {
  /**
   * Calculate cost for token usage
   */
  static calculate(
    usage: TokenUsage,
    model: ModelId | EmbeddingModelId
  ): CostEstimate {
    const modelInfo = getModelConfig(model);

    const inputCost = (usage.inputTokens / 1000) * modelInfo.inputPricePer1K;
    const outputCost = (usage.outputTokens / 1000) * modelInfo.outputPricePer1K;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      currency: 'USD',
      model,
    };
  }

  /**
   * Estimate cost before making request
   */
  static estimate(
    inputTokens: number,
    estimatedOutputTokens: number,
    model: ModelId
  ): CostEstimate {
    return this.calculate(
      {
        inputTokens,
        outputTokens: estimatedOutputTokens,
        totalTokens: inputTokens + estimatedOutputTokens,
      },
      model
    );
  }
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  model: string;
}
```

---

## 9. Prompt Templates

### 9.1 Template Engine

**Purpose:** Process prompt templates with variable substitution

```typescript
// src/prompts/template-engine.ts

export class TemplateEngine {
  /**
   * Process template with variables
   */
  static process(
    template: PromptTemplate,
    variables: TemplateVariables
  ): string {
    // Validate all required variables provided
    const validation = this.validate(template, variables);
    if (!validation.valid) {
      throw new ValidationError(
        `Template validation failed: ${validation.errors.join(', ')}`
      );
    }

    let result = template.template;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replaceAll(placeholder, String(value));
    }

    return result;
  }

  /**
   * Validate template variables
   */
  static validate(
    template: PromptTemplate,
    variables: TemplateVariables
  ): TemplateValidationResult {
    const errors: string[] = [];

    // Check required variables
    for (const varDef of template.variables) {
      if (varDef.required && !(varDef.name in variables)) {
        errors.push(`Missing required variable: ${varDef.name}`);
      }

      // Type checking
      if (varDef.name in variables) {
        const value = variables[varDef.name];
        if (!this.checkType(value, varDef.type)) {
          errors.push(
            `Variable ${varDef.name} has wrong type: expected ${varDef.type}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract variable placeholders from template string
   */
  static extractVariables(templateString: string): string[] {
    const matches = templateString.match(/\{\{(\w+)\}\}/g) || [];
    return matches.map((m) => m.slice(2, -2));
  }

  private static checkType(
    value: unknown,
    expectedType: VariableType
  ): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }
}

export interface PromptTemplate {
  /** Template identifier */
  id: string;

  /** Template name */
  name: string;

  /** Template description */
  description?: string;

  /** Template string with {{variable}} placeholders */
  template: string;

  /** Variable definitions */
  variables: VariableDefinition[];

  /** Recommended parameters */
  recommendedParameters?: Partial<GenerationParameters>;
}

export interface VariableDefinition {
  /** Variable name */
  name: string;

  /** Variable type */
  type: VariableType;

  /** Is required */
  required: boolean;

  /** Description */
  description?: string;

  /** Default value */
  defaultValue?: unknown;
}

export type VariableType = 'string' | 'number' | 'boolean' | 'array';

export type TemplateVariables = Record<string, unknown>;

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}
```

### 9.2 Built-in Templates

```typescript
// src/prompts/templates/summarization.ts

export const SUMMARIZATION_TEMPLATES: Record<string, PromptTemplate> = {
  brief: {
    id: 'summarization-brief',
    name: 'Brief Summary',
    description: 'Generate a brief summary of the content',
    template: `Summarize the following content in 2-3 sentences:

{{content}}

Summary:`,
    variables: [{ name: 'content', type: 'string', required: true }],
    recommendedParameters: {
      temperature: 0.3,
      maxOutputTokens: 256,
    },
  },

  detailed: {
    id: 'summarization-detailed',
    name: 'Detailed Summary',
    description: 'Generate a detailed summary with key points',
    template: `Provide a detailed summary of the following content. Include:
- Main topic and thesis
- Key points and arguments
- Important details and examples
- Conclusion

Content:
{{content}}

Detailed Summary:`,
    variables: [{ name: 'content', type: 'string', required: true }],
    recommendedParameters: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  },

  bullets: {
    id: 'summarization-bullets',
    name: 'Bullet Point Summary',
    description: 'Generate a bullet-point summary',
    template: `Summarize the following content as {{maxBullets}} bullet points:

{{content}}

Bullet Points:`,
    variables: [
      { name: 'content', type: 'string', required: true },
      { name: 'maxBullets', type: 'number', required: false, defaultValue: 5 },
    ],
    recommendedParameters: {
      temperature: 0.3,
      maxOutputTokens: 512,
    },
  },
};
```

```typescript
// src/prompts/templates/classification.ts

export const CLASSIFICATION_TEMPLATES: Record<string, PromptTemplate> = {
  single: {
    id: 'classification-single',
    name: 'Single Label Classification',
    description: 'Classify content into one category',
    template: `Classify the following text into exactly one of these categories: {{categories}}

Text: {{text}}

Respond with only the category name, nothing else.

Category:`,
    variables: [
      { name: 'text', type: 'string', required: true },
      { name: 'categories', type: 'string', required: true },
    ],
    recommendedParameters: {
      temperature: 0.0,
      maxOutputTokens: 50,
    },
  },

  multiLabel: {
    id: 'classification-multi',
    name: 'Multi-Label Classification',
    description: 'Classify content into multiple categories',
    template: `Classify the following text. Select all applicable categories from: {{categories}}

Text: {{text}}

Respond with applicable categories as a comma-separated list.

Categories:`,
    variables: [
      { name: 'text', type: 'string', required: true },
      { name: 'categories', type: 'string', required: true },
    ],
    recommendedParameters: {
      temperature: 0.0,
      maxOutputTokens: 100,
    },
  },
};
```

### 9.3 Template Loader

```typescript
// src/prompts/template-loader.ts

export type BuiltInTemplate =
  | 'summarization-brief'
  | 'summarization-detailed'
  | 'summarization-bullets'
  | 'classification-single'
  | 'classification-multi'
  | 'extraction-entities'
  | 'extraction-keywords';

/**
 * Load a built-in template by ID
 */
export function loadTemplate(templateId: BuiltInTemplate): PromptTemplate {
  const allTemplates = {
    ...SUMMARIZATION_TEMPLATES,
    ...CLASSIFICATION_TEMPLATES,
    ...EXTRACTION_TEMPLATES,
  };

  const template = Object.values(allTemplates).find((t) => t.id === templateId);

  if (!template) {
    throw new ValidationError(`Template not found: ${templateId}`);
  }

  return template;
}

/**
 * List all available templates
 */
export function listTemplates(): PromptTemplate[] {
  return [
    ...Object.values(SUMMARIZATION_TEMPLATES),
    ...Object.values(CLASSIFICATION_TEMPLATES),
    ...Object.values(EXTRACTION_TEMPLATES),
  ];
}
```

---

## 10. Constants

### 10.1 Model Constants

```typescript
// src/constants/models.ts

export const MODELS: Record<ModelId | EmbeddingModelId, ModelInfo> = {
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    type: 'generation',
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    inputPricePer1K: 0.00015,
    outputPricePer1K: 0.0006,
    supportsStreaming: true,
    supportsSystemInstruction: true,
  },
  'gemini-2.0-pro': {
    id: 'gemini-2.0-pro',
    displayName: 'Gemini 2.0 Pro',
    type: 'generation',
    maxInputTokens: 2097152,
    maxOutputTokens: 8192,
    inputPricePer1K: 0.00125,
    outputPricePer1K: 0.005,
    supportsStreaming: true,
    supportsSystemInstruction: true,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    type: 'generation',
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    inputPricePer1K: 0.000075,
    outputPricePer1K: 0.0003,
    supportsStreaming: true,
    supportsSystemInstruction: true,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    type: 'generation',
    maxInputTokens: 2097152,
    maxOutputTokens: 8192,
    inputPricePer1K: 0.00125,
    outputPricePer1K: 0.005,
    supportsStreaming: true,
    supportsSystemInstruction: true,
  },
  'text-embedding-005': {
    id: 'text-embedding-005',
    displayName: 'Text Embedding 005',
    type: 'embedding',
    maxInputTokens: 2048,
    embeddingDimensions: 768,
    inputPricePer1K: 0.00001,
    outputPricePer1K: 0,
    supportsStreaming: false,
    supportsSystemInstruction: false,
  },
  'text-embedding-004': {
    id: 'text-embedding-004',
    displayName: 'Text Embedding 004',
    type: 'embedding',
    maxInputTokens: 2048,
    embeddingDimensions: 768,
    inputPricePer1K: 0.00001,
    outputPricePer1K: 0,
    supportsStreaming: false,
    supportsSystemInstruction: false,
  },
};

export const DEFAULT_MODEL: ModelId = 'gemini-2.0-flash';
export const DEFAULT_EMBEDDING_MODEL: EmbeddingModelId = 'text-embedding-005';
```

### 10.2 Limit Constants

```typescript
// src/constants/limits.ts

export const MODEL_LIMITS = {
  /** Default generation parameters */
  defaultParameters: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
  },

  /** Parameter ranges */
  parameterRanges: {
    temperature: { min: 0.0, max: 2.0 },
    topP: { min: 0.0, max: 1.0 },
    topK: { min: 1, max: 100 },
    maxOutputTokens: { min: 1, max: 8192 },
    stopSequences: { maxCount: 5 },
  },

  /** Batch limits */
  batchLimits: {
    maxEmbeddingBatchSize: 100,
    defaultEmbeddingBatchSize: 50,
  },

  /** Request limits */
  requestLimits: {
    maxPromptLength: 1000000, // characters
    maxSystemContextLength: 100000, // characters
  },
} as const;
```

---

## 11. Configuration

### 11.1 Client Configuration Factory

```typescript
// src/config/client-config.ts

export function createClientConfig(
  options: VertexClientConfigOptions
): VertexClientConfig {
  // Validate required fields
  if (!options.projectId) {
    throw new ConfigurationError('projectId is required');
  }
  if (!options.location) {
    throw new ConfigurationError('location is required');
  }

  return {
    projectId: options.projectId,
    location: options.location,
    defaultModel: options.defaultModel ?? DEFAULT_MODEL,
    timeout: options.timeout ?? 30000,
    retry: {
      ...DEFAULT_RETRY_CONFIG,
      ...options.retry,
    },
    defaultParameters: {
      ...MODEL_LIMITS.defaultParameters,
      ...options.defaultParameters,
    },
    defaultSafetySettings: options.defaultSafetySettings,
  };
}

export interface VertexClientConfigOptions {
  projectId: string;
  location: string;
  defaultModel?: ModelId;
  timeout?: number;
  retry?: Partial<RetryConfig>;
  defaultParameters?: Partial<GenerationParameters>;
  defaultSafetySettings?: SafetySettings;
}
```

### 11.2 Model Configuration

```typescript
// src/config/model-config.ts

export function getModelConfig(modelId: ModelId | EmbeddingModelId): ModelInfo {
  const config = MODELS[modelId];
  if (!config) {
    throw new InvalidModelError(`Unknown model: ${modelId}`, {
      context: {
        requestedModel: modelId,
        availableModels: Object.keys(MODELS),
      },
    });
  }
  return config;
}

export function isGenerationModel(modelId: string): modelId is ModelId {
  const config = MODELS[modelId as ModelId];
  return config?.type === 'generation';
}

export function isEmbeddingModel(modelId: string): modelId is EmbeddingModelId {
  const config = MODELS[modelId as EmbeddingModelId];
  return config?.type === 'embedding';
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

| Component        | Coverage Target | Focus Areas                        |
| ---------------- | --------------- | ---------------------------------- |
| VertexAIClient   | 85%             | Initialization, configuration      |
| GenerationClient | 90%             | Request building, response parsing |
| EmbeddingClient  | 90%             | Single and batch operations        |
| ErrorMapper      | 95%             | All error types mapped             |
| RetryHandler     | 95%             | Backoff calculation, retry logic   |
| TokenCounter     | 90%             | Estimation accuracy                |
| TemplateEngine   | 95%             | Variable substitution, validation  |

### 12.2 Test Approach

**Unit Tests (No External Dependencies):**

- Mock `@google-cloud/aiplatform` SDK
- Test all public methods
- Test error scenarios
- Test edge cases

**Integration Tests (Optional, Requires GCP):**

- Real API calls to Vertex AI
- Verify response parsing
- Verify error handling

### 12.3 Test Files Structure

```
packages/vertex-ai-client/
├── src/
│   └── ...
├── __tests__/
│   ├── client/
│   │   ├── vertex-client.test.ts
│   │   ├── generation-client.test.ts
│   │   └── embedding-client.test.ts
│   ├── errors/
│   │   ├── error-mapper.test.ts
│   │   └── vertex-error.test.ts
│   ├── retry/
│   │   └── retry-handler.test.ts
│   ├── prompts/
│   │   └── template-engine.test.ts
│   ├── utils/
│   │   ├── token-counter.test.ts
│   │   └── cost-calculator.test.ts
│   └── integration/
│       └── vertex-ai.integration.test.ts
├── __mocks__/
│   └── @google-cloud/
│       └── aiplatform.ts
└── vitest.config.ts
```

### 12.4 Mock Strategy

```typescript
// __mocks__/@google-cloud/aiplatform.ts

export const mockGenerateContent = vi.fn();
export const mockStreamGenerateContent = vi.fn();
export const mockEmbedContent = vi.fn();

export class GenerativeModel {
  generateContent = mockGenerateContent;
  generateContentStream = mockStreamGenerateContent;
}

export class VertexAI {
  getGenerativeModel = vi.fn(() => new GenerativeModel());
}

export function resetMocks() {
  mockGenerateContent.mockReset();
  mockStreamGenerateContent.mockReset();
  mockEmbedContent.mockReset();
}
```

---

## 13. Package Configuration

### 13.1 package.json

```json
{
  "name": "@rates/vertex-ai-client",
  "version": "1.0.0",
  "description": "Vertex AI client library for Rates platform",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@google-cloud/aiplatform": "^3.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "tsup": "^8.x",
    "typescript": "^5.x",
    "vitest": "^1.x"
  },
  "peerDependencies": {
    "zod": "^3.x"
  },
  "engines": {
    "node": ">=20"
  }
}
```

### 13.2 tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__", "__mocks__"]
}
```

### 13.3 tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: false,
  target: 'node20',
});
```

---

## 14. Usage Examples

### 14.1 Basic Generation

```typescript
import { VertexAIClient, createClientConfig } from '@rates/vertex-ai-client';

const client = new VertexAIClient(
  createClientConfig({
    projectId: 'rates-production',
    location: 'us-central1',
  })
);

const response = await client.generation.generate({
  prompt: 'Explain machine learning in simple terms.',
  systemContext: 'You are a helpful teacher explaining concepts to beginners.',
  parameters: {
    temperature: 0.7,
    maxOutputTokens: 1024,
  },
});

console.log(response.content);
console.log(`Tokens: ${response.usage.totalTokens}`);
```

### 14.2 Streaming Generation

```typescript
import { VertexAIClient } from '@rates/vertex-ai-client';

const response = await client.generation.generateStream({
  prompt: 'Write a short story about a robot.',
  onChunk: (chunk) => {
    process.stdout.write(chunk.content);
  },
  onComplete: (response) => {
    console.log(`\n\nDone! Used ${response.usage.totalTokens} tokens.`);
  },
  onError: (error) => {
    console.error('Stream error:', error.message);
  },
});
```

### 14.3 Batch Embeddings

```typescript
import { VertexAIClient } from '@rates/vertex-ai-client';

const result = await client.embedding.embedBatch({
  items: documents.map((doc) => ({ id: doc.id, text: doc.content })),
  batchSize: 50,
  continueOnError: true,
  onProgress: (progress) => {
    console.log(`Embedding progress: ${progress.percentage}%`);
  },
});

console.log(`Successfully embedded: ${result.successCount}`);
console.log(`Failed: ${result.failureCount}`);
```

### 14.4 Using Templates

```typescript
import {
  VertexAIClient,
  TemplateEngine,
  loadTemplate,
} from '@rates/vertex-ai-client';

// Load built-in template
const template = loadTemplate('summarization-bullets');

// Process template with variables
const prompt = TemplateEngine.process(template, {
  content: longDocument,
  maxBullets: 7,
});

// Generate with recommended parameters
const response = await client.generation.generate({
  prompt,
  parameters: template.recommendedParameters,
});

console.log(response.content);
```

### 14.5 Error Handling

```typescript
import {
  VertexAIClient,
  VertexAIError,
  SafetyBlockError,
  QuotaExceededError,
  ValidationError,
} from '@rates/vertex-ai-client';

try {
  const response = await client.generation.generate({
    prompt: userInput,
  });
  return response.content;
} catch (error) {
  if (error instanceof SafetyBlockError) {
    // Content was blocked by safety filters
    console.log('Blocked categories:', error.blockedCategories);
    return 'Your request could not be processed due to content restrictions.';
  }

  if (error instanceof QuotaExceededError) {
    // Quota exceeded, retry later
    console.log(`Retry after: ${error.retryAfterMs}ms`);
    throw error; // Let caller handle retry
  }

  if (error instanceof ValidationError) {
    // Invalid input
    console.log('Validation errors:', error.validationErrors);
    throw error;
  }

  if (error instanceof VertexAIError) {
    // Other Vertex AI error
    console.error(`Vertex AI error: ${error.code} - ${error.message}`);
    throw error;
  }

  // Unknown error
  throw error;
}
```

### 14.6 Token Estimation and Cost Calculation

```typescript
import {
  VertexAIClient,
  TokenCounter,
  CostCalculator,
} from '@rates/vertex-ai-client';

const prompt = 'A very long prompt...';
const systemContext = 'System instructions...';

// Estimate tokens before making request
const inputTokens =
  TokenCounter.estimate(prompt) + TokenCounter.estimate(systemContext);
const maxOutputTokens = 2048;

// Check model limits
const limitCheck = TokenCounter.checkLimits(
  inputTokens,
  maxOutputTokens,
  'gemini-2.0-flash'
);

if (!limitCheck.valid) {
  console.error('Token limit issues:', limitCheck.issues);
  throw new Error('Request exceeds model limits');
}

// Estimate cost
const costEstimate = CostCalculator.estimate(
  inputTokens,
  maxOutputTokens,
  'gemini-2.0-flash'
);

console.log(`Estimated cost: $${costEstimate.totalCost.toFixed(6)}`);

// Make request if cost is acceptable
if (costEstimate.totalCost < 0.01) {
  const response = await client.generation.generate({
    prompt,
    systemContext,
    parameters: { maxOutputTokens },
  });

  // Calculate actual cost
  const actualCost = CostCalculator.calculate(
    response.usage,
    'gemini-2.0-flash'
  );

  console.log(`Actual cost: $${actualCost.totalCost.toFixed(6)}`);
}
```

### 14.7 Custom Retry Configuration

```typescript
import {
  VertexAIClient,
  createClientConfig,
  AGGRESSIVE_RETRY_CONFIG,
} from '@rates/vertex-ai-client';

// For batch processing, use aggressive retry
const batchClient = new VertexAIClient(
  createClientConfig({
    projectId: 'rates-production',
    location: 'us-central1',
    timeout: 120000, // 2 minutes
    retry: {
      ...AGGRESSIVE_RETRY_CONFIG,
      maxRetries: 5,
    },
  })
);

// For interactive use, use shorter timeouts
const interactiveClient = new VertexAIClient(
  createClientConfig({
    projectId: 'rates-production',
    location: 'us-central1',
    timeout: 15000, // 15 seconds
    retry: {
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
  })
);
```

---

## 15. Integration Guidelines

### 15.1 Integration with AI Service

```typescript
// apps/ai-service/src/services/vertex.service.ts

import {
  VertexAIClient,
  createClientConfig,
  GenerationRequest,
  GenerationResponse,
  VertexAIError,
  TransientError,
} from '@rates/vertex-ai-client';

export class VertexService {
  private client: VertexAIClient;

  constructor(config: VertexServiceConfig) {
    this.client = new VertexAIClient(
      createClientConfig({
        projectId: config.projectId,
        location: config.location,
        defaultModel: config.defaultModel,
        timeout: config.timeout,
      })
    );
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Client handles retries internally
    return this.client.generation.generate(request);
  }

  async generateStream(
    request: GenerationRequest,
    onChunk: (chunk: string) => void
  ): Promise<GenerationResponse> {
    return this.client.generation.generateStream({
      ...request,
      onChunk: (chunk) => onChunk(chunk.content),
    });
  }

  // Expose error classification for caller
  isRetryableError(error: unknown): boolean {
    return error instanceof TransientError;
  }
}
```

### 15.2 Integration with AI Processor

```typescript
// apps/ai-processor/src/services/vertex-ai.service.ts

import {
  VertexAIClient,
  createClientConfig,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
  VertexAIError,
} from '@rates/vertex-ai-client';

export class VertexAIService {
  private client: VertexAIClient;

  constructor(config: VertexAIServiceConfig) {
    this.client = new VertexAIClient(
      createClientConfig({
        projectId: config.projectId,
        location: config.location,
        // Longer timeout for batch operations
        timeout: 300000, // 5 minutes
        retry: {
          maxRetries: 5,
          initialDelayMs: 2000,
          maxDelayMs: 60000,
          backoffMultiplier: 2,
          jitterFactor: 0.2,
        },
      })
    );
  }

  async embedBatch(
    items: Array<{ id: string; text: string }>,
    onProgress?: (progress: number) => void
  ): Promise<BatchEmbeddingResponse> {
    return this.client.embedding.embedBatch({
      items,
      batchSize: 50,
      continueOnError: true,
      onProgress: onProgress ? (p) => onProgress(p.percentage) : undefined,
    });
  }

  async generateLongContent(
    prompt: string,
    systemContext?: string
  ): Promise<string> {
    const response = await this.client.generation.generate({
      prompt,
      systemContext,
      model: 'gemini-2.0-pro', // Use Pro for long content
      parameters: {
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });

    return response.content;
  }
}
```

### 15.3 Dependency Injection Pattern

```typescript
// Recommended pattern for testability

// Interface for dependency injection
export interface IVertexClient {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  embedBatch(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse>;
}

// Production implementation
export class VertexClientAdapter implements IVertexClient {
  constructor(private client: VertexAIClient) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    return this.client.generation.generate(request);
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.client.embedding.embed(request);
  }

  async embedBatch(
    request: BatchEmbeddingRequest
  ): Promise<BatchEmbeddingResponse> {
    return this.client.embedding.embedBatch(request);
  }
}

// Mock implementation for testing
export class MockVertexClient implements IVertexClient {
  generateMock = vi.fn<[GenerationRequest], Promise<GenerationResponse>>();
  embedMock = vi.fn<[EmbeddingRequest], Promise<EmbeddingResponse>>();
  embedBatchMock = vi.fn<
    [BatchEmbeddingRequest],
    Promise<BatchEmbeddingResponse>
  >();

  generate = this.generateMock;
  embed = this.embedMock;
  embedBatch = this.embedBatchMock;
}
```

---

## 16. Performance Considerations

### 16.1 Memory Management

| Concern               | Mitigation                          |
| --------------------- | ----------------------------------- |
| Large responses       | Stream responses for large outputs  |
| Batch embeddings      | Process in configurable batch sizes |
| Response accumulation | Clear references after processing   |

### 16.2 Connection Management

| Aspect           | Specification                            |
| ---------------- | ---------------------------------------- |
| Connection reuse | SDK handles connection pooling           |
| Client lifecycle | Create once, reuse for multiple requests |
| Cleanup          | No explicit cleanup required             |

### 16.3 Timeout Recommendations

| Use Case               | Recommended Timeout |
| ---------------------- | ------------------- |
| Interactive generation | 15-30 seconds       |
| Batch processing       | 60-300 seconds      |
| Streaming              | 60-120 seconds      |
| Embeddings (single)    | 10 seconds          |
| Embeddings (batch)     | 5 minutes           |

---

## 17. Security Considerations

### 17.1 Credential Handling

| Aspect                | Requirement                          |
| --------------------- | ------------------------------------ |
| Credential source     | Application Default Credentials only |
| No credential storage | Package never stores credentials     |
| No credential logging | Never log tokens or keys             |

### 17.2 Input Sanitization

| Aspect               | Implementation         |
| -------------------- | ---------------------- |
| Prompt validation    | Max length enforcement |
| Parameter validation | Range checking         |
| Template injection   | Variables are escaped  |

### 17.3 Output Handling

| Aspect              | Implementation                      |
| ------------------- | ----------------------------------- |
| Response validation | Schema validation on responses      |
| Error sanitization  | No sensitive data in error messages |
| Safety ratings      | Always included in response         |

---

## 18. Versioning and Compatibility

### 18.1 Version Strategy

| Version Type  | When to Bump                       |
| ------------- | ---------------------------------- |
| Patch (0.0.x) | Bug fixes, documentation           |
| Minor (0.x.0) | New features, non-breaking changes |
| Major (x.0.0) | Breaking API changes               |

### 18.2 Breaking Change Policy

**Breaking changes include:**

- Removing public exports
- Changing method signatures
- Changing type definitions
- Changing error class hierarchy
- Changing default behavior

**Breaking changes require:**

- Major version bump
- Migration guide
- Deprecation period (when possible)

### 18.3 Compatibility Matrix

| Package Version | Node.js | @google-cloud/aiplatform | TypeScript |
| --------------- | ------- | ------------------------ | ---------- |
| 1.x             | ≥20     | ^3.x                     | ≥5.0       |

---

## 19. Success Criteria

### 19.1 Functional Success

- [ ] All generation operations work correctly
- [ ] All embedding operations work correctly
- [ ] Streaming delivers chunks properly
- [ ] Batch operations process all items
- [ ] Templates process variables correctly
- [ ] Errors are properly classified
- [ ] Retry logic works as specified

### 19.2 Quality Success

- [ ] Unit test coverage ≥ 85%
- [ ] All public APIs documented
- [ ] TypeScript strict mode passes
- [ ] No ESLint errors
- [ ] All examples run successfully

### 19.3 Integration Success

- [ ] AI Service integrates without issues
- [ ] AI Processor integrates without issues
- [ ] Mocking works for consumer tests
- [ ] Tree-shaking works (bundle size reasonable)

---

## 20. Out of Scope

| Item              | Reason                      |
| ----------------- | --------------------------- |
| HTTP client       | Consumers handle HTTP       |
| Logging           | Consumers implement logging |
| Caching           | AI Service responsibility   |
| Rate limiting     | AI Service responsibility   |
| Usage tracking    | AI Service responsibility   |
| Authentication    | Consumers handle auth       |
| Image/video/audio | Text-only scope             |
| Fine-tuning       | Different API               |
| Model management  | Different API               |

---

## 21. Future Considerations

### 21.1 Potential Enhancements

| Enhancement                 | Priority | Complexity |
| --------------------------- | -------- | ---------- |
| Function calling support    | Medium   | Medium     |
| Context caching             | Low      | Medium     |
| Grounding (Google Search)   | Low      | High       |
| Multi-modal (images)        | Low      | High       |
| Response format (JSON mode) | Medium   | Low        |

### 21.2 Model Updates

As new models become available:

1. Add to `MODELS` constant
2. Update `ModelId` type
3. Update pricing constants
4. Add integration tests
5. Update documentation

---

**Document End**

_This specification defines the `@rates/vertex-ai-client` package. Implementation should follow this document for package structure, API design, and behavior. Consumers (ai-service, ai-processor) should integrate according to the Integration Guidelines section._
