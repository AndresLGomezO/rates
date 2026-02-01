import { VertexAIService } from './vertex-ai.service.js';
import { PubSubService } from './pubsub.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { CacheService } from './cache.service.js';
import { UsageService } from './usage.service.js';
import { AuthService } from './auth.service.js';

import { TaskRepository } from '../repositories/task.repository.js';
import { UsageRepository } from '../repositories/usage.repository.js';
import { RateLimitRepository } from '../repositories/rate-limit.repository.js';
import { CacheRepository } from '../repositories/cache.repository.js';

// Repositories
export const taskRepo = new TaskRepository();
export const usageRepo = new UsageRepository();
export const rateLimitRepo = new RateLimitRepository();
export const cacheRepo = new CacheRepository();

// Services
export const vertexAIService = new VertexAIService();
export const pubsubService = new PubSubService();
export const rateLimitService = new RateLimitService(rateLimitRepo, usageRepo);
export const cacheService = new CacheService(cacheRepo);
export const usageService = new UsageService(usageRepo);
export const authService = new AuthService();
