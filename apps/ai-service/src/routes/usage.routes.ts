import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { UsageController } from '../controllers/usage.controller.js';
import { commonSchemas } from '../schemas/common.schema.js';
import { z } from 'zod';

const controller = new UsageController();

export async function usageRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/usage',
    {
      schema: {
        headers: commonSchemas.headers,
        querystring: z.object({ period: z.string().optional() }),
      },
    },
    controller.getUserUsage
  );
}
