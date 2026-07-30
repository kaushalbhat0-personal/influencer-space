import { logger } from "./logger";
import { metricsService } from "./metrics-service";
import type { MetricOperation } from "./metrics-service";
import type { CorrelationContext } from "@/lib/platform/correlation/types";

export const RECOVERY_HINTS: Record<string, string> = {
  P2002: "Unique constraint violation — check for duplicate records",
  P2025: "Record not found — verify the ID exists",
  P1000: "Database connection failed — check database status",
  ECONNREFUSED: "Connection refused — verify the service is running",
  ETIMEOUT: "Connection timed out — check network and service health",
  ENOTFOUND: "DNS resolution failed — verify the service URL",
};

export interface CapturedError {
  message: string;
  name: string;
  stack?: string;
  code?: string;
  recovery?: string;
}

export function captureError(error: unknown, context?: {
  service?: string;
  operation?: string;
  correlation?: CorrelationContext | string;
  workspaceId?: string;
  tenantId?: string;
}): CapturedError {
  const isError = error instanceof Error;
  const code = isError
    ? (error as Error & { code?: string }).code
    : undefined;

  const captured: CapturedError = {
    message: isError ? error.message : String(error),
    name: isError ? error.name : "UnknownError",
    stack: isError ? error.stack : undefined,
    code,
    recovery: code ? RECOVERY_HINTS[code] : undefined,
  };

  const service = context?.service || "unknown";
  const severity = code && RECOVERY_HINTS[code] ? "ERROR" : "WARN";

  logger.error(captured.message, service, {
    operation: context?.operation,
    correlation: context?.correlation,
    error: captured as Error & { recovery?: string },
    metadata: {
      errorName: captured.name,
      errorCode: captured.code,
      workspaceId: context?.workspaceId,
      tenantId: context?.tenantId,
    },
  });

  metricsService.recordOutcome(
    (context?.operation || "unknown") as MetricOperation,
    false,
    { error: captured.name, errorCode: captured.code || "none" },
  );

  if (severity === "ERROR") {
    metricsService.recordDuration(
      (context?.operation || "unknown") as MetricOperation,
      0,
      { error: captured.name, status: "error" },
    );
  }

  return captured;
}

export function errorToRecovery(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code && RECOVERY_HINTS[code]) return RECOVERY_HINTS[code];
  }
  return "No automated recovery — investigate manually";
}
