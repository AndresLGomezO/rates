import { TokenUsage, ModelId, EmbeddingModelId } from '../types';
import { getModelConfig } from '../config/model-config';

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  model: string;
}

export class CostCalculator {
  /**
   * Calculate cost for token usage
   */
  static calculate(
    usage: TokenUsage,
    model: ModelId | EmbeddingModelId
  ): CostEstimate {
    const modelInfo = getModelConfig(model);

    const inputCost = (usage.inputTokens / 1000) * modelInfo.inputPricePer1K;
    const outputCost = (usage.outputTokens / 1000) * modelInfo.outputPricePer1K;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
      currency: 'USD',
      model,
    };
  }

  /**
   * Estimate cost before making request
   */
  static estimate(
    inputTokens: number,
    estimatedOutputTokens: number,
    model: ModelId
  ): CostEstimate {
    return this.calculate(
      {
        inputTokens,
        outputTokens: estimatedOutputTokens,
        totalTokens: inputTokens + estimatedOutputTokens,
      },
      model
    );
  }
}
