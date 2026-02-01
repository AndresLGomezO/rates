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

// Main Message Schema
export const AIMessageSchema = z.object({
  taskId: z.string().uuid(),
  type: AITaskType,
  userId: z.string(),
  payload: z.record(z.unknown()), // Raw payload, to be refined by specific handlers
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  createdAt: z.string().datetime(),
  attemptNumber: z.number().default(1),
});

export type AIMessage = z.infer<typeof AIMessageSchema>;
