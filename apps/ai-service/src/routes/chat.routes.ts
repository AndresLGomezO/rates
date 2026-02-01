import { FastifyInstance } from 'fastify';
import { chatController } from '../controllers/chat.controller.js';
import { z } from 'zod';

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /v1/chat
  fastify.post(
    '/v1/chat',
    {
      schema: {
        body: z.object({
          prompt: z.string(),
          sessionId: z.string().optional(),
          userId: z.string().optional(),
          maxHistoryMessages: z.number().optional(),
        }),
        response: {
          200: z.object({
            content: z.string(),
            sessionId: z.string(),
            messageId: z.string(),
            usage: z.object({
              inputTokens: z.number(),
              outputTokens: z.number(),
              totalTokens: z.number(),
              contextTokens: z.number(),
              historyTokens: z.number(),
            }),
            contextUsed: z.array(z.string()),
          }),
        },
      },
    },
    chatController.chat.bind(chatController)
  );

  // GET /v1/chat/sessions
  fastify.get(
    '/v1/chat/sessions',
    {
      schema: {
        response: {
          200: z.object({
            sessions: z.array(
              z
                .object({
                  id: z.string(),
                  title: z.string(),
                  userId: z.string(),
                  updatedAt: z.any().optional(), // Timestamp handling might need transformation
                  // ... other fields partial
                })
                .passthrough()
            ),
          }),
        },
      },
    },
    chatController.listSessions.bind(chatController)
  );

  // GET /v1/chat/sessions/:sessionId
  fastify.get(
    '/v1/chat/sessions/:sessionId',
    {
      schema: {
        params: z.object({
          sessionId: z.string(),
        }),
      },
    },
    chatController.getSession.bind(chatController)
  );
}
