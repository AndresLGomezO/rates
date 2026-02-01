import { CacheRepository } from '../repositories/cache.repository.js';
import { createCacheKey } from '../utils/hash.js';

export class CacheService {
  constructor(private cacheRepo: CacheRepository) {}

  async getCachedResponse(
    requestData: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const key = createCacheKey(requestData);
    return await this.cacheRepo.get(key);
  }

  async cacheResponse(
    requestData: Record<string, unknown>,
    response: Record<string, unknown>,
    ttlSeconds: number = 24 * 60 * 60
  ): Promise<void> {
    const key = createCacheKey(requestData);
    await this.cacheRepo.set(key, response, ttlSeconds);
  }
}
