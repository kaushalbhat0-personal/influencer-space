"use client";

import { useState, useCallback, useRef } from "react";
import type { AsyncState, AsyncResult } from "./types";

export function useAsyncState<T>(
  initialData?: T | null
): AsyncState<T> & {
  setData(data: T | null): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  reset(): void;
  map<U>(fn: (data: T) => U): AsyncResult<U> | null;
} {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(initialData ?? null);
    setLoading(false);
    setError(null);
  }, [initialData]);

  const map = useCallback(
    <U,>(fn: (d: T) => U): AsyncResult<U> | null => {
      if (loading || error || data === null) return null;
      return { data: fn(data), loading: false, error: null, empty: false };
    },
    [data, loading, error]
  );

  const empty = !loading && !error && (data === null || (Array.isArray(data) && data.length === 0));

  return { data, loading, error, empty, setData, setLoading, setError, reset, map };
}

export function useMutation<TInput, TOutput>(): {
  execute(fn: (input: TInput) => Promise<TOutput>): (input: TInput) => Promise<TOutput | null>;
  loading: boolean;
  error: string | null;
  success: boolean;
  data: TOutput | null;
  reset(): void;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<TOutput | null>(null);
  const mountedRef = useRef(true);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setData(null);
  }, []);

  const execute = useCallback(
    (fn: (input: TInput) => Promise<TOutput>) =>
      async (input: TInput): Promise<TOutput | null> => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        setData(null);
        try {
          const result = await fn(input);
          if (mountedRef.current) {
            setData(result);
            setSuccess(true);
          }
          return result;
        } catch (e) {
          const message = e instanceof Error ? e.message : "Operation failed";
          if (mountedRef.current) {
            setError(message);
          }
          return null;
        } finally {
          if (mountedRef.current) setLoading(false);
        }
      },
    []
  );

  return { execute, loading, error, success, data, reset };
}
