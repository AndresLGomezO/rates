import {
  VertexClientConfig,
  ModelId,
  RetryConfig,
  GenerationParameters,
  SafetySettings,
} from '../types';
import { ConfigurationError } from '../errors';
import { DEFAULT_MODEL } from '../constants/models';
import { DEFAULT_RETRY_CONFIG } from './defaults';
import { MODEL_LIMITS } from '../constants/limits';

export interface VertexClientConfigOptions {
  projectId: string;
  location: string;
  defaultModel?: ModelId;
  timeout?: number;
  retry?: Partial<RetryConfig>;
  defaultParameters?: Partial<GenerationParameters>;
  defaultSafetySettings?: SafetySettings;
}

export function createClientConfig(
  options: VertexClientConfigOptions
): VertexClientConfig {
  // Validate required fields
  if (!options.projectId) {
    throw new ConfigurationError('projectId is required');
  }
  if (!options.location) {
    throw new ConfigurationError('location is required');
  }

  return {
    projectId: options.projectId,
    location: options.location,
    defaultModel: options.defaultModel ?? DEFAULT_MODEL,
    timeout: options.timeout ?? 30000,
    retry: {
      ...DEFAULT_RETRY_CONFIG,
      ...options.retry,
    },
    defaultParameters: {
      ...MODEL_LIMITS.defaultParameters,
      ...options.defaultParameters,
    },
    defaultSafetySettings: options.defaultSafetySettings,
  };
}
