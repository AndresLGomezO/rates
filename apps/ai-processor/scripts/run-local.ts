import { config } from 'dotenv';
import { processor } from '../src/processor';

/* eslint-disable no-console */

// Load local env
config({ path: '.env.development' });

// Simulate Pub/Sub message
const testMessage = {
  taskId: 'test-task-123',
  type: 'TEXT_GENERATION',
  userId: 'dev-user-123',
  payload: {
    prompt: 'Explain quantum computing in simple terms.',
    parameters: {
      maxOutputTokens: 1024,
    },
  },
  priority: 'normal',
  createdAt: new Date().toISOString(),
  attemptNumber: 1,
};

async function main() {
  console.log('🚀 Running AI Processor locally...');
  console.log('📨 Test message:', JSON.stringify(testMessage, null, 2));

  // Set environment variables that Cloud Run would set
  process.env.CLOUD_RUN_JOB = 'local-ai-processor';
  process.env.CLOUD_RUN_EXECUTION = 'local-exec-' + Date.now();
  process.env.CLOUD_RUN_TASK_INDEX = '0';
  process.env.CLOUD_RUN_TASK_COUNT = '1';
  process.env.CLOUD_RUN_TASK_ATTEMPT = '1';

  // Inject message (normally comes from Pub/Sub via Eventarc)
  process.env.PUBSUB_MESSAGE = Buffer.from(
    JSON.stringify(testMessage)
  ).toString('base64');

  try {
    await processor.run({});
    console.log('✅ Processor completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Processor failed:', error);
    process.exit(1);
  }
}

main();
