import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { UnauthorizedError } from '../utils/errors.js';
import { AuthenticatedRequest } from '../types/request.types.js';

const authService = new AuthService();

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  // Skip auth for health checks
  if (request.url.startsWith('/health') || request.url.startsWith('/ready')) {
    return;
  }

  const authHeader = request.headers['x-forwarded-authorization'] as string;
  if (!authHeader) {
    throw new UnauthorizedError('Missing authentication header');
  }

  // Expect format "Bearer {token}"
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Invalid authentication header format');
  }

  try {
    const user = await authService.verifyToken(token);
    (request as unknown as AuthenticatedRequest).user = user;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
