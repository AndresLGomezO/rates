import { FastifyReply, FastifyRequest } from 'fastify';
import {
  chatService,
  chatSessionRepo,
  chatMessageRepo,
} from '../services/index.js';
import { ChatRequest } from '../types/index.js';

export class ChatController {
  async chat(
    request: FastifyRequest<{ Body: ChatRequest }>,
    reply: FastifyReply
  ) {
    const { prompt, sessionId } = request.body;
    // User ID extraction
    const authenticatedUser = (request as unknown as { user?: { uid: string } })
      .user;
    const userId =
      authenticatedUser?.uid ||
      (request.headers['x-user-id'] as string) ||
      request.body.userId;

    if (!userId) {
      return reply.code(400).send({ error: 'User ID is required' });
    }

    try {
      const response = await chatService.chat({
        userId,
        prompt,
        sessionId,
      });

      return reply.send(response);
    } catch (error: unknown) {
      request.log.error(error);
      const errorMessage = (error as Error).message || 'Internal Server Error';
      const statusCode =
        errorMessage.includes('not found') || errorMessage.includes('denied')
          ? 403
          : 500;

      return reply.code(statusCode).send({ error: errorMessage });
    }
  }

  async getSession(
    request: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply
  ) {
    const { sessionId } = request.params;
    const authenticatedUser = (request as unknown as { user?: { uid: string } })
      .user;
    const userId =
      authenticatedUser?.uid || (request.headers['x-user-id'] as string);

    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const session = await chatSessionRepo.get(sessionId);
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    if (session.userId !== userId)
      return reply.code(403).send({ error: 'Access denied' });

    const messages = await chatMessageRepo.listBySession(sessionId);

    return reply.send({ session, messages });
  }

  async listSessions(request: FastifyRequest, reply: FastifyReply) {
    const authenticatedUser = (request as unknown as { user?: { uid: string } })
      .user;
    const userId =
      authenticatedUser?.uid || (request.headers['x-user-id'] as string);

    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const sessions = await chatSessionRepo.listByUser(userId);
    return reply.send({ sessions });
  }
}

export const chatController = new ChatController();
