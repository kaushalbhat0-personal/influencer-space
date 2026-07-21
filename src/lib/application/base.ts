/**
 * Base Application Service v1.0.0
 *
 * Provides error normalization, result wrapping, and diagnostic
 * infrastructure for all application services.
 */

import { normalizeError } from "./errors";
import type { ServiceResult, CommandResult } from "./types";

export abstract class BaseAppService {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  protected success<T>(data: T): ServiceResult<T> {
    return { success: true, data };
  }

  protected failed(error: unknown, entity?: string): ServiceResult<never> {
    const appError = normalizeError(error, entity);
    return { success: false, error: appError };
  }

  protected commandSuccess(): CommandResult {
    return { success: true };
  }

  protected commandFailed(
    error: unknown,
    entity?: string
  ): CommandResult {
    const appError = normalizeError(error, entity);
    return { success: false, error: appError };
  }

  protected wrapAsync<T>(
    fn: () => Promise<T>,
    entity?: string
  ): Promise<ServiceResult<T>> {
    return fn()
      .then((data) => this.success(data))
      .catch((error) => this.failed(error, entity));
  }

  protected wrapCommand(
    fn: () => Promise<void>,
    entity?: string
  ): Promise<CommandResult> {
    return fn()
      .then(() => this.commandSuccess())
      .catch((error) => this.commandFailed(error, entity));
  }
}
