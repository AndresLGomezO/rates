/**
 * Error classification
 */
export type ErrorClassification = 'transient' | 'permanent';

/**
 * Vertex AI error codes
 */
export enum VertexErrorCode {
  // Transient errors (retryable)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DEADLINE_EXCEEDED = 'DEADLINE_EXCEEDED',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Permanent errors (not retryable)
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  INVALID_MODEL = 'INVALID_MODEL',
  SAFETY_BLOCKED = 'SAFETY_BLOCKED',
  RECITATION_BLOCKED = 'RECITATION_BLOCKED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',

  // Client errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error details structure
 */
export interface VertexErrorDetails {
  /** Error code */
  code: VertexErrorCode;

  /** Error message */
  message: string;

  /** Error classification */
  classification: ErrorClassification;

  /** Whether retryable */
  retryable: boolean;

  /** Suggested retry delay (ms) */
  retryAfterMs?: number;

  /** Original error from SDK */
  cause?: Error;

  /** Additional context */
  context?: Record<string, unknown>;
}
