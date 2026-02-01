import { BaseHandler } from './base.handler.js';
import {
  TextGenerationPayload,
  TextGenerationResult,
} from '../types/task.types.js';
import { TextGenerationPayloadSchema } from '../schemas/task.schema.js';
import { CheckpointData } from '../types/task.types.js';
import { MODELS } from '../services/vertex-ai.service.js';
import { ValidationError } from '../utils/errors.js';

export class TextGenerationHandler extends BaseHandler<
  TextGenerationPayload,
  TextGenerationResult
> {
  validate(payload: unknown): TextGenerationPayload {
    const result = TextGenerationPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new ValidationError(
        'Invalid payload for TEXT_GENERATION',
        result.error.format()
      );
    }
    return result.data;
  }

  async process(
    payload: TextGenerationPayload,
    _checkpoint?: CheckpointData
  ): Promise<TextGenerationResult> {
    this.checkShutdown();

    // Spec 3.1: "No checkpointing needed (single API call)"

    // Construct Vertex request
    const response = await this.vertexAI.generateContent({
      model: payload.model || MODELS.GEMINI_FLASH, // Default model from spec or service constant
      prompt: payload.prompt,
      systemContext: payload.systemContext,
      config: payload.parameters,
    });

    return {
      content: response.content,
      finishReason: response.finishReason,
      tokenUsage: response.tokenUsage,
    };
  }
}
