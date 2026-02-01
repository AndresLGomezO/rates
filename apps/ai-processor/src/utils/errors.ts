export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PermanentError extends BaseError {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export class TransientError extends BaseError {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export class ShutdownError extends BaseError {
  constructor(message: string = 'Shutdown requested') {
    super(message);
  }
}

export class ValidationError extends PermanentError {
  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
