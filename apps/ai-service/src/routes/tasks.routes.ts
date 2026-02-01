import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { TaskController } from '../controllers/tasks.controller.js';
import {
  createTaskSchema,
  taskResponseSchema,
} from '../schemas/task.schema.js';
import { commonSchemas } from '../schemas/common.schema.js';
import { z } from 'zod';

const controller = new TaskController();

export async function taskRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/tasks',
    {
      schema: {
        body: createTaskSchema,
        response: { 202: taskResponseSchema },
        headers: commonSchemas.headers,
      },
    },
    controller.createTask
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/tasks/:taskId',
    {
      schema: {
        params: z.object({ taskId: z.string() }),
        headers: commonSchemas.headers,
      },
    },
    controller.getTask
  );

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/v1/tasks/:taskId',
    {
      schema: {
        params: z.object({ taskId: z.string() }),
        headers: commonSchemas.headers,
      },
    },
    controller.cancelTask
  );
}
