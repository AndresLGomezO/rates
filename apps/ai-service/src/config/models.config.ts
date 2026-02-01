import { config } from './index.js';

export const modelsConfig = {
  default: process.env.DEFAULT_MODEL || 'gemini-2.0-flash-001',
  embeddings: 'text-embedding-004',
  supported: [
    'gemini-2.0-flash-001',
    'gemini-1.5-pro-002',
    'text-embedding-004',
  ],
};
