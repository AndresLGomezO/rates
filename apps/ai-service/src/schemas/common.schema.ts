import { z } from 'zod';

export const commonSchemas = {
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  headers: z.object({
    authorization: z.string().describe('IAM Identity Token').optional(),
    'x-forwarded-authorization': z
      .string()
      .describe('Firebase User ID Token')
      .optional(),
    'x-request-id': z.string().uuid().optional(),
    'x-correlation-id': z.string().optional(),
    'x-user-id': z.string().optional(),
    'x-skip-cache': z.string().optional(),
  }),
};
