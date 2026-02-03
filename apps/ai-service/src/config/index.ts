import dotenv from 'dotenv';
import { z } from 'zod';

import path from 'path';

dotenv.config();

// Load .env.development if in dev mode (overriding .env)
const isDev =
  process.env.ENV === 'dev' ||
  process.env.ENV === 'development' ||
  process.env.NODE_ENV === 'development' ||
  !process.env.ENV;

if (isDev) {
  // Capture shell variable to prevent overwrite
  const shellVertexMock = process.env.VERTEX_AI_MOCK;

  // Only override if NOT running in Cloud Run (K_SERVICE is set in Cloud Run)
  const isCloudRun = !!process.env.K_SERVICE;

  dotenv.config({
    path: path.resolve(process.cwd(), '.env.development'),
    override: !isCloudRun,
  });

  // Restore shell variable if it was set
  if (shellVertexMock !== undefined) {
    process.env.VERTEX_AI_MOCK = shellVertexMock;
  }
}

const envSchema = z.object({
  PORT: z.string().default('8080'),
  K_SERVICE: z.string().optional(),
  K_REVISION: z.string().optional(),
  ENV: z.enum(['dev', 'development', 'prod', 'production']).default('dev'),
  GCP_PROJECT_ID: z.string().default('rates-dev'), // Default for local dev
  VERTEX_AI_PROJECT_ID: z.string().optional(), // Specific for Vertex AI if different
  VERTEX_AI_LOCATION: z.string().default('us-central1'),
  FIRESTORE_COLLECTION_PREFIX: z.string().default('dev'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  RATE_LIMIT_REQUESTS_PER_MIN: z.string().optional(),
  RATE_LIMIT_TOKENS_PER_DAY: z.string().optional(),

  // Local Dev / Mock
  VERTEX_AI_MOCK: z.string().optional(),
  VERTEX_AI_MOCK_DELAY: z.string().optional(),
  SKIP_AUTH_VALIDATION: z.string().optional(),
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
  vertexAI: {
    projectId: env.VERTEX_AI_PROJECT_ID || env.GCP_PROJECT_ID, // Use specific ID or fall back to main project ID
    useMock:
      env.VERTEX_AI_MOCK === 'true' ||
      ((env.ENV === 'dev' || env.ENV === 'development') &&
        env.VERTEX_AI_MOCK !== 'false'),
    mockDelay: parseInt(env.VERTEX_AI_MOCK_DELAY || '500', 10),
  },
  firestore: {
    collectionPrefix: env.FIRESTORE_COLLECTION_PREFIX,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  auth: {
    skipValidation:
      env.SKIP_AUTH_VALIDATION === 'true' ||
      env.ENV === 'dev' ||
      env.ENV === 'development',
  },
};

export type AppConfig = typeof config;
