import { z } from 'zod';

export const AITaskType = z.enum([
  'TEXT_GENERATION',
  'SUMMARIZATION',
  'BATCH_EMBEDDING',
  'DOCUMENT_QA',
  'BATCH_CLASSIFICATION',
  'MULTI_STEP_PIPELINE',
]);

export type AITaskType = z.infer<typeof AITaskType>;

// Task Specific Payloads
export const TextGenerationPayload = z.object({
  prompt: z.string(),
  systemContext: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
  maxOutputTokens: z.number().optional(),
});

export const SummarizationPayload = z
  .object({
    content: z.string().optional(), // One of content or contentRef
    contentRef: z.string().optional(),
    summaryType: z.enum(['brief', 'detailed', 'bullets']).optional(),
    maxLength: z.number().optional(),
  })
  .refine((data) => data.content || data.contentRef, {
    message: "Either 'content' or 'contentRef' must be provided",
  });

// Main Message Schema
export const AIMessageSchema = z.object({
  taskId: z.string().uuid(),
  type: AITaskType,
  userId: z.string(),
  payload: z.record(z.unknown()), // Validated further based on type
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  createdAt: z.string().datetime(),
  attemptNumber: z.number().default(1),
});

export type AIMessage = z.infer<typeof AIMessageSchema>;
