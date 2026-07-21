"use client";

import { useState, useCallback } from "react";
import { platform } from "@/lib/platform/api";
import type { TelemetrySnapshot } from "@/lib/telemetry/types";
import type { PlatformDiagnosticsReport } from "@/lib/platform/api/platform";

export function usePlatformStatus() {
  const [diagnostics, setDiagnostics] = useState<PlatformDiagnosticsReport | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      setDiagnostics(platform.diagnostics());
      setTelemetry(platform.telemetry.snapshot());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load platform status");
    } finally {
      setLoading(false);
    }
  }, []);

  return { diagnostics, telemetry, loading, error, refresh };
}
