"use client";

import { useRef, useEffect, useCallback } from "react";
import type { AutosaveOptions } from "../types";

export function useAutosave<T>(
  data: T,
  save: (data: T) => Promise<void>,
  isDirty: boolean,
  options: AutosaveOptions = {},
) {
  const { intervalMs = 3000, onError } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  const saveRef = useRef(save);

  dataRef.current = data;
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (!isDirty) return;
    try {
      await saveRef.current(dataRef.current);
    } catch (err) {
      onError?.(err);
    }
  }, [isDirty, onError]);

  useEffect(() => {
    if (!isDirty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      flush();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isDirty, intervalMs, flush]);

  return { flush };
}
