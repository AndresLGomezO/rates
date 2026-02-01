import { z } from 'zod';

export const createTaskSchema = z.object({
  type: z.enum([
    'TEXT_GENERATION',
    'SUMMARIZATION',
    'BATCH_EMBEDDING',
    'DOCUMENT_QA',
    'BATCH_CLASSIFICATION',
    'MULTI_STEP_PIPELINE',
  ]),
  payload: z.record(z.any()),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  webhookUrl: z.string().url().optional(),
});

export const taskResponseSchema = z.object({
  taskId: z.string(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  type: z.string(),
  createdAt: z.string(),
  estimatedDurationSeconds: z.number().optional(),
  statusUrl: z.string(),
});
