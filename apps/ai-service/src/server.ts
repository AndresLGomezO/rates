import Fastify from 'fastify';
import protobuf from 'protobufjs';
import Long from 'long';

// Fix for "util.Long.fromValue is not a function"
// This ensures that protobufjs correctly utilizes the long library
// for 64-bit integer support in Google Cloud libraries.
(protobuf.util as any).Long = Long;
protobuf.configure();
import { logger } from './utils/logger.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import { registerRoutes } from './routes/index.js';

export async function createServer() {
  const fastify = Fastify({
    logger: true,
    disableRequestLogging: true,
  });

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-forwarded-authorization',
      'x-user-id',
      'x-request-id',
    ],
  });

  // 1. Error Handler
  fastify.setErrorHandler(errorHandler);

  // 2. Middleware (Hooks)
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', rateLimitMiddleware);

  // 3. Routes
  fastify.register(registerRoutes);

  return fastify;
}

export async function startServer() {
  const server = await createServer();
  const port = Number(process.env.PORT) || 8080;

  try {
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`Server listening on port ${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}
