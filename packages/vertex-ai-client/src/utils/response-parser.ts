import {
  GenerationResponse,
  TokenUsage,
  FinishReason,
  SafetyRating,
  SafetyCategory,
  SafetyProbability,
} from '../types';
import { InternalError } from '../errors';

// Minimal interface for Vertex AI SDK response
interface VertexMetadata {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface VertexCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
  finishReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
    blocked: boolean;
  }>;
}

export interface VertexResponse {
  candidates?: VertexCandidate[];
  usageMetadata?: VertexMetadata['usageMetadata'];
}

export class ResponseParser {
  static parseGenerationResponse(
    response: VertexResponse,
    modelId: string,
    startTime: number
  ): GenerationResponse {
    const candidate = response.candidates?.[0];

    if (!candidate) {
      throw new InternalError('No candidates returned in response');
    }

    // Parse content
    const content = candidate.content?.parts?.[0]?.text ?? '';

    // Parse usage
    const usage: TokenUsage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    // Parse safety ratings
    const safetyRatings: SafetyRating[] = (candidate.safetyRatings ?? []).map(
      (r) => ({
        category: r.category as SafetyCategory,
        probability: r.probability as SafetyProbability,
        blocked: r.blocked ?? false,
      })
    );

    // Parse finish reason
    const finishReason = this.parseFinishReason(candidate.finishReason);

    return {
      content,
      finishReason,
      usage,
      safetyRatings,
      model: modelId,
      latencyMs: Date.now() - startTime,
    };
  }

  private static parseFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'STOP':
        return 'STOP';
      case 'MAX_TOKENS':
        return 'MAX_TOKENS';
      case 'SAFETY':
        return 'SAFETY';
      case 'RECITATION':
        return 'RECITATION';
      default:
        return 'OTHER';
    }
  }
}
