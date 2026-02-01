import { BaseHandler } from './base.handler.js';
import { DocumentQAPayload, DocumentQAResult } from '../types/task.types.js';
import { DocumentQAPayloadSchema } from '../schemas/task.schema.js';
import { CheckpointData } from '../types/task.types.js';
import { MODELS } from '../services/vertex-ai.service.js';
import { ValidationError, PermanentError } from '../utils/errors.js';

export class DocumentQAHandler extends BaseHandler<
  DocumentQAPayload,
  DocumentQAResult
> {
  validate(payload: unknown): DocumentQAPayload {
    const result = DocumentQAPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new ValidationError(
        'Invalid payload for DOCUMENT_QA',
        result.error.format()
      );
    }
    return result.data;
  }

  async process(
    payload: DocumentQAPayload,
    _checkpoint?: CheckpointData
  ): Promise<DocumentQAResult> {
    this.checkShutdown();

    // Load documents
    const documents = payload.documents || [];

    if (payload.documentRefs) {
      // TODO: Load from Firestore
      throw new PermanentError('documentRefs support not yet implemented');
    }

    if (documents.length === 0) {
      throw new ValidationError('No documents provided');
    }

    // Prepare context
    const context = documents
      .map((d) => `Doc ID: ${d.id}\nContent: ${d.content}`)
      .join('\n\n');

    const prompt = `Answer the question based ONLY on the provided documents.
    Question: ${payload.question}

    Documents:
    ${context}`;

    const response = await this.vertexAI.generateContent({
      model: MODELS.GEMINI_FLASH, // QA models often benefit from Pro, but Flash is faster
      prompt: prompt,
    });

    return {
      answer: response.content,
      confidence: 0.9, // Mock confidence
      references: [], // Mock refs, specialized model or post-processing needed for citations
      documentsUsed: documents.length,
    };
  }
}
