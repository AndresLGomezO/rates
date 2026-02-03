import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const configSchema = z.object({
  ENV: z.enum(['dev', 'prod', 'local']).default('local'),
  GCP_PROJECT_ID: z.string().min(1),
  VERTEX_AI_LOCATION: z.string().default('us-central1'),
  FIRESTORE_COLLECTION_PREFIX: z.string().default(''),
  // Cloud Run Job Environment Variables
  CLOUD_RUN_JOB: z.string().optional(),
  CLOUD_RUN_EXECUTION: z.string().optional(),
  CLOUD_RUN_TASK_INDEX: z.coerce.number().optional(),
  CLOUD_RUN_TASK_COUNT: z.coerce.number().optional(),
  // Mock Settings
  VERTEX_AI_MOCK: z.string().optional(),
  VERTEX_AI_MOCK_DELAY: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const parsed = configSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      '❌ Invalid environment configuration:',
      parsed.error.format()
    );
    process.exit(1);
  }

  return parsed.data;
}

export const config = loadConfig();
