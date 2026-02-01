export const MODEL_LIMITS = {
  /** Default generation parameters */
  defaultParameters: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
  },

  /** Parameter ranges */
  parameterRanges: {
    temperature: { min: 0.0, max: 2.0 },
    topP: { min: 0.0, max: 1.0 },
    topK: { min: 1, max: 100 },
    maxOutputTokens: { min: 1, max: 8192 },
    stopSequences: { maxCount: 5 },
  },

  /** Batch limits */
  batchLimits: {
    maxEmbeddingBatchSize: 100,
    defaultEmbeddingBatchSize: 50,
  },

  /** Request limits */
  requestLimits: {
    maxPromptLength: 1000000, // characters
    maxSystemContextLength: 100000, // characters
  },
} as const;
