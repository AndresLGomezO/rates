export interface TokenEstimate {
  inputTokens: number;
  estimatedOutputTokens: number;
  totalEstimate: number;
}

export interface LimitCheckResult {
  valid: boolean;
  issues: string[];
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  model: string;
}
