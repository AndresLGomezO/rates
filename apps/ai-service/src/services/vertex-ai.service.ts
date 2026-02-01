import { vertexAIClient } from '../config/vertex-ai.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
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
    if (config.gcp.projectId === 'demo-project' || config.env === 'dev') {
      logger.info(
        { prompt: request.prompt },
        'Mocking Vertex AI Response for Local Development'
      );
      return this.getMockResponse(request.prompt);
    }

    const result = await vertexAIClient.generation.generate({
      model: request.model as ModelId,
      prompt: request.prompt,
      systemContext: request.systemContext,
      parameters: request.parameters,
      safetySettings: request.safetySettings as SafetySettings,
    });
    return result as unknown as GenerateResponse;
  }

  private getMockResponse(prompt: string): GenerateResponse {
    let content = `This is a mock response from Rates AI. Your prompt was: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`;

    // Simulate smart search/insights responses if prompt looks like JSON request
    if (prompt.toLowerCase().includes('json array')) {
      content = JSON.stringify([
        {
          id: '1',
          type: 'tip',
          title: 'Save More',
          content: 'Consider increasing your savings rate by 1%.',
          actionLabel: 'Set Goal',
        },
        {
          id: '2',
          type: 'success',
          title: 'On Track',
          content: 'You are meeting your monthly budget goals.',
          actionLabel: 'View Report',
        },
      ]);
    }

    return {
      content,
      model: 'mock-gemini-pro',
      finishReason: 'STOP',
      usage: {
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: 50,
        totalTokens: Math.ceil(prompt.length / 4) + 50,
      },
    } as unknown as GenerateResponse;
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
