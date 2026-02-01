import {
  VertexAIClient,
  MockVertexAIClient,
  createClientConfig,
} from '@rates/vertex-ai-client';
import { config, AppConfig } from '../config/index.js';

export type IVertexClient = VertexAIClient | MockVertexAIClient;

export function createVertexClient(
  appConfig: AppConfig = config
): IVertexClient {
  const isMock = appConfig.vertexAI.useMock;

  if (isMock) {
    console.log('🔶 Using MOCK Vertex AI client');
    // @ts-expect-error - MockVertexAIClient implements Partial<VertexAIClient> but used as IVertexClient
    return new MockVertexAIClient({
      delay: appConfig.vertexAI.mockDelay,
    });
  }

  console.log('🟢 Using REAL Vertex AI client');
  return new VertexAIClient(
    createClientConfig({
      projectId: appConfig.gcp.projectId,
      location: appConfig.gcp.location,
    })
  );
}
