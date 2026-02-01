import { vertexAIClient } from '../config/vertex-ai.js';
import {
  GenerateRequest,
  EmbedRequest,
  GenerationResponse,
} from '../types/index.js';

export class VertexAIService {
  async generateContent(request: GenerateRequest): Promise<GenerationResponse> {
    return vertexAIClient.generate({
      model: request.model,
      prompt: request.prompt,
      systemContext: request.systemContext,
      parameters: request.parameters,
      safetySettings: request.safetySettings,
    });
  }

  async embedContent(request: EmbedRequest): Promise<unknown> {
    return vertexAIClient.embed({
      model: request.model,
      text: request.text,
      taskType: (request as { taskType?: string }).taskType,
    });
  }

  async generateContentStream(
    request: GenerateRequest,
    onChunk: (chunk: unknown) => void
  ): Promise<GenerationResponse> {
    return vertexAIClient.generateStream({
      model: request.model,
      prompt: request.prompt,
      systemContext: request.systemContext,
      parameters: request.parameters,
      safetySettings: request.safetySettings,
      onChunk,
    });
  }
}

export const vertexAIService = new VertexAIService();
