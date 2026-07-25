import { ProviderError } from "@/lib/generation/contracts";

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(provider, `Provider ${provider} timed out after ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(provider: string) {
    super(provider, `Provider ${provider} authentication failed`);
    this.name = "ProviderAuthError";
  }
}

export class ProviderRateLimitError extends ProviderError {
  readonly retryAfterMs: number;

  constructor(provider: string, retryAfterMs = 60000) {
    super(provider, `Provider ${provider} rate limited`);
    this.name = "ProviderRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string) {
    super(provider, `Provider ${provider} unavailable`);
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderModelNotFoundError extends ProviderError {
  readonly model: string;

  constructor(provider: string, model: string) {
    super(provider, `Model ${model} not found on provider ${provider}`);
    this.name = "ProviderModelNotFoundError";
    this.model = model;
  }
}
