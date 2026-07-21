/**
 * Dashboard Hook Types v1.0.0
 *
 * Shared types for all dashboard hooks.
 * Standardizes loading, error, empty, and mutation states.
 */
import type { ContentModuleAPI } from "@/lib/content/manifest";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  empty: boolean;
}

export interface MutationState<T = void> {
  loading: boolean;
  error: string | null;
  success: boolean;
  data: T | null;
}

export interface AsyncResult<T> {
  data: T;
  loading: false;
  error: null;
  empty: boolean;
}

export type DashboardStatus = "idle" | "loading" | "success" | "error" | "empty";

export interface DashboardAction<TInput = void, TOutput = void> {
  execute(input: TInput): Promise<TOutput>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset(): void;
}

export type PlatformContentModule<T extends ContentModuleAPI = ContentModuleAPI> = T;
