"use client";

/**
 * Construction snapshot hook — IMPLEMENTATION-29.
 *
 * Loads the REAL storefront runtime snapshot (via the existing runtime) and
 * refreshes it only when the active construction milestone changes. Pure data
 * fetching — no timers, no simulated progress.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getConstructionSnapshot, type ConstructionSnapshotData } from "@/actions/construction.actions";

export interface ConstructionSnapshotOptions {
  sessionId?: string;
  subdomain?: string;
  /** Refetch when this value changes (e.g. the current generation stage). */
  refreshKey?: string | null;
  enabled?: boolean;
  /** When true, force a final load even if refreshKey is null/deduped (completion). */
  isComplete?: boolean;
  progress?: number;
}

export interface ConstructionSnapshotState {
  snapshot: ConstructionSnapshotData | null;
  isLoading: boolean;
  error: string | null;
}

export function useConstructionSnapshot({
  sessionId,
  subdomain,
  refreshKey,
  enabled = true,
  isComplete = false,
  progress,
}: ConstructionSnapshotOptions): ConstructionSnapshotState & { refetch: () => void } {
  const [state, setState] = useState<ConstructionSnapshotState>({ snapshot: null, isLoading: false, error: null });
  const keyRef = useRef<string | null>(null);
  const completeRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const load = useCallback(async () => {
    if (!enabledRef.current || (!sessionId && !subdomain)) return;
    setState((s) => ({ ...s, isLoading: true }));
    const result = await getConstructionSnapshot(sessionId ? { sessionId } : { subdomain });
    if (!result.success) {
      setState({ snapshot: null, isLoading: false, error: result.error ?? "Failed to load construction snapshot" });
      return;
    }
    setState({ snapshot: result.snapshot ?? null, isLoading: false, error: null });
  }, [sessionId, subdomain]);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    if (!sessionId && !subdomain) return;
    // Final completion should trigger a fresh load even if refreshKey is deduped as null
    const shouldForceComplete = (isComplete || progress === 100) && !completeRef.current;
    if (shouldForceComplete) {
      completeRef.current = true;
      keyRef.current = "__complete__";
      void load();
      return;
    }
    if (keyRef.current === refreshKey) return;
    keyRef.current = refreshKey ?? "";
    void load();
  }, [enabled, sessionId, subdomain, refreshKey, isComplete, progress, load]);

  return { ...state, refetch: load };
}
