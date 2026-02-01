import {
  VertexErrorCode,
  ErrorClassification,
  VertexErrorDetails,
  SafetyRating,
  SafetyCategory,
  ValidationFailure,
} from '../types';

export interface VertexErrorOptions {
  cause?: Error;
  retryAfterMs?: number;
  context?: Record<string, unknown>;
}

export abstract class VertexAIError extends Error {
  /** Error code */
  abstract readonly code: VertexErrorCode;

  /** Error classification */
  abstract readonly classification: ErrorClassification;

  /** Whether error is retryable */
  abstract readonly retryable: boolean;

  /** Suggested retry delay */
  readonly retryAfterMs?: number;

  /** Original cause */
  readonly cause?: Error;

  /** Additional context */
  readonly context?: Record<string, unknown>;

  constructor(message: string, options?: VertexErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    this.retryAfterMs = options?.retryAfterMs;
    this.cause = options?.cause;
    this.context = options?.context;
  }

  /** Convert to plain object for logging */
  toJSON(): VertexErrorDetails {
    return {
      code: this.code,
      message: this.message,
      classification: this.classification,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      context: this.context,
    };
  }
}

// Transient errors
export class ServiceUnavailableError extends VertexAIError {
  readonly code = VertexErrorCode.SERVICE_UNAVAILABLE;
  readonly classification: ErrorClassification = 'transient';
  readonly retryable = true;
}

export class TimeoutError extends VertexAIError {
  readonly code = VertexErrorCode.DEADLINE_EXCEEDED;
  readonly classification: ErrorClassification = 'transient';
  readonly retryable = true;
}

export class QuotaExceededError extends VertexAIError {
  readonly code = VertexErrorCode.RESOURCE_EXHAUSTED;
  readonly classification: ErrorClassification = 'transient';
  readonly retryable = true;
}

export class InternalError extends VertexAIError {
  readonly code = VertexErrorCode.INTERNAL_ERROR;
  readonly classification: ErrorClassification = 'transient';
  readonly retryable = true;
}

// Permanent errors
export class ValidationError extends VertexAIError {
  readonly code = VertexErrorCode.VALIDATION_ERROR;
  readonly classification: ErrorClassification = 'permanent';
  readonly retryable = false;

  /** Validation failures */
  readonly validationErrors: ValidationFailure[] = [];

  constructor(
    message: string,
    options?: VertexErrorOptions & { validationErrors?: ValidationFailure[] }
  ) {
    super(message, options);
    if (options?.validationErrors) {
      this.validationErrors = options.validationErrors;
    }
  }
}

export class SafetyBlockError extends VertexAIError {
  readonly code = VertexErrorCode.SAFETY_BLOCKED;
  readonly classification: ErrorClassification = 'permanent';
  readonly retryable = false;

  /** Safety ratings that triggered block */
  readonly safetyRatings: SafetyRating[] = [];

  /** Categories that were blocked */
  readonly blockedCategories: SafetyCategory[] = [];

  constructor(
    message: string,
    options?: VertexErrorOptions & {
      safetyRatings?: SafetyRating[];
      blockedCategories?: SafetyCategory[];
    }
  ) {
    super(message, options);
    if (options?.safetyRatings) this.safetyRatings = options.safetyRatings;
    if (options?.blockedCategories)
      this.blockedCategories = options.blockedCategories;
  }
}

export class RecitationBlockError extends VertexAIError {
  readonly code = VertexErrorCode.RECITATION_BLOCKED;
  readonly classification: ErrorClassification = 'permanent';
  readonly retryable = false;
}

export class InvalidModelError extends VertexAIError {
  readonly code = VertexErrorCode.INVALID_MODEL;
  readonly classification: ErrorClassification = 'permanent';
  readonly retryable = false;

  /** Requested model */
  readonly requestedModel: string = '';

  /** Available models */
  readonly availableModels: string[] = [];

  constructor(
    message: string,
    options?: VertexErrorOptions & {
      requestedModel?: string;
      availableModels?: string[];
    }
  ) {
    super(message, options);
    if (options?.requestedModel) this.requestedModel = options.requestedModel;
    if (options?.availableModels)
      this.availableModels = options.availableModels;
  }
}

export class PermissionDeniedError extends VertexAIError {
  readonly code = VertexErrorCode.PERMISSION_DENIED;
  readonly classification: ErrorClassification = 'permanent';
  readonly retryable = false;
}

export class NotFoundError extends VertexAIError {
  readonly code = VertexErrorCode.NOT_FOUND;
  readonly classification: ErrorClassification = 'permanent';
  readonly retryable = false;
}

export class ConfigurationError extends VertexAIError {
  readonly code = VertexErrorCode.CONFIGURATION_ERROR;
  readonly classification: ErrorClassification = 'permanent';
  readonly retryable = false;
}
