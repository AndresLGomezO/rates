import { GenerationResponse } from '@rates/vertex-ai-client';

export type VertexGenerateResponse = GenerationResponse;
export type VertexCountTokensResponse = { totalTokens: number };

export interface VertexEmbedResponse {
  embeddings: {
    values: number[];
  }[];
}
