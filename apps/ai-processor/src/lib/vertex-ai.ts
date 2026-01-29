import { VertexAI } from '@google-cloud/vertexai';
import { config } from '../config.js';
import { logger } from './logger.js';

logger.info(
  { location: config.VERTEX_AI_LOCATION },
  'Initializing Vertex AI Client'
);

const vertexAI = new VertexAI({
  project: config.GCP_PROJECT_ID,
  location: config.VERTEX_AI_LOCATION,
});

// Default models as per spec 4.2.1
// "Gemini 2.0 Flash (default), Gemini 2.0 Pro, text-embedding-005"
// Note: Gemini 2.0 model names might be 'gemini-2.0-flash-exp' or similar depending on release.
// Using generic placeholders or current available ones.
// As of 2026 (spec date), likely 'gemini-2.0-flash' or similar.
// I'll stick to string constants we can update.

export const MODELS = {
  GEMINI_FLASH: 'gemini-2.0-flash-001', // Example version
  GEMINI_PRO: 'gemini-2.0-pro-001',
  EMBEDDING: 'text-embedding-005',
};

export const getGenerativeModel = (modelName: string = MODELS.GEMINI_FLASH) => {
  return vertexAI.getGenerativeModel({ model: modelName });
};
