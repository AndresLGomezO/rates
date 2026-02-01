import { UsageRepository } from '../repositories/usage.repository.js';
import { UsageStatsResponse } from '../types/response.types.js';
import { limitsConfig } from '../config/limits.config.js';

export class UsageService {
  constructor(private usageRepo: UsageRepository) {}

  async trackUsage(
    userId: string,
    usage: {
      requests?: number;
      tokensInput?: number;
      tokensOutput?: number;
      tasks?: number;
      cacheHits?: number;
    }
  ): Promise<void> {
    await this.usageRepo.incrementUsage(userId, usage);
  }

  async getUserUsage(userId: string): Promise<UsageStatsResponse> {
    const stats = await this.usageRepo.getUserUsage(userId);

    // Calculate reset time (midnight UTC)
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(24, 0, 0, 0);

    return {
      userId,
      period: 'today',
      usage: stats,
      limits: {
        requestsPerMinute: limitsConfig.requestsPerMinute,
        tokensPerDay: limitsConfig.tokensPerDay,
      },
      quotaResetAt: reset.toISOString(),
    };
  }
}
