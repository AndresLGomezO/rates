import { GenerativeModel } from '@google-cloud/vertexai';
import {
  StreamingGenerationRequest,
  GenerationResponse,
  StreamingChunk,
} from '../types';
import { ResponseParser, VertexResponse } from '../utils/response-parser';
import { ErrorMapper } from '../errors/error-mapper';

export class StreamingClient {
  constructor(private _client: unknown) {}

  async generateStream(
    model: GenerativeModel,
    request: StreamingGenerationRequest
  ): Promise<GenerationResponse> {
    const startTime = Date.now();
    let _chunkIndex = 0;

    try {
      const streamingResp = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        // Add system instruction if supported and provided
        // systemInstruction: request.systemContext ? { parts: [{ text: request.systemContext }] } : undefined,
        // (Check SDK version for systemInstruction support, assume yes for Gemini)

        // Map generation config
        generationConfig: {
          temperature: request.parameters?.temperature,
          maxOutputTokens: request.parameters?.maxOutputTokens,
          topP: request.parameters?.topP,
          topK: request.parameters?.topK,
          stopSequences: request.parameters?.stopSequences,
          candidateCount: request.parameters?.candidateCount,
        },

        // Map safety settings if provided
      });

      // The result is an async iterable
      for await (const item of streamingResp.stream) {
        const candidate = item.candidates?.[0];
        const contentPart = candidate?.content?.parts?.[0]?.text ?? '';

        // Create chunk
        const chunk: StreamingChunk = {
          content: contentPart,
          index: _chunkIndex++,
          isFinal: false,
          // Token count might not be available in every chunk, usually at the end or aggregated
          tokenCount: item.usageMetadata?.totalTokenCount,
        };

        request.onChunk(chunk);
      }

      // Final response construction
      const responseResult = await streamingResp.response;

      const finalResponse = ResponseParser.parseGenerationResponse(
        responseResult as VertexResponse,
        'unknown-model-id-here',
        startTime
      );

      // Notify complete
      if (request.onComplete) {
        request.onComplete(finalResponse);
      }

      return finalResponse;
    } catch (error) {
      const vertexError = ErrorMapper.map(error);
      if (request.onError) {
        request.onError(vertexError);
      }
      throw vertexError;
    }
  }
}
