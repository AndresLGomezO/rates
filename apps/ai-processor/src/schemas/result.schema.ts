import { z } from 'zod';

const TokenUsageSchema = z
  .object({
    input: z.number(),
    output: z.number(),
  })
  .optional();

export const TextGenerationResultSchema = z.object({
  content: z.string(),
  finishReason: z.string(),
  tokenUsage: z.object({
    input: z.number(),
    output: z.number(),
  }),
});

export const SummarizationResultSchema = z.object({
  summary: z.string(),
  summaryType: z.string().optional(),
  originalLength: z.number(),
  summaryLength: z.number(),
  compressionRatio: z.number(),
  tokenUsage: TokenUsageSchema,
});

export const BatchEmbeddingResultSchema = z.object({
  embeddings: z.array(
    z.object({
      id: z.string(),
      vector: z.array(z.number()),
      error: z.string().optional(),
    })
  ),
  dimensions: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  tokenUsage: TokenUsageSchema,
});

export const DocumentQAResultSchema = z.object({
  answer: z.string(),
  confidence: z.number(),
  references: z.array(
    z.object({
      documentId: z.string(),
      quote: z.string(),
      relevance: z.number(),
    })
  ),
  documentsUsed: z.number(),
  tokenUsage: TokenUsageSchema,
});

export const BatchClassificationResultSchema = z.object({
  classifications: z.array(
    z.object({
      id: z.string(),
      labels: z.array(
        z.object({
          categoryId: z.string(),
          confidence: z.number(),
        })
      ),
      error: z.string().optional(),
    })
  ),
  successCount: z.number(),
  failureCount: z.number(),
  tokenUsage: TokenUsageSchema,
});

export const MultiStepPipelineResultSchema = z.object({
  finalOutput: z.record(z.unknown()).optional(),
  stepResults: z.array(
    z.object({
      stepId: z.string(),
      status: z.enum(['COMPLETED', 'FAILED', 'SKIPPED']),
      result: z.record(z.unknown()).optional(),
      error: z.string().optional(),
      durationMs: z.number(),
    })
  ),
  completedSteps: z.number(),
  totalSteps: z.number(),
  totalDurationMs: z.number(),
  tokenUsage: TokenUsageSchema,
});
