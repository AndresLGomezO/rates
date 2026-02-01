// Main client
export { VertexAIClient } from './client/vertex-client';
export { GenerationClient } from './client/generation-client';
export { EmbeddingClient } from './client/embedding-client';

// Configuration
export { createClientConfig } from './config/client-config';
export { getModelConfig } from './config/model-config';

// Types
export * from './types';

// Errors
export * from './errors';

// Utilities
export { TokenCounter } from './utils/token-counter';
export { CostCalculator } from './utils/cost-calculator';

// Prompts
export { TemplateEngine } from './prompts/template-engine';
export { loadTemplate } from './prompts/template-loader';

// Constants
export { MODELS, DEFAULT_MODEL } from './constants/models';
export { MODEL_LIMITS } from './constants/limits';
