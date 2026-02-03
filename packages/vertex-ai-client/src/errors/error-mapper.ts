import {
  VertexAIError,
  ServiceUnavailableError,
  TimeoutError,
  QuotaExceededError,
  ValidationError,
  PermissionDeniedError,
  InternalError,
} from './vertex-error';

// We need to define or import GoogleCloudError interface if we want to type check it safely,
// or simply use structured duck typing.
interface GoogleCloudError {
  code?: number | string;
  message?: string;
  details?: string;
  // Add other fields as necessary
}

// Helper to check if error is a Google Cloud error
function isGoogleCloudError(error: unknown): error is GoogleCloudError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'details' in error)
  );
}

// Helper to check for network errors
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('network') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT'))
  );
}

// Helper to check for timeout
function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('deadline exceeded') ||
      error.message.includes('timeout'))
  );
}

export class ErrorMapper {
  /**
   * Map SDK error to VertexAIError
   */
  static map(error: unknown): VertexAIError {
    // If it's already a VertexAIError, return it
    if (error instanceof VertexAIError) {
      return error;
    }

    // Handle Google Cloud SDK errors
    if (isGoogleCloudError(error)) {
      return this.mapGoogleCloudError(error);
    }

    // Handle network errors
    if (isNetworkError(error)) {
      return new ServiceUnavailableError(
        'Network error communicating with Vertex AI',
        { cause: error as Error }
      );
    }

    // Handle timeout errors
    if (isTimeoutError(error)) {
      return new TimeoutError('Request timed out', { cause: error as Error });
    }

    // Unknown error - Map to InternalError with UNKNOWN code logic if possible,
    // but InternalError uses INTERNAL_ERROR code.
    // We'll create a generic InternalError but maybe with a clear message.
    return new InternalError(
      error instanceof Error ? error.message : 'Unknown error',
      {
        cause: error instanceof Error ? error : undefined,
        // InternalError sets code to INTERNAL_ERROR, which is fine for unknown.
      }
    );
  }

  private static mapGoogleCloudError(error: GoogleCloudError): VertexAIError {
    // Check specific gRPC codes or string codes
    const code = error.code;
    const message = error.message ?? 'Unknown Google Cloud Error';

    // String codes often returned by client wrappers
    if (code === 'UNAVAILABLE' || code === 14) {
      return new ServiceUnavailableError(message, { cause: error as Error });
    }

    if (code === 'DEADLINE_EXCEEDED' || code === 4) {
      return new TimeoutError(message, { cause: error as Error });
    }

    if (code === 'RESOURCE_EXHAUSTED' || code === 8) {
      return new QuotaExceededError(message, {
        cause: error as Error,
        // Extract retry info if available, but for now undefined
      });
    }

    if (code === 'INVALID_ARGUMENT' || code === 3) {
      return new ValidationError(message, { cause: error as Error });
    }

    if (code === 'PERMISSION_DENIED' || code === 7) {
      return new PermissionDeniedError(message, { cause: error as Error });
    }

    // Treat 404 / Publisher Model not found as ValidationError (Configuration error) - Non-retryable
    if (
      code === 404 ||
      code === 'NOT_FOUND' ||
      message.includes('Publisher Model') ||
      message.includes('not found')
    ) {
      return new ValidationError(message, { cause: error as Error });
    }

    if (code === 'INTERNAL' || code === 13) {
      return new InternalError(message, { cause: error as Error });
    }

    return new InternalError(message, { cause: error as Error });
  }
}
