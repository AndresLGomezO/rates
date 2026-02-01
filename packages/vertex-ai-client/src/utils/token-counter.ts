import { GenerationRequest, ModelId } from '../types';
import { getModelConfig } from '../config/model-config';

export interface TokenEstimate {
  inputTokens: number;
  estimatedOutputTokens: number;
  totalEstimate: number;
}

export interface LimitCheckResult {
  valid: boolean;
  issues: string[];
}

export class TokenCounter {
  /**
   * Estimate tokens for text
   * Uses approximation: ~4 characters per token for English
   */
  static estimate(text: string): number {
    if (!text) return 0;

    // More accurate estimation considering:
    // - Whitespace tokenization
    // - Punctuation as separate tokens
    // - Numbers and special characters

    const words = text.split(/\s+/).filter((w) => w.length > 0);
    let tokenCount = 0;

    for (const word of words) {
      // Base: each word is at least 1 token
      tokenCount += 1;

      // Long words get split into subwords
      if (word.length > 10) {
        tokenCount += Math.floor(word.length / 5);
      }

      // Punctuation often separate tokens
      const punctuation = word.match(/[.,!?;:'"()[\]{}]/g);
      if (punctuation) {
        tokenCount += punctuation.length;
      }
    }

    return tokenCount;
  }

  /**
   * Estimate tokens for generation request
   */
  static estimateRequest(request: GenerationRequest): TokenEstimate {
    let inputTokens = this.estimate(request.prompt);

    if (request.systemContext) {
      inputTokens += this.estimate(request.systemContext);
    }

    const maxOutputTokens = request.parameters?.maxOutputTokens ?? 1024;

    return {
      inputTokens,
      estimatedOutputTokens: maxOutputTokens,
      totalEstimate: inputTokens + maxOutputTokens,
    };
  }

  /**
   * Check if request exceeds model limits
   */
  static checkLimits(
    inputTokens: number,
    maxOutputTokens: number,
    model: ModelId
  ): LimitCheckResult {
    const modelInfo = getModelConfig(model);

    const issues: string[] = [];

    if (inputTokens > modelInfo.maxInputTokens) {
      issues.push(
        `Input tokens (${inputTokens}) exceed model limit (${modelInfo.maxInputTokens})`
      );
    }

    // Check output tokens limit if defined
    if (
      modelInfo.maxOutputTokens &&
      maxOutputTokens > modelInfo.maxOutputTokens
    ) {
      issues.push(
        `Output tokens (${maxOutputTokens}) exceed model limit (${modelInfo.maxOutputTokens})`
      );
    }

    // Check context window
    const totalTokens = inputTokens + maxOutputTokens;
    const contextWindow =
      modelInfo.maxInputTokens + (modelInfo.maxOutputTokens ?? 0);

    if (totalTokens > contextWindow) {
      issues.push(
        `Total tokens (${totalTokens}) exceed context window (${contextWindow})`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
