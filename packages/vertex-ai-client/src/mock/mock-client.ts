import {
  GenerationRequest,
  StreamingGenerationRequest,
  GenerationResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
  BatchEmbeddingResult,
  ModelId,
  EmbeddingModelId,
  ModelInfo,
} from '../types';
import { VertexAIClient } from '../client/vertex-client';
import { GenerationClient } from '../client/generation-client';
import { EmbeddingClient } from '../client/embedding-client';
import { MODELS } from '../constants/models';

export interface MockOptions {
  delay?: number;
  shouldFail?: boolean;
  failureRate?: number;
}

export class MockVertexAIClient implements Partial<VertexAIClient> {
  private delay: number;
  private shouldFail: boolean;

  constructor(options?: MockOptions) {
    this.delay = options?.delay ?? 500; // Simulate latency
    this.shouldFail = options?.shouldFail ?? false;
  }

  isConfigured(): boolean {
    return true;
  }

  getModelInfo(modelId: ModelId | EmbeddingModelId): ModelInfo {
    // Return a default model info if not found, or mock it
    const model = Object.values(MODELS).find((m) => m.id === modelId);
    if (model) return model;

    // Fallback for mock models
    return {
      id: modelId,
      type: 'generation',
      maxOutputTokens: 2048,
    } as ModelInfo;
  }

  listModels(type?: 'generation' | 'embedding'): ModelInfo[] {
    const models = Object.values(MODELS);
    if (type) {
      return models.filter((m) => m.type === type);
    }
    return models;
  }

  generation = {
    generate: async (
      request: GenerationRequest
    ): Promise<GenerationResponse> => {
      await this.simulateDelay();

      if (this.shouldFail) {
        throw new Error('Mock: Simulated failure');
      }

      return {
        content: this.generateMockContent(request.prompt),
        finishReason: 'STOP',
        usage: {
          inputTokens: Math.ceil(request.prompt.length / 4),
          outputTokens: 150,
          totalTokens: Math.ceil(request.prompt.length / 4) + 150,
        },
        safetyRatings: [],
        model: request.model ?? 'gemini-2.0-flash-exp', // Use a real model name or generic mock
        latencyMs: this.delay,
      };
    },

    generateStream: async (
      request: StreamingGenerationRequest
    ): Promise<GenerationResponse> => {
      const content = this.generateMockContent(request.prompt);
      const words = content.split(' ');

      // Simulate streaming
      for (let i = 0; i < words.length; i++) {
        await this.simulateDelay(50);
        request.onChunk({
          content: words[i] + ' ',
          index: i,
          isFinal: i === words.length - 1,
        });
      }

      return {
        content,
        finishReason: 'STOP',
        usage: {
          inputTokens: Math.ceil(request.prompt.length / 4),
          outputTokens: words.length,
          totalTokens: Math.ceil(request.prompt.length / 4) + words.length,
        },
        safetyRatings: [],
        model: request.model ?? 'gemini-2.0-flash-exp',
        latencyMs: this.delay * words.length,
      };
    },
  } as unknown as GenerationClient;

  embedding = {
    embed: async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
      await this.simulateDelay();

      return {
        vector: this.generateMockEmbedding(768),
        dimensions: 768,
        model: request.model ?? 'text-embedding-005',
        usage: {
          inputTokens: Math.ceil(request.text.length / 4),
          outputTokens: 0,
          totalTokens: Math.ceil(request.text.length / 4),
        },
        latencyMs: this.delay,
      };
    },

    embedBatch: async (
      request: BatchEmbeddingRequest
    ): Promise<BatchEmbeddingResponse> => {
      const embeddings: BatchEmbeddingResult[] = [];

      for (let i = 0; i < request.items.length; i++) {
        await this.simulateDelay(50);

        embeddings.push({
          id: request.items[i].id,
          vector: this.generateMockEmbedding(768),
        });

        request.onProgress?.({
          processed: i + 1,
          total: request.items.length,
          percentage: Math.round(((i + 1) / request.items.length) * 100),
          currentBatch: Math.floor(i / 50) + 1,
          totalBatches: Math.ceil(request.items.length / 50),
        });
      }

      return {
        embeddings,
        dimensions: 768,
        model: request.model ?? 'text-embedding-005',
        usage: {
          inputTokens: request.items.reduce(
            (sum, item) => sum + Math.ceil(item.text.length / 4),
            0
          ),
          outputTokens: 0,
          totalTokens: request.items.reduce(
            (sum, item) => sum + Math.ceil(item.text.length / 4),
            0
          ),
        },
        successCount: embeddings.length,
        failureCount: 0,
        latencyMs: this.delay * request.items.length,
      };
    },
  } as unknown as EmbeddingClient;

  private generateMockContent(prompt: string): string {
    // Return contextual mock responses
    if (prompt.toLowerCase().includes('summarize')) {
      return 'This is a mock summary of the provided content. It contains the key points and main ideas in a condensed format.';
    }
    if (prompt.toLowerCase().includes('explain')) {
      return 'This is a mock explanation. The concept works by combining multiple elements together to achieve the desired outcome.';
    }
    return `Mock response to: "${prompt.substring(0, 50)}..." - This is generated mock content for local development.`;
  }

  private generateMockEmbedding(dimensions: number): number[] {
    // Generate deterministic pseudo-random embedding
    return Array.from(
      { length: dimensions },
      (_, i) => Math.sin(i * 0.1) * 0.5 + Math.cos(i * 0.05) * 0.5
    );
  }

  private simulateDelay(ms?: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms ?? this.delay));
  }
}
