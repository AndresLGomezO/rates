import { createVertexClient } from '../services/vertex.factory.js';
import { config } from './index.js';

export const vertexAIClient = createVertexClient(config);
