import { ModelId, EmbeddingModelId, ModelInfo } from '../types';
import { InvalidModelError } from '../errors';
import { MODELS } from '../constants/models';

export function getModelConfig(modelId: ModelId | EmbeddingModelId): ModelInfo {
  const config = MODELS[modelId];
  if (!config) {
    throw new InvalidModelError(`Unknown model: ${modelId}`, {
      requestedModel: modelId,
      availableModels: Object.keys(MODELS),
    });
  }
  return config;
}

export function isGenerationModel(modelId: string): modelId is ModelId {
  const config = MODELS[modelId as ModelId];
  return config?.type === 'generation';
}

export function isEmbeddingModel(modelId: string): modelId is EmbeddingModelId {
  const config = MODELS[modelId as EmbeddingModelId];
  return config?.type === 'embedding';
}
