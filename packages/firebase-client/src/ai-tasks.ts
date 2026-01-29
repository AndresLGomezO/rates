/**
 * AI Task Schemas
 *
 * Types and interfaces for the AI Async Processor application.
 */

// We define pure TS types here.
// If Zod schemas share the same structure, they should be compatible.
// Ideally, we might want to move Zod schemas here too if frontend validates them,
// BUT firebase-client package.json doesn't show 'zod' dependency.
// Adding 'zod' to firebase-client might be heavy if not already there, but useful.
// Checking package.json... dependencies: "firebase". devDependencies: "typescript", etc.
// The user asked to re-use libraries. 'zod' is in 'ai-processor' and likely 'app' (via other libs?).
// Let's stick to TS types first to avoid adding runtime deps to the client library unless necessary.

/**
 * Task Types supported by the processor
 */
export type AITaskType =
  | 'TEXT_GENERATION'
  | 'SUMMARIZATION'
  | 'BATCH_EMBEDDING'
  | 'DOCUMENT_QA'
  | 'BATCH_CLASSIFICATION'
  | 'MULTI_STEP_PIPELINE';

export type TaskPriority = 'low' | 'normal' | 'high';

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Text Generation Payload
 */
export interface TextGenerationPayload {
  prompt: string;
  systemContext?: string;
  parameters?: Record<string, unknown>;
  maxOutputTokens?: number;
}

/**
 * Summarization Payload
 */
export interface SummarizationPayload {
  content?: string;
  contentRef?: string;
  summaryType?: 'brief' | 'detailed' | 'bullets';
  maxLength?: number;
}

/**
 * Generic AI Message / Task Document Structure in Firestore
 */
export interface AIMessage {
  taskId: string;
  type: AITaskType;
  userId: string;
  payload: Record<string, unknown>; // Can be narrower unions if we want strict typing
  priority: TaskPriority;
  createdAt: string; // ISO string
  attemptNumber: number;

  // Fields updated during processing (reflected in Firestore)
  status?: TaskStatus;
  processingStartedAt?: string;
  completedAt?: string;
  failedAt?: string;
  processorExecutionId?: string;
  error?: unknown;
  result?: unknown;
}
