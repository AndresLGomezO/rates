import { FastifyRequest, FastifyReply } from 'fastify';
import {
  AuthenticatedRequest,
  CreateTaskRequest,
} from '../types/request.types.js';
import { pubsubService, taskRepo, usageService } from '../services/index.js';
import { randomUUID } from 'crypto';
import { NotFoundError } from '../utils/errors.js';

export class TaskController {
  async createTask(request: FastifyRequest, reply: FastifyReply) {
    const userRequest = request as AuthenticatedRequest;
    const body = request.body as CreateTaskRequest;
    const taskId = randomUUID();
    const userId = userRequest.user.uid;

    const taskData = {
      taskId,
      type: body.type,
      userId,
      payload: body.payload,
      priority: body.priority || 'normal',
      webhookUrl: body.webhookUrl,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      attemptNumber: 0,
    };

    // 1. Store initial task state in Firestore
    await taskRepo.createTask(taskData);

    // 2. Publish to Pub/Sub
    await pubsubService.publishTask(taskData);

    // 3. Track usage (task creation count)
    await usageService.trackUsage(userId, { tasks: 1 });

    reply.status(202).send({
      taskId,
      status: 'PENDING',
      type: body.type,
      createdAt: taskData.createdAt,
      statusUrl: `/v1/tasks/${taskId}`,
    });
  }

  async getTask(request: FastifyRequest, _reply: FastifyReply) {
    const userRequest = request as AuthenticatedRequest;
    const { taskId } = request.params as { taskId: string };
    const userId = userRequest.user.uid;

    const task = await taskRepo.getTask(taskId);

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Security: Only allow user to access their own tasks
    if (task.userId !== userId) {
      throw new NotFoundError('Task not found'); // Mask existence
    }

    return task;
  }

  async cancelTask(request: FastifyRequest, reply: FastifyReply) {
    const userRequest = request as AuthenticatedRequest;
    const { taskId } = request.params as { taskId: string };
    const userId = userRequest.user.uid;

    const task = await taskRepo.getTask(taskId);
    if (!task || task.userId !== userId) {
      throw new NotFoundError('Task not found');
    }

    if (
      task.status === 'PROCESSING' ||
      task.status === 'COMPLETED' ||
      task.status === 'FAILED'
    ) {
      // Ideally we'd return specific errors or just state current status, but spec says 409 if processing
      if (task.status === 'PROCESSING') {
        reply.status(409).send({
          error: {
            code: 'TASK_ALREADY_PROCESSING',
            message: 'Task is already being processed',
          },
        });
        return;
      }
    }

    await taskRepo.updateTaskStatus(taskId, 'CANCELLED');

    return {
      taskId,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    };
  }
}
