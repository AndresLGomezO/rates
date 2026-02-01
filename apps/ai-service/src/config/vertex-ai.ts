import { VertexAIClient, createClientConfig } from '@rates/vertex-ai-client';
import { config } from './index.js';

export const vertexAIClient = new VertexAIClient(
  createClientConfig({
    projectId: config.gcp.projectId,
    location: config.gcp.location,
  })
);
