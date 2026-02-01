import { z } from 'zod';

// 3.1 TEXT_GENERATION
export const TextGenerationPayloadSchema = z.object({
  prompt: z.string().max(100000),
  systemContext: z.string().max(10000).optional(),
  model: z.string().optional(),
  parameters: z
    .object({
      temperature: z.number().min(0).max(2).default(0.7),
      topP: z.number().min(0).max(1).default(0.95),
      topK: z.number().min(1).max(100).default(40),
    })
    .optional(),
  maxOutputTokens: z.number().min(1).max(32768).optional(),
});

// 3.2 SUMMARIZATION
export const SummarizationPayloadSchema = z
  .object({
    content: z.string().max(500000).optional(),
    contentRef: z.string().optional(),
    summaryType: z.enum(['brief', 'detailed', 'bullets']).optional(),
    maxLength: z.number().min(100).max(10000).optional(),
    language: z.string().length(2).optional(), // ISO code assumption
  })
  .refine((data) => data.content || data.contentRef, {
    message: "Either 'content' or 'contentRef' must be provided",
  });

// 3.3 BATCH_EMBEDDING
export const BatchEmbeddingPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(10000),
      })
    )
    .min(1)
    .max(1000),
  model: z.string().optional(),
  batchSize: z.number().min(1).max(100).optional(),
});

// 3.4 DOCUMENT_QA
export const DocumentQAPayloadSchema = z
  .object({
    question: z.string().max(1000),
    documents: z
      .array(
        z.object({
          id: z.string(),
          content: z.string().max(100000),
        })
      )
      .min(1)
      .max(10)
      .optional(),
    documentRefs: z.array(z.string()).min(1).max(10).optional(),
    includeReferences: z.boolean().optional(),
    maxReferences: z.number().min(1).max(10).optional(),
  })
  .refine((data) => data.documents || data.documentRefs, {
    message: "Either 'documents' or 'documentRefs' must be provided",
  });

// 3.5 BATCH_CLASSIFICATION
export const BatchClassificationPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(10000),
      })
    )
    .min(1)
    .max(500),
  categories: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().max(100),
        description: z.string().max(500).optional(),
      })
    )
    .min(2)
    .max(50),
  multiLabel: z.boolean().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
});

// 3.6 MULTI_STEP_PIPELINE
// Recursive schema definition handling is complex in Zod, so we define config as unknown/record first
// In a real impl, we might want to discriminate based on type, but for now specific step config validation can happen at runtime or with lazy evaluation if needed.
// Simplification: config is record<unknown> and validated by the handler.
export const PipelineStepSchema = z.object({
  id: z.string(),
  type: z.string(), // Verified against TaskType enum elsewhere
  config: z.record(z.unknown()),
  inputMapping: z.record(z.string()).optional(),
});

export const MultiStepPipelinePayloadSchema = z.object({
  steps: z.array(PipelineStepSchema).min(2).max(10),
  initialInput: z.record(z.unknown()),
  stopOnFailure: z.boolean().default(true),
});
