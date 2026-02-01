import { z } from 'zod';

export const generationParamsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(0.95),
  topK: z.number().int().min(1).max(100).default(40),
  maxOutputTokens: z.number().int().min(1).max(8192).default(1024),
  stopSequences: z.array(z.string()).max(5).default([]),
});

export const requestSchema = z.object({
  prompt: z.string().min(1).max(32000),
  systemContext: z.string().max(32000).optional(),
  model: z.string().optional(),
  parameters: generationParamsSchema.optional(),
  responseFormat: z.enum(['text', 'json', 'markdown']).default('text'),
});

export const responseSchema = z.object({
  requestId: z.string(),
  content: z.string(),
  model: z.string(),
  finishReason: z.string(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
  }),
  cached: z.boolean(),
  latencyMs: z.number(),
});
