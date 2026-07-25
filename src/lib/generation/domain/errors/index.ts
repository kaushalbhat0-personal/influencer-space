export class GenerationError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
    this.context = context;
  }
}

export class PipelineError extends GenerationError {
  readonly stage: string;

  constructor(stage: string, message: string, context: Record<string, unknown> = {}) {
    super("PIPELINE_ERROR", `[${stage}] ${message}`, context);
    this.name = "PipelineError";
    this.stage = stage;
  }
}

export class ProviderError extends GenerationError {
  readonly provider: string;

  constructor(provider: string, message: string, context: Record<string, unknown> = {}) {
    super("PROVIDER_ERROR", `[${provider}] ${message}`, context);
    this.name = "ProviderError";
    this.provider = provider;
  }
}

export class BudgetExceededError extends GenerationError {
  readonly requested: number;
  readonly remaining: number;

  constructor(requested: number, remaining: number) {
    super(
      "BUDGET_EXCEEDED",
      `AI budget exceeded: requested ${requested}, remaining ${remaining}`,
      { requested, remaining },
    );
    this.name = "BudgetExceededError";
    this.requested = requested;
    this.remaining = remaining;
  }
}

export class GenerationCancelledError extends GenerationError {
  readonly generationId: string;

  constructor(generationId: string) {
    super("GENERATION_CANCELLED", `Generation cancelled: ${generationId}`, { generationId });
    this.name = "GenerationCancelledError";
    this.generationId = generationId;
  }
}

export class StageExecutionError extends PipelineError {
  readonly stageId: string;

  constructor(stage: string, stageId: string, message: string, context: Record<string, unknown> = {}) {
    super(stage, message, { ...context, stageId });
    this.name = "StageExecutionError";
    this.stageId = stageId;
  }
}

export class CheckpointError extends GenerationError {
  readonly generationId: string;

  constructor(generationId: string, message: string) {
    super("CHECKPOINT_ERROR", message, { generationId });
    this.name = "CheckpointError";
    this.generationId = generationId;
  }
}

export class ValidationError extends GenerationError {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    const messages = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("; ");
    super("VALIDATION_ERROR", `Validation failed: ${messages}`, { fields });
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class LockNotAcquiredError extends GenerationError {
  readonly resource: string;

  constructor(resource: string) {
    super("LOCK_NOT_ACQUIRED", `Could not acquire lock for: ${resource}`, { resource });
    this.name = "LockNotAcquiredError";
    this.resource = resource;
  }
}
