import { RateLimitRepository } from '../repositories/rate-limit.repository.js';
import { UsageRepository } from '../repositories/usage.repository.js';
import { RateLimitError, QuotaError } from '../utils/errors.js';
import { limitsConfig } from '../config/limits.config.js';

export class RateLimitService {
  constructor(
    private rateLimitRepo: RateLimitRepository,
    private usageRepo: UsageRepository
  ) {}

  async checkRateLimits(userId: string): Promise<void> {
    // 1. Check Requests Per Minute
    const key = `rpm_${userId}`;
    const count = await this.rateLimitRepo.incrementCounter(key, 60); // 60 seconds window

    if (count > limitsConfig.requestsPerMinute) {
      throw new RateLimitError(
        `Rate limit exceeded: ${limitsConfig.requestsPerMinute} requests per minute`
      );
    }

    // 2. Check Daily Token Quota (approximate check based on previous usage)
    const usage = await this.usageRepo.getUserUsage(userId);
    const totalTokens = (usage.tokenInput || 0) + (usage.tokenOutput || 0);

    if (totalTokens >= limitsConfig.tokensPerDay) {
      throw new QuotaError(
        `Daily token quota exceeded: ${limitsConfig.tokensPerDay} tokens`
      );
    }
  }
}
