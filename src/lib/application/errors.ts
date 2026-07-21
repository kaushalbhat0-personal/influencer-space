/**
 * Application Error Model v1.0.0
 *
 * Typed error hierarchy for application services.
 * Normalizes platform errors, validation errors, and infrastructure errors
 * into user-facing messages without leaking implementation details.
 */

export enum ApplicationErrorCode {
  UNKNOWN = "APP_000",
  NOT_FOUND = "APP_001",
  VALIDATION = "APP_002",
  PERMISSION = "APP_003",
  INFRASTRUCTURE = "APP_004",
  BUSINESS_RULE = "APP_005",
  RETRYABLE = "APP_006",
  DUPLICATE = "APP_007",
  LIMIT_EXCEEDED = "APP_008",
}

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code: ApplicationErrorCode = ApplicationErrorCode.UNKNOWN,
    options?: { statusCode?: number; retryable?: boolean; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.statusCode = options?.statusCode ?? 500;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details ?? {};
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string, id: string) {
    super(
      `${entity} not found`,
      ApplicationErrorCode.NOT_FOUND,
      { statusCode: 404, details: { entity, id } }
    );
  }
}

export class ValidationError extends ApplicationError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>, message?: string) {
    super(
      message ?? "Validation failed",
      ApplicationErrorCode.VALIDATION,
      { statusCode: 422, details: { fieldErrors } }
    );
    this.fieldErrors = fieldErrors;
  }
}

export class PermissionError extends ApplicationError {
  constructor(action?: string) {
    super(
      `Permission denied${action ? `: ${action}` : ""}`,
      ApplicationErrorCode.PERMISSION,
      { statusCode: 403 }
    );
  }
}

export class LimitExceededError extends ApplicationError {
  constructor(limit: string, current: number, max: number) {
    super(
      `${limit} limit reached (${current}/${max})`,
      ApplicationErrorCode.LIMIT_EXCEEDED,
      { statusCode: 422, details: { limit, current, max } }
    );
  }
}

export class InfrastructureError extends ApplicationError {
  constructor(message: string, originalError?: unknown) {
    super(
      message,
      ApplicationErrorCode.INFRASTRUCTURE,
      {
        statusCode: 500,
        retryable: true,
        details: { originalMessage: originalError instanceof Error ? originalError.message : String(originalError) },
      }
    );
  }
}

export function normalizeError(error: unknown, entityName?: string): ApplicationError {
  if (error instanceof ApplicationError) return error;

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("not found")) {
    return new NotFoundError(entityName ?? "Entity", "");
  }
  if (message.includes("already taken") || message.includes("duplicate")) {
    return new ApplicationError(message, ApplicationErrorCode.DUPLICATE, { statusCode: 409 });
  }
  if (message.includes("Unauthorized") || message.includes("Forbidden")) {
    return new PermissionError();
  }
  if (message.includes("limit") || message.includes("exceed")) {
    return new LimitExceededError(entityName ?? "Resource", 0, 0);
  }

  return new ApplicationError(message, ApplicationErrorCode.UNKNOWN, { statusCode: 500 });
}
