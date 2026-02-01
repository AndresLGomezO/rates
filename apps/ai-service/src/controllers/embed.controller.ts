import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest, EmbedRequest } from '../types/request.types.js';
import { vertexAIService, usageService } from '../services/index.js';
import { estimateTokens } from '../utils/token-counter.js';

export class EmbedController {
  async embed(request: FastifyRequest, _reply: FastifyReply) {
    const userRequest = request as unknown as AuthenticatedRequest;
    const body = request.body as EmbedRequest;
    const userId = userRequest.user.uid;
    const requestId = request.id as string;

    const result = (await vertexAIService.embedContent(body)) as {
      embeddings: { values: number[] }[];
    };

    // Estimate token usage (approximated locally as Vertex doesn't consistently return embedding usage in all endpoints)
    let inputTokens = 0;
    if (body.text) inputTokens += estimateTokens(body.text);
    if (body.texts)
      body.texts.forEach((t: string) => (inputTokens += estimateTokens(t)));

    // Embeddings don't have output tokens in the same way (just vectors), but we can track input
    await usageService.trackUsage(userId, {
      requests: 1,
      tokensInput: inputTokens,
    });

    return {
      requestId,
      embeddings: result.embeddings.map(
        (e: { values: number[] }, index: number) => ({
          index,
          vector: e.values,
        })
      ),
      model: body.model || 'text-embedding-004',
      dimensions: result.embeddings[0]?.values.length || 768,
    };
  }
}
