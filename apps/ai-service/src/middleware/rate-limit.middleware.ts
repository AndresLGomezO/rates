import { FastifyRequest, FastifyReply } from 'fastify';
import { RateLimitService } from '../services/rate-limit.service.js';
import { RateLimitRepository } from '../repositories/rate-limit.repository.js';
import { UsageRepository } from '../repositories/usage.repository.js';
import { AuthenticatedRequest } from '../types/request.types.js';

const rateLimitRepo = new RateLimitRepository();
const usageRepo = new UsageRepository();
const rateLimitService = new RateLimitService(rateLimitRepo, usageRepo);

export async function rateLimitMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  // Skip rate limit for health checks and OPTIONS
  if (
    request.method === 'OPTIONS' ||
    request.url.startsWith('/health') ||
    request.url.startsWith('/ready')
  ) {
    return;
  }

  const userRequest = request as unknown as AuthenticatedRequest;
  if (!userRequest.user || !userRequest.user.uid) {
    // This should not happen if auth middleware is running, but good safeguard
    return;
  }

  await rateLimitService.checkRateLimits(userRequest.user.uid);
}
