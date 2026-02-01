import { VertexAIClient } from '@rates/vertex-ai-client';
import { config } from './index.js';

export const vertexAIClient = new VertexAIClient({
  projectId: config.gcp.projectId,
  location: config.gcp.location,
});
