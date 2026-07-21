/**
 * Application Service Types v1.1.0
 *
 * Base types for application services and DTOs.
 *
 * CQRS readiness: commands and queries are separated at the interface
 * level so read models (search, analytics, feeds) can evolve
 * independently of write models (CRUD, validation, events).
 */

import type { ApplicationError } from "./errors";

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ApplicationError;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CommandResult {
  success: boolean;
  error?: ApplicationError;
  fieldErrors?: Record<string, string[]>;
}

export type ApplicationServiceStatus = "idle" | "loading" | "success" | "error";

export interface ServiceMethod<I, O> {
  readonly name: string;
  execute(input: I): Promise<O>;
}

// ── CQRS CONTRACTS ───────────────────────────────────────────────────────────

/**
 * A read-side service only performs queries.
 * It never mutates state. Safe to cache, replicate, or offload.
 */
export interface QueryService<TFilter, TEntity> {
  query(filter: TFilter): Promise<ServiceResult<TEntity[]>>;
  findById?(id: string): Promise<ServiceResult<TEntity | null>>;
}

/**
 * A command-side service only performs mutations.
 * It never returns query models. Safe to queue, retry, or route through
 * a command bus.
 */
export interface CommandService<TInput, TOutput> {
  execute(input: TInput): Promise<ServiceResult<TOutput>>;
}

/**
 * Service that has been split into separate command and query halves.
 * Consumers can depend on either half independently when CQRS is introduced.
 */
export interface CQRSApplicationService<TCmd, TQuery> {
  readonly commands: TCmd;
  readonly queries: TQuery;
}

export interface ReadService<TQuery, TEntity> {
  query(query: TQuery): Promise<TEntity[]>;
  findById(id: string): Promise<TEntity | null>;
}

export interface WriteService<TInput, TEntity> {
  create(input: TInput): Promise<TEntity>;
  update(id: string, input: Partial<TInput>): Promise<TEntity | null>;
  delete(id: string): Promise<boolean>;
}

export interface ApplicationService<TApi> {
  readonly name: string;
  readonly api: TApi;
  diagnostics(): Promise<Record<string, unknown>>;
}
