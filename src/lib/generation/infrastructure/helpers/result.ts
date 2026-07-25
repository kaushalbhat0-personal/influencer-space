import type { Result } from "@/lib/generation/domain";

export function success<T, E = Error>(data: T): Result<T, E> {
  return { success: true, data };
}

export function failure<T, E = Error>(error: E): Result<T, E> {
  return { success: false, error };
}

export function isSuccess<T, E = Error>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isFailure<T, E = Error>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

export function map<T, U, E = Error>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  return result.success ? success(fn(result.data)) : result;
}

export function flatMap<T, U, E = Error>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E> {
  return result.success ? fn(result.data) : result;
}

export function combine<T, E = Error>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];
  for (const r of results) {
    if (!r.success) return r;
    data.push(r.data);
  }
  return success(data);
}

export function unwrap<T, E = Error>(result: Result<T, E>): T {
  if (!result.success) throw result.error;
  return result.data;
}

export function unwrapOr<T, E = Error>(result: Result<T, E>, fallback: T): T {
  return result.success ? result.data : fallback;
}
