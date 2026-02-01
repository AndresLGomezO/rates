import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { GenerateController } from '../controllers/generate.controller.js';
import { requestSchema, responseSchema } from '../schemas/generate.schema.js';
import { commonSchemas } from '../schemas/common.schema.js';

const controller = new GenerateController();

export async function generateRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/generate',
    {
      schema: {
        body: requestSchema,
        response: { 200: responseSchema },
        headers: commonSchemas.headers,
      },
    },
    controller.generate
  );
}
