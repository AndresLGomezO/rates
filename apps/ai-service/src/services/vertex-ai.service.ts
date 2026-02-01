import { vertexAIClient } from '../config/vertex-ai.js';
import {
  GenerateRequest,
  EmbedRequest,
  GenerateResponse,
} from '../types/index.js';
import {
  ModelId,
  EmbeddingModelId,
  EmbeddingTaskType,
  SafetySettings,
} from '@rates/vertex-ai-client';

export class VertexAIService {
  async generateContent(request: GenerateRequest): Promise<GenerateResponse> {
    const result = await vertexAIClient.generation.generate({
      model: request.model as ModelId,
      prompt: request.prompt,
      systemContext: request.systemContext,
      parameters: request.parameters,
      safetySettings: request.safetySettings as SafetySettings,
    });
    return result as unknown as GenerateResponse;
  }

  async embedContent(request: EmbedRequest): Promise<unknown> {
    return vertexAIClient.embedding.embed({
      model: request.model as EmbeddingModelId,
      text: request.text || '',
      taskType: request.taskType as EmbeddingTaskType,
    });
  }

  async generateContentStream(
    request: GenerateRequest,
    onChunk: (chunk: unknown) => void
  ): Promise<GenerateResponse> {
    const result = await vertexAIClient.generation.generateStream({
      model: request.model as ModelId,
      prompt: request.prompt,
      systemContext: request.systemContext,
      parameters: request.parameters,
      safetySettings: request.safetySettings as SafetySettings,
      onChunk,
    });
    return result as unknown as GenerateResponse;
  }
}

export const vertexAIService = new VertexAIService();
