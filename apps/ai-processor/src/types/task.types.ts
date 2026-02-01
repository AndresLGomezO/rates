import { z } from 'zod';
import {
  TextGenerationPayloadSchema,
  SummarizationPayloadSchema,
  BatchEmbeddingPayloadSchema,
  DocumentQAPayloadSchema,
  BatchClassificationPayloadSchema,
  MultiStepPipelinePayloadSchema,
} from '../schemas/task.schema.js';
import {
  TextGenerationResultSchema,
  SummarizationResultSchema,
  BatchEmbeddingResultSchema,
  DocumentQAResultSchema,
  BatchClassificationResultSchema,
  MultiStepPipelineResultSchema,
} from '../schemas/result.schema.js';

export type TextGenerationPayload = z.infer<typeof TextGenerationPayloadSchema>;
export type SummarizationPayload = z.infer<typeof SummarizationPayloadSchema>;
export type BatchEmbeddingPayload = z.infer<typeof BatchEmbeddingPayloadSchema>;
export type DocumentQAPayload = z.infer<typeof DocumentQAPayloadSchema>;
export type BatchClassificationPayload = z.infer<
  typeof BatchClassificationPayloadSchema
>;
export type MultiStepPipelinePayload = z.infer<
  typeof MultiStepPipelinePayloadSchema
>;

export type TextGenerationResult = z.infer<typeof TextGenerationResultSchema>;
export type SummarizationResult = z.infer<typeof SummarizationResultSchema>;
export type BatchEmbeddingResult = z.infer<typeof BatchEmbeddingResultSchema>;
export type DocumentQAResult = z.infer<typeof DocumentQAResultSchema>;
export type BatchClassificationResult = z.infer<
  typeof BatchClassificationResultSchema
>;
export type MultiStepPipelineResult = z.infer<
  typeof MultiStepPipelineResultSchema
>;

export interface TaskStatusUpdate {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  processingStartedAt?: string;
  completedAt?: string;
  failedAt?: string;
  result?: unknown;
  error?: unknown;
  processingDurationMs?: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
  progress?: number;
  checkpointData?: CheckpointData;
  processorExecutionId?: string;
  attemptNumber?: number;
}

export interface CheckpointData {
  version: number;
  savedAt: string;
  handlerState: Record<string, unknown>;
}

export interface TaskError {
  code: string;
  message: string;
  category: 'permanent' | 'transient' | 'shutdown';
  timestamp: string;
  attemptNumber: number;
  details?: Record<string, unknown>;
}
