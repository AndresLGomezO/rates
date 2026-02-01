import { FastifyInstance } from 'fastify';
import { generateRoutes } from './generate.routes.js';
import { embedRoutes } from './embed.routes.js';
import { taskRoutes } from './tasks.routes.js';
import { usageRoutes } from './usage.routes.js';
import { healthRoutes } from './health.routes.js';
import { chatRoutes } from './chat.routes.js';

export async function registerRoutes(app: FastifyInstance) {
  app.register(healthRoutes);
  app.register(generateRoutes);
  app.register(embedRoutes);
  app.register(taskRoutes);
  app.register(usageRoutes);
  app.register(chatRoutes);
}
