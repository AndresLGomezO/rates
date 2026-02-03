import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { UnauthorizedError } from '../utils/errors.js';
import { AuthenticatedRequest } from '../types/request.types.js';
import { config } from '../config/index.js';

const authService = new AuthService();

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  // Skip auth for health checks and OPTIONS (preflight) requests
  if (
    request.method === 'OPTIONS' ||
    request.url.startsWith('/health') ||
    request.url.startsWith('/ready')
  ) {
    return;
  }
  // Check if we should skip validation (local dev)
  // Check if we should skip validation (local dev)
  if (config.auth.skipValidation) {
    // Try to extract user ID from token if present, even if we skip verification
    const authHeader =
      (request.headers['x-forwarded-authorization'] as string) ||
      (request.headers['authorization'] as string);

    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (scheme === 'Bearer' && token) {
        try {
          // Decode token without verification to get payload
          const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString()
          );
          const uid = payload.user_id || payload.sub || payload.uid;

          if (uid) {
            (request as unknown as AuthenticatedRequest).user = {
              uid,
              email: payload.email || 'dev@example.com',
            };
            return;
          }
        } catch {
          // Ignore decoding errors in dev mode, fallback to mock
          request.log.warn(
            'Failed to decode token in dev mode, falling back to mock user'
          );
        }
      }
    }

    // Fallback: Always inject mock user for development when validation is skipped AND no valid token is provided
    (request as unknown as AuthenticatedRequest).user = {
      uid: 'dev-user-123',
      email: 'dev@example.com',
    };
    return;
  }

  const authHeader =
    (request.headers['x-forwarded-authorization'] as string) ||
    (request.headers['authorization'] as string);

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
