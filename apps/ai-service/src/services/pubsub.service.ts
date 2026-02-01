import { PubSub } from '@google-cloud/pubsub';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class PubSubService {
  private pubsub: PubSub;
  private topicName: string;

  constructor() {
    this.pubsub = new PubSub({
      projectId: config.gcp.projectId,
    });
    this.topicName = `rates-${config.env}-ai-tasks`;
  }

  async publishTask(
    taskData: Record<string, unknown> & { taskId: string }
  ): Promise<string> {
    const dataBuffer = Buffer.from(JSON.stringify(taskData));

    try {
      const messageId = await this.pubsub
        .topic(this.topicName)
        .publishMessage({ data: dataBuffer });

      logger.info(
        { messageId, taskId: taskData.taskId },
        'Published task to Pub/Sub'
      );
      return messageId;
    } catch (error) {
      logger.error(
        { error, taskId: taskData.taskId },
        'Failed to publish task to Pub/Sub'
      );
      throw error;
    }
  }
}
