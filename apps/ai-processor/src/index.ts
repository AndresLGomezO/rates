import { config } from './config.js';
import { logger } from './lib/logger.js';
import { AIMessageSchema } from './schemas/message.js';
import { firestore, TASKS_COLLECTION } from './lib/firestore.js';
import { processTask } from './handlers/index.js';

async function main() {
  logger.info({ event: 'job_started' }, 'AI Processor Job Started');

  try {
    // 1. STARTUP: Parse incoming Pub/Sub message
    // Support message passing via env var (base64 encoded or raw JSON) or CLI arg
    let rawMessage =
      process.env.MESSAGE_DATA || process.env.MESSAGE_JSON || process.argv[2];

    if (!rawMessage) {
      throw new Error(
        'No message received. Set MESSAGE_DATA, MESSAGE_JSON, or pass as argument.'
      );
    }

    // Attempt to parse JSON (handling base64 if needed)
    let messageParams: unknown;
    try {
      // Check if it looks like base64 (simple heuristic or try-catch)
      // Usually Pub/Sub pushes base64 data.
      if (process.env.MESSAGE_DATA) {
        const buffer = Buffer.from(rawMessage, 'base64');
        rawMessage = buffer.toString('utf-8');
      }
      messageParams = JSON.parse(rawMessage);
    } catch (e) {
      logger.error({ error: e, rawMessage }, 'Failed to parse message JSON');
      process.exit(1);
    }

    // 2. VALIDATION
    const parseResult = AIMessageSchema.safeParse(messageParams);

    if (!parseResult.success) {
      logger.error(
        {
          error: parseResult.error.format(),
          event: 'message_validation_failed',
        },
        'Invalid message schema'
      );
      // Per spec: Log, exit failure (DLQ after retries)
      // But if it's permanent schema error, maybe we should swallow?
      // Spec says: "Permanent parsing/validation failures -> Messages sent to DLQ".
      // Exit 1 triggers retry in Cloud Run Jobs?
      // Spec 6.3: "Max delivery attempts exceeded ... Permanent parsing...".
      // Usually if we exit 1, it retries. If we want to DLQ immediately we might need to handle DLQ push ourselves OR assume the retry policy consumes attempts.
      // Spec 6.1 says "Message Parse Error -> Log, exit failure (DLQ after retries)".
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

    // 2. VALIDATION: Check for duplicate processing (Idempotency) & Task State
    // Load task from Firestore
    const taskRef = firestore.collection(TASKS_COLLECTION).doc(message.taskId);
    const taskSnapshot = await taskRef.get();

    if (!taskSnapshot.exists) {
      logger.warn(
        { event: 'task_not_found', taskId: message.taskId },
        'Task document not found in Firestore'
      );
      // Spec 6.1: "Task Not Found -> Log, exit success (no retry)"
      process.exit(0);
    }

    const taskData = taskSnapshot.data();
    if (taskData?.status === 'COMPLETED' || taskData?.status === 'FAILED') {
      logger.info(
        {
          event: 'task_already_processed',
          taskId: message.taskId,
          status: taskData.status,
        },
        'Task already processed'
      );
      // Spec 6.1: "Task Already Processed -> Log, exit success"
      process.exit(0);
    }

    // 3. PROCESSING
    // Update status to PROCESSING
    await taskRef.update({
      status: 'PROCESSING',
      processingStartedAt: new Date().toISOString(),
      processorExecutionId: config.CLOUD_RUN_EXECUTION || 'local',
      attemptNumber: message.attemptNumber,
    });

    logger.info(
      { event: 'processing_started', taskId: message.taskId },
      'Started processing task'
    );

    // Dispatch to handler
    const result = await processTask(message);

    // 4. COMPLETION (Success)
    await taskRef.update({
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      result: result,
      resultStoredAt: new Date().toISOString(),
    });
    logger.info(
      { event: 'task_completed', taskId: message.taskId },
      'Task completed'
    );

    process.exit(0);
  } catch (error) {
    logger.error({ event: 'job_failed', error }, 'Job execution failed');
    process.exit(1);
  }
}

main();
