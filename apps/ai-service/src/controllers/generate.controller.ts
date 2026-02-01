import { FastifyRequest, FastifyReply } from 'fastify';
import {
  AuthenticatedRequest,
  GenerateRequest,
} from '../types/request.types.js';
import {
  vertexAIService,
  cacheService,
  usageService,
} from '../services/index.js';

export class GenerateController {
  async generate(request: FastifyRequest, reply: FastifyReply) {
    const userRequest = request as AuthenticatedRequest;
    const body = request.body as GenerateRequest;
    const userId = userRequest.user.uid;
    const requestId = request.id as string;

    // 1. Check Cache
    const skipCache = request.headers['x-skip-cache'] === 'true';
    if (!skipCache) {
      const cached = await cacheService.getCachedResponse({
        ...body,
        format: body.responseFormat,
      });
      if (cached) {
        // Track cache hit
        await usageService.trackUsage(userId, { cacheHits: 1 });
        reply.header('x-cache-hit', 'true');
        return cached;
      }
    }

    const start = Date.now();

    // 2. Call Vertex AI
    // vertexAIService.generateContent now returns GenerationResponse
    const result = await vertexAIService.generateContent(body);
    const latencyMs = Date.now() - start;

    // 3. Process Response
    // The result is already simplified by the client
    const content = result.content;
    const finishReason = result.finishReason;

    const response = {
      requestId,
      content,
      model: result.model || body.model || 'gemini-2.0-flash-001',
      finishReason,
      usage: result.usage,
      cached: false,
      latencyMs: result.latencyMs || latencyMs, // Prefer client measured latency
    };

    // 4. Update Usage & Cache
    await Promise.all([
      usageService.trackUsage(userId, {
        requests: 1,
        tokensInput: response.usage.inputTokens,
        tokensOutput: response.usage.outputTokens,
      }),
      !skipCache
        ? cacheService.cacheResponse(
            { ...body, format: body.responseFormat },
            { ...response, cached: true }
          )
        : Promise.resolve(),
    ]);

    return response;
  }
}
