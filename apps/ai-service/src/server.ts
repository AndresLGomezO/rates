import Fastify from 'fastify';
import { logger } from './utils/logger.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { registerRoutes } from './routes/index.js';

export async function createServer() {
  const fastify = Fastify({
    logger: true,
    disableRequestLogging: true,
  });

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

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
