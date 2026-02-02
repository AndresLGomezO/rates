import { FastifyReply, FastifyRequest } from 'fastify';
import { documentExtractionService } from '../services/document-extraction.service.js';

interface ExtractDocumentBody {
  file: string; // Base64 encoded including data:image/..., or just raw base64
  mimeType: string;
}

export class DocumentController {
  async extract(
    req: FastifyRequest<{ Body: ExtractDocumentBody }>,
    reply: FastifyReply
  ) {
    const { file, mimeType } = req.body;

    if (!file || !mimeType) {
      return reply.code(400).send({
        error: 'Missing file or mimeType',
      });
    }

    try {
      // Remove data:image/xxx;base64, prefix if present
      const base64Data = file.replace(/^data:.*,/, '');
      console.log(
        `[DocumentController] Cleaned Base64 (first 50): ${base64Data.substring(0, 50)}`
      );

      const result = await documentExtractionService.extractAccountDetails(
        base64Data,
        mimeType
      );

      return reply.send(result);
    } catch (error) {
      req.log.error(error);
      return reply.code(500).send({
        error: 'Failed to extract document details',
      });
    }
  }
}

export const documentController = new DocumentController();
