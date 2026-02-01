import { HandlerRegistry } from '../types/handler.types.js';
import { TextGenerationHandler } from './text-generation.handler.js';
import { SummarizationHandler } from './summarization.handler.js';
import { BatchEmbeddingHandler } from './batch-embedding.handler.js';
import { DocumentQAHandler } from './document-qa.handler.js';
import { BatchClassificationHandler } from './batch-classification.handler.js';
import { MultiStepPipelineHandler } from './multi-step-pipeline.handler.js';

export const handlers: HandlerRegistry = {
  TEXT_GENERATION: TextGenerationHandler,
  SUMMARIZATION: SummarizationHandler,
  BATCH_EMBEDDING: BatchEmbeddingHandler,
  DOCUMENT_QA: DocumentQAHandler,
  BATCH_CLASSIFICATION: BatchClassificationHandler,
  MULTI_STEP_PIPELINE: MultiStepPipelineHandler,
};
