import { RetryConfig } from '../types';
import { VertexAIError } from '../errors'; // Wait, RetryConfig is in types. VertexAIError in errors.
// Import separately.
import { ErrorMapper } from '../errors/error-mapper';

export interface RetryContext {
  attempt: number;
  maxRetries: number;
}

export class RetryHandler {
  constructor(private config: RetryConfig) {}

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, _context?: RetryContext): Promise<T> {
    let lastError: VertexAIError | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const vertexError = ErrorMapper.map(error);
        lastError = vertexError;

        // Don't retry permanent errors
        if (!vertexError.retryable) {
          throw vertexError;
        }

        // Don't retry if max attempts reached
        if (attempt === this.config.maxRetries) {
          throw vertexError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, vertexError);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // Should be unreachable if maxRetries >= 0, but for TS safety:
    throw lastError ?? new Error('Retry failed with unknown error');
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, error: VertexAIError): number {
    // Use server-suggested delay if available
    if (error.retryAfterMs) {
      return error.retryAfterMs;
    }

    // Calculate exponential backoff
    const exponentialDelay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt);

    // Apply max delay cap
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);

    // Apply jitter
    const jitter = cappedDelay * this.config.jitterFactor * Math.random();

    return Math.floor(cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
