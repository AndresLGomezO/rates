import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('8080'),
  K_SERVICE: z.string().optional(),
  K_REVISION: z.string().optional(),
  ENV: z.enum(['dev', 'prod']).default('dev'),
  GCP_PROJECT_ID: z.string().default('rates-dev'), // Default for local dev
  VERTEX_AI_LOCATION: z.string().default('us-central1'),
  FIRESTORE_COLLECTION_PREFIX: z.string().default('dev'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  RATE_LIMIT_REQUESTS_PER_MIN: z.string().optional(),
  RATE_LIMIT_TOKENS_PER_DAY: z.string().optional(),
});

const env = envSchema.parse(process.env);

export const config = {
  port: parseInt(env.PORT, 10),
  serviceName: env.K_SERVICE || 'ai-service',
  revision: env.K_REVISION || 'local',
  env: env.ENV,
  gcp: {
    projectId: env.GCP_PROJECT_ID,
    location: env.VERTEX_AI_LOCATION,
  },
  firestore: {
    collectionPrefix: env.FIRESTORE_COLLECTION_PREFIX,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
};
