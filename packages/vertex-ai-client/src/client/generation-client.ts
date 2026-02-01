import { GenerativeModel, VertexAI } from '@google-cloud/vertexai';
import {
  GenerationRequest,
  GenerationResponse,
  StreamingGenerationRequest,
  GenerationParameters,
  CostEstimate,
  ModelId,
  VertexClientConfig,
  SafetySettings,
} from '../types';
import { RetryHandler } from '../retry/retry-handler';
import { Validators } from '../utils/validators';
import { TokenCounter } from '../utils/token-counter';
import { CostCalculator } from '../utils/cost-calculator';
import { ResponseParser, VertexResponse } from '../utils/response-parser';
import { ErrorMapper } from '../errors/error-mapper';
import { StreamingClient } from './streaming-client';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface VertexSafetySetting {
  category: string;
  threshold: string;
}

export class GenerationClient {
  private streamingClient: StreamingClient;

  constructor(
    private vertexAI: VertexAI,
    private config: VertexClientConfig,
    private retryHandler: RetryHandler
  ) {
    this.streamingClient = new StreamingClient(vertexAI);
  }

  /**
   * Generate text synchronously
   */
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    // Validate parameters first
    const validation = this.validateParameters(
      request.parameters ?? {},
      request.model
    );
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const modelId =
      request.model ?? this.config.defaultModel ?? 'gemini-2.0-flash';
    const model = this.getModel(modelId);

    return this.retryHandler.execute(async () => {
      const startTime = Date.now();

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.parameters?.temperature,
            maxOutputTokens: request.parameters?.maxOutputTokens,
            topP: request.parameters?.topP,
            topK: request.parameters?.topK,
            stopSequences: request.parameters?.stopSequences,
            candidateCount: request.parameters?.candidateCount,
          },
          safetySettings: this.mapSafetySettings(
            request.safetySettings ?? this.config.defaultSafetySettings
          ),
        });

        return ResponseParser.parseGenerationResponse(
          result.response as VertexResponse,
          modelId,
          startTime
        );
      } catch (error) {
        throw ErrorMapper.map(error);
      }
    });
  }

  /**
   * Generate text with streaming
   */
  async generateStream(
    request: StreamingGenerationRequest
  ): Promise<GenerationResponse> {
    const modelId =
      request.model ?? this.config.defaultModel ?? 'gemini-2.0-flash';
    const model = this.getModel(modelId);

    return this.retryHandler.execute(async () => {
      return this.streamingClient.generateStream(model, request);
    });
  }

  /**
   * Estimate tokens for a prompt
   */
  estimateTokens(text: string, _model?: ModelId): number {
    return TokenCounter.estimate(text);
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model?: ModelId
  ): CostEstimate {
    const targetModel = model ?? this.config.defaultModel ?? 'gemini-2.0-flash';
    return CostCalculator.estimate(inputTokens, outputTokens, targetModel);
  }

  /**
   * Validate generation parameters
   */
  validateParameters(
    params: GenerationParameters,
    _model?: ModelId
  ): ValidationResult {
    const failures = Validators.validateParameters(params);

    if (failures.length > 0) {
      return {
        valid: false,
        errors: failures.map((f) => `${f.field}: ${f.message}`),
      };
    }
    return { valid: true, errors: [] };
  }

  private getModel(modelId: string): GenerativeModel {
    return this.vertexAI.getGenerativeModel({
      model: modelId,
    });
  }

  private mapSafetySettings(
    settings?: SafetySettings
  ): VertexSafetySetting[] | undefined {
    if (!settings) return undefined;
    const mapped: VertexSafetySetting[] = [];
    if (settings.harassmentThreshold)
      mapped.push({
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: settings.harassmentThreshold,
      });
    if (settings.hateSpeechThreshold)
      mapped.push({
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: settings.hateSpeechThreshold,
      });
    if (settings.sexuallyExplicitThreshold)
      mapped.push({
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: settings.sexuallyExplicitThreshold,
      });
    if (settings.dangerousContentThreshold)
      mapped.push({
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: settings.dangerousContentThreshold,
      });
    return mapped;
  }
}
