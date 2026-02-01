import { BaseHandler } from './base.handler.js';
import {
  SummarizationPayload,
  SummarizationResult,
} from '../types/task.types.js';
import { SummarizationPayloadSchema } from '../schemas/task.schema.js';
import { CheckpointData } from '../types/task.types.js';
import { MODELS } from '../services/vertex-ai.service.js';
import { ValidationError, PermanentError } from '../utils/errors.js';

export class SummarizationHandler extends BaseHandler<
  SummarizationPayload,
  SummarizationResult
> {
  validate(payload: unknown): SummarizationPayload {
    const result = SummarizationPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new ValidationError(
        'Invalid payload for SUMMARIZATION',
        result.error.format()
      );
    }
    return result.data;
  }

  async process(
    payload: SummarizationPayload,
    _checkpoint?: CheckpointData
  ): Promise<SummarizationResult> {
    this.checkShutdown();

    const contentToSummarize = payload.content;

    // TODO: If contentRef is provided, load from Firestore (not implemented in stub)
    if (payload.contentRef) {
      // Spec 3.2: "One of content or contentRef required"
      // We need to implement loading from Firestore if ref is present.
      // For now, if no content is directly provided, validation might pass but we need it here.
      if (!contentToSummarize) {
        throw new PermanentError('contentRef support not yet implemented');
      }
    }

    if (!contentToSummarize) {
      throw new ValidationError('No content provided to summarize');
    }

    // Construct prompt
    const prompt = `Please summarize the following text. 
    Summary Type: ${payload.summaryType || 'brief'}
    Target Length: ${payload.maxLength || 'automatic'} words/tokens.
    Language: ${payload.language || 'original'}.

    Text:
    ${contentToSummarize}`;

    const response = await this.vertexAI.generateContent({
      model: MODELS.GEMINI_FLASH,
      prompt: prompt,
    });

    return {
      summary: response.content,
      summaryType: payload.summaryType,
      originalLength: contentToSummarize.length,
      summaryLength: response.content.length,
      compressionRatio: response.content.length / contentToSummarize.length,
      tokenUsage: response.tokenUsage,
    };
  }
}
