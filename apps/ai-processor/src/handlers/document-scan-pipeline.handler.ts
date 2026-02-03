import { BaseHandler } from './base.handler.js';
import { CheckpointData } from '../types/task.types.js';
import { z } from 'zod';

export interface DocumentScanInput {
  fileUri: string;
  mimeType: string;
}

export interface DocumentScanOutput {
  extractedData: {
    accountName: string;
    type: string;
    subtype?: string;
    balance?: number;
    currency?: string;
    dueDate?: string;
    interestRate?: number;
  };
  confidence: number;
}

const DocumentScanInputSchema = z.object({
  fileUri: z.string(),
  mimeType: z.string(),
});

export class DocumentScanPipelineHandler extends BaseHandler<
  DocumentScanInput,
  DocumentScanOutput
> {
  validate(payload: unknown): DocumentScanInput {
    const result = DocumentScanInputSchema.safeParse(payload);
    if (!result.success) {
      throw new Error(
        `Invalid payload for DOCUMENT_SCAN_PIPELINE: ${result.error.message}`
      );
    }
    return result.data;
  }

  async process(
    _input: DocumentScanInput,
    _checkpoint?: CheckpointData
  ): Promise<DocumentScanOutput> {
    const context = {
      logger: this.logger,
      updateCheckpoint: async (
        progress: number,
        data: Record<string, string>
      ) => {
        await this.updateProgress(progress);
        await this.saveCheckpoint({
          version: progress,
          handlerState: data,
          savedAt: new Date().toISOString(),
        });
      },
    };

    // Step 1: Extract data using Gemini Multi-modal
    await context.updateCheckpoint(0.2, { stage: 'OCR' });

    // In production, this would use this.vertexAI.generateContent(...)

    await context.updateCheckpoint(0.6, { stage: 'Mapping' });

    // Step 2: Map and Validate (Simulated result)
    const result: DocumentScanOutput = {
      extractedData: {
        accountName: 'Amex Gold Card',
        type: 'credit_card',
        subtype: 'credit_card',
        balance: 1250.5,
        currency: 'USD',
        dueDate: '2026-02-15',
      },
      confidence: 0.95,
    };

    await context.updateCheckpoint(1.0, { stage: 'Completed' });

    return result;
  }
}
