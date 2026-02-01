import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { EmbedController } from '../controllers/embed.controller.js';
import { requestSchema, responseSchema } from '../schemas/embed.schema.js';
import { commonSchemas } from '../schemas/common.schema.js';

const controller = new EmbedController();

export async function embedRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/embed',
    {
      schema: {
        body: requestSchema,
        response: { 200: responseSchema },
        headers: commonSchemas.headers,
      },
    },
    controller.embed
  );
}
