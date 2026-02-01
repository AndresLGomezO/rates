import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../types/request.types.js';
import { usageService } from '../services/index.js';

export class UsageController {
  async getUserUsage(request: FastifyRequest, _reply: FastifyReply) {
    const userRequest = request as unknown as AuthenticatedRequest;
    const userId = userRequest.user.uid;

    const usage = await usageService.getUserUsage(userId);
    return usage;
  }
}
