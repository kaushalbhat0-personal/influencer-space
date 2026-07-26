export class InfrastructureError extends Error {
  readonly cause?: unknown;
  readonly operation: string;

  constructor(operation: string, message: string, cause?: unknown) {
    super(message);
    this.name = "InfrastructureError";
    this.operation = operation;
    this.cause = cause;
  }
}
