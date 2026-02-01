import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export function errorHandler(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.id;

  // Log the error
  logger.error({ err: error, requestId }, 'Request failed');

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof z.ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = error.errors;
  } else if (error.code === 'FST_ERR_VALIDATION') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = error.message;
  }

  reply.status(statusCode).send({
    error: {
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
