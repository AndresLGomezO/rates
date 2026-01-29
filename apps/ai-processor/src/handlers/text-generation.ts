import { TaskHandler, TaskResult } from './types.js';
import { AIMessage } from '@rates/firebase-client/ai-tasks';
import { logger } from '../lib/logger.js';
// import { getGenerativeModel, MODELS } from '../lib/vertex-ai.js';
import { TextGenerationPayload } from '../schemas/message.js';

export const textGenerationHandler: TaskHandler = {
  async process(message: AIMessage): Promise<TaskResult> {
    logger.info({ taskId: message.taskId }, 'Processing TEXT_GENERATION task');

    // Safe parse payload specifically for this type
    const payloadResult = TextGenerationPayload.safeParse(message.payload);
    if (!payloadResult.success) {
      throw new Error(
        `Invalid payload for TEXT_GENERATION: ${payloadResult.error.message}`
      );
    }

    // Stub implementation
    logger.info('Stub: Creating Vertex AI client and generating content...');

    // Example of using the Vertex AI client (commented out for stub)
    /*
        const model = getGenerativeModel(MODELS.GEMINI_FLASH);
        const result = await model.generateContent(payloadResult.data.prompt);
        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;
        */

    return {
      content: 'Stubbed generated text content',
      tokenUsage: {
        input: 100,
        output: 50,
      },
    };
  },
};
