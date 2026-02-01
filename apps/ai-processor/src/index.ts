import { processor } from './processor.js';
import { logger } from './utils/logger.js';
import { AIMessageSchema } from './schemas/message.js';
import { registerShutdownHandler } from './utils/shutdown.js';

async function main() {
  logger.info({ event: 'job_started' }, 'AI Processor Job Started');

  // Register shutdown handler
  registerShutdownHandler(async () => {
    // Any global cleanup if needed
    logger.info('Gracefully shutting down...');
  });

  try {
    // 1. STARTUP: Parse incoming Pub/Sub message
    let rawMessage =
      process.env.MESSAGE_DATA || process.env.MESSAGE_JSON || process.argv[2];

    if (!rawMessage) {
      // Check if running in emulator or dev mode with mock data
      // For now, failure.
      logger.error(
        'No message received. Set MESSAGE_DATA, MESSAGE_JSON, or pass as argument.'
      );
      process.exit(1);
    }

    // Attempt to parse JSON (handling base64 if needed)
    let messageParams: unknown;
    try {
      if (process.env.MESSAGE_DATA) {
        const buffer = Buffer.from(rawMessage, 'base64');
        rawMessage = buffer.toString('utf-8');
      }
      messageParams = JSON.parse(rawMessage);
    } catch (e) {
      logger.error({ error: e, rawMessage }, 'Failed to parse message JSON');
      process.exit(1);
    }

    // 2. VALIDATION (Schema)
    const parseResult = AIMessageSchema.safeParse(messageParams);

    if (!parseResult.success) {
      logger.error(
        {
          error: parseResult.error.format(),
          event: 'message_validation_failed',
        },
        'Invalid message schema'
      );
      // Permanent validation failure -> exit 1 (retry handled by policy, or DLQ logic if implemented)
      // Spec says exit 1 triggers retry. If schema is bad, it will fail forever.
      // Ideally we exit 0 to drop it, but spec says exit 0 means "processed".
      // If we exit 0 here without marking FAILED in DB, it just disappears.
      // So we should probably exit 0 but log it.
      // However, we can't update DB because we might not have taskId if schema failed.
      // So exit 1 and let it DLQ eventually is safer than silent drop.
      process.exit(1);
    }

    const message = parseResult.data;
    logger.info(
      {
        event: 'message_received',
        taskId: message.taskId,
        type: message.type,
      },
      'Message parsed successfully'
    );

    // 3. EXECUTE PROCESSOR
    await processor.run(message);

    // Processor handles its own exit codes for logic errors/success
    // If run() returns, it means we are effectively done with this execution context (maybe waiting for asyncs?)
    // But Processor.run is async void and handles exit inside?
    // Wait, the Processor.run I wrote has `process.exit` calls inside `handleError`.
    // But for success case it just returns.

    // So if we return here, we should exit 0.
    process.exit(0);
  } catch (error) {
    logger.error(
      { event: 'job_failed', error },
      'Unhandled job execution error'
    );
    process.exit(1);
  }
}

main();
