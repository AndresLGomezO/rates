import { FastifyReply, FastifyRequest } from 'fastify';
import { ContextBuilderService, vertexAIService } from '../services/index.js';
import {
  ChatSessionRepository,
  ChatMessageRepository,
  FinancialDataRepository,
} from '../repositories/index.js';
import { ChatRequest, ChatResponse } from '../types/index.js';

export class ChatController {
  private contextBuilder: ContextBuilderService;
  private sessionRepo: ChatSessionRepository;
  private messageRepo: ChatMessageRepository;

  constructor() {
    // Instantiate dependencies
    // In a full DI system these would be injected
    const financialRepo = new FinancialDataRepository();
    this.messageRepo = new ChatMessageRepository();
    this.sessionRepo = new ChatSessionRepository();
    this.contextBuilder = new ContextBuilderService(
      financialRepo,
      this.messageRepo
    );
  }

  async chat(
    request: FastifyRequest<{ Body: ChatRequest }>,
    reply: FastifyReply
  ) {
    const { prompt, sessionId: requestedSessionId } = request.body;
    // User ID extraction:
    // 1. AuthenticatedRequest.user (from auth middleware)
    // 2. x-user-id header (if passed by proxy and allowed)
    // 3. body.userId (dev/testing fallback)
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
      // 1. Get or create session
      let session;
      if (requestedSessionId) {
        session = await this.sessionRepo.get(requestedSessionId);
        if (!session) {
          return reply.code(404).send({ error: 'Session not found' });
        }
        if (session.userId !== userId) {
          return reply.code(403).send({ error: 'Access denied' });
        }
      } else {
        session = await this.sessionRepo.create(userId, prompt);
      }

      // 2. Build context
      const context = await this.contextBuilder.buildContext({
        userId,
        sessionId: session.id,
        prompt,
        maxHistoryMessages: 10,
      });

      // 3. Build prompt for Vertex AI
      // Combine history with current prompt
      const userPrompt = context.conversationHistory
        ? `${context.conversationHistory}\n\nUser: ${prompt}`
        : prompt;

      // 4. Call Vertex AI
      // Using generateContent from vertexAIService
      const vertexResponse = await vertexAIService.generateContent({
        prompt: userPrompt,
        systemContext: context.systemPrompt,
        parameters: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      // 5. Save messages to history
      // Save User Message
      await this.messageRepo.create({
        sessionId: session.id,
        role: 'user',
        content: prompt,
        contextCategories: context.categoriesUsed,
      });

      // Save Assistant Message
      const assistantMessage = await this.messageRepo.create({
        sessionId: session.id,
        role: 'assistant',
        content: vertexResponse.content,
        tokenCount: vertexResponse.usage.outputTokens,
        model: vertexResponse.model || 'gemini-pro',
      });

      // 6. Update session metadata
      await this.sessionRepo.update(session.id, {
        messageCount: session.messageCount + 2,
        totalTokensUsed:
          session.totalTokensUsed + vertexResponse.usage.totalTokens,
        // could update summary here too
      });

      // 7. Response
      const response: ChatResponse = {
        content: vertexResponse.content,
        sessionId: session.id,
        messageId: assistantMessage.id,
        usage: {
          inputTokens: vertexResponse.usage.inputTokens,
          outputTokens: vertexResponse.usage.outputTokens,
          totalTokens: vertexResponse.usage.totalTokens,
          contextTokens: context.tokenEstimate.system,
          historyTokens: context.tokenEstimate.history,
        },
        contextUsed: context.categoriesUsed,
      };

      return reply.send(response);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal Server Error' });
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

    const session = await this.sessionRepo.get(sessionId);
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    if (session.userId !== userId)
      return reply.code(403).send({ error: 'Access denied' });

    const messages = await this.messageRepo.listBySession(sessionId);

    return reply.send({ session, messages });
  }

  async listSessions(request: FastifyRequest, reply: FastifyReply) {
    const authenticatedUser = (request as unknown as { user?: { uid: string } })
      .user;
    const userId =
      authenticatedUser?.uid || (request.headers['x-user-id'] as string);

    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const sessions = await this.sessionRepo.listByUser(userId);
    return reply.send({ sessions });
  }
}

export const chatController = new ChatController();
