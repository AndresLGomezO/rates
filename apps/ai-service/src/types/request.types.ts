import { FastifyRequest } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    uid: string;
    email?: string;
  };
}

export type GenerationFormat = 'text' | 'json' | 'markdown';

export interface GenerationParams {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

export interface GenerateRequest {
  prompt: string;
  systemContext?: string;
  model?: string;
  parameters?: GenerationParams;
  responseFormat?: GenerationFormat;
  safetySettings?: unknown; // Keeping unknown here for now as safety settings are complex
}

export interface EmbedRequest {
  text?: string;
  texts?: string[];
  model?: string;
  taskType?: string;
}

export enum TaskType {
  TEXT_GENERATION = 'TEXT_GENERATION',
  SUMMARIZATION = 'SUMMARIZATION',
  BATCH_EMBEDDING = 'BATCH_EMBEDDING',
  DOCUMENT_QA = 'DOCUMENT_QA',
  BATCH_CLASSIFICATION = 'BATCH_CLASSIFICATION',
  MULTI_STEP_PIPELINE = 'MULTI_STEP_PIPELINE',
}

export type TaskPriority = 'low' | 'normal' | 'high';

export interface CreateTaskRequest {
  type: TaskType;
  payload: Record<string, unknown>;
  priority?: TaskPriority;
  webhookUrl?: string;
}
