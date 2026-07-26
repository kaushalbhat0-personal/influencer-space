"use client";

import { useState, useCallback } from "react";
import type { OptimisticUpdate } from "../types";

export function useOptimistic<T extends Record<string, unknown>>(
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [history, setHistory] = useState<Array<OptimisticUpdate<T>>>([]);

  const apply = useCallback(
    (updates: Partial<T>, rollback: () => Promise<void>) => {
      const previous = { ...data };
      const updated = { ...data, ...updates } as T;

      setHistory((prev) => [
        ...prev,
        { previous, updated, timestamp: Date.now() },
      ]);
      setData(updated);

      rollback().catch(() => {
        setData(previous);
      });
    },
    [data],
  );

  const rollback = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setData(last.previous);
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  const set = useCallback((value: T | ((prev: T) => T)) => {
    setData(value);
  }, []);

  return { data, set, apply, rollback, history };
}
