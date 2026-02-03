import { vertexAIService } from './vertex-ai.service.js';
import { CreateFinancialAccountInput } from '@rates/firebase-client';

export class DocumentExtractionService {
  /**
   * Extract financial account details from a document
   * @param fileBase64 Base64 encoded file content
   * @param mimeType MIME type of the file (e.g. image/jpeg, application/pdf)
   */
  async extractAccountDetails(
    fileBase64: string,
    mimeType: string
  ): Promise<Partial<CreateFinancialAccountInput>> {
    console.log(
      `[DocumentExtractionService] Starting extraction. File size: ${fileBase64.length}, Mime: ${mimeType}`
    );
    console.log(
      '[DocumentExtractionService] PROMPT_VERSION_CHECK_V1: No hardcoded values.'
    );

    const extractionRules = `You are a specialized financial document analysis AI.
Your ONLY purpose is to extract structured data from financial documents (bills, statements, contracts) via OCR and visual analysis.

# OUTPUT FORMAT
Return a Markdown code block with two sections:
1. **RAW_TEXT**: A verbatim transcript of the important document text.
2. **JSON**: The structured data object (wrapped in \`\`\`json\`).

JSON Structure to use (set missing values to null):
{
  "accountName": "string",
  "accountType": "revolving_credit | installment_loan | bill",
  "currentBalance": { "amount": number, "currency": "USD" },
  "minimumPayment": { "amount": number, "currency": "USD" },
  "nextDueDate": "YYYY-MM-DD",
  "statementDayOfMonth": number
}

# CRITICAL RULES
1. **TRANSCRIPTION FIRST**: You MUST find the text in the image before filling the JSON.
2. **NO HALLUCINATIONS**: If "Acme Corp" or "John Doe" is not in the document, DO NOT USE IT.
3. **NULLS**: If a value is hidden or missing, return null.`;

    // MERGED PROMPT: Combining rules + task into one prompt to ensure the model sees the image context with the instructions.
    const prompt = `${extractionRules}\n\nStep 1: Transcribe all visible text from the attached image. Step 2: Extract the financial data into the specified JSON format.`;

    console.log('Sending extraction request to Vertex AI...');

    const response = await vertexAIService.generateContent({
      // Use the client's default model (configured in infra as gemini-2.0-flash)
      prompt,
      // systemContext: undefined, // Explicitly undefined to rely on the merged prompt
      images: [
        {
          mimeType,
          data: fileBase64,
        },
      ],
      parameters: {
        temperature: 0.1, // Low temperature for factual extraction
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40,
      },
    });

    console.log('Received raw response from Vertex AI:', response.content);

    try {
      let jsonString = '';

      // Priority 1: Markdown code block
      const markdownMatch = response.content.match(/```json([\s\S]*?)```/);
      if (markdownMatch && markdownMatch[1]) {
        jsonString = markdownMatch[1].trim();
      } else {
        // Priority 2: Greedy brace match (fallback)
        const braceMatch = response.content.match(/\{[\s\S]*\}/);
        jsonString = braceMatch ? braceMatch[0] : response.content;
      }

      console.log(
        `[DocumentExtractionService] Attempting to parse: ${jsonString.substring(0, 50)}...`
      );

      const jsonContent = JSON.parse(jsonString);
      return jsonContent;
    } catch (error) {
      console.error('Failed to parse extraction response:', error);
      throw new Error('Failed to extract structured data from document');
    }
  }
}

export const documentExtractionService = new DocumentExtractionService();
