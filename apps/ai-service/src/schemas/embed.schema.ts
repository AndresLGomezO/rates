import { z } from 'zod';

export const requestSchema = z
  .object({
    text: z.string().optional(),
    texts: z.array(z.string()).max(100).optional(),
    model: z.string().optional(),
  })
  .refine((data) => data.text || data.texts, {
    message: "Either 'text' or 'texts' must be provided",
  });

export const responseSchema = z.object({
  requestId: z.string(),
  embeddings: z.array(
    z.object({
      index: z.number(),
      vector: z.array(z.number()),
    })
  ),
  model: z.string(),
  dimensions: z.number(),
});
