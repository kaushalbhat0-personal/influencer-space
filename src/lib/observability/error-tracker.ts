import { logger } from "./logger";
import { metricsService } from "./metrics-service";
import type { MetricOperation } from "./metrics-service";
import type { CorrelationContext } from "@/lib/platform/correlation/types";
import { computeFingerprint } from "./fingerprint";
import { redactMessage, redactStack } from "./redact";
import { getDeploymentContext } from "./deployment";

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
  route?: string;
  level?: string;
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
  const level = context?.level ?? severity;

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

  // RCCF-OBS-01 — durable upsert (fire-and-forget, never throws)
  void persistSystemError(captured, {
    service,
    operation: context?.operation,
    code: captured.code,
    correlation: context?.correlation,
    tenantId: context?.tenantId,
    route: context?.route,
    level,
  }).catch(() => {});

  return captured;
}

export function errorToRecovery(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code;
    if (code && RECOVERY_HINTS[code]) return RECOVERY_HINTS[code];
  }
  return "No automated recovery — investigate manually";
}

// ── RCCF-OBS-01 durable ledger ───────────────────────────────────────────

const FLOOD_WINDOW_MS = 60_000;
const FLOOD_THRESHOLD = 20;
const FLOOD_SAMPLE_RATE = 10;

type FloodEntry = { windowStart: number; countInWindow: number };
const floodMap = new Map<string, FloodEntry>();

function shouldPersist(fingerprint: string): boolean {
  const now = Date.now();
  const entry = floodMap.get(fingerprint);
  if (!entry || now - entry.windowStart > FLOOD_WINDOW_MS) {
    floodMap.set(fingerprint, { windowStart: now, countInWindow: 1 });
    return true;
  }
  entry.countInWindow += 1;
  if (entry.countInWindow <= FLOOD_THRESHOLD) return true;
  // sample after threshold: 1 in 10
  return entry.countInWindow % FLOOD_SAMPLE_RATE === 0;
}

function getRouteFromHeaders(): string | undefined {
  try {
    // next/headers is available in Server Components / Route Handlers
    // Use dynamic import to avoid bundling issues in client
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const h = require("next/headers") as { headers: () => { get: (k: string) => string | null } };
    const headers = h.headers();
    return (
      headers.get("x-invoke-path") ??
      headers.get("x-middleware-route") ??
      headers.get("referer") ??
      undefined
    )?.slice(0, 500) ?? undefined;
  } catch {
    return undefined;
  }
}

async function persistSystemError(
  captured: CapturedError,
  ctx: {
    service: string;
    operation?: string;
    code?: string;
    correlation?: CorrelationContext | string;
    tenantId?: string;
    route?: string;
    level: string;
  },
): Promise<void> {
  try {
    const message = redactMessage(captured.message);
    const stackTrace = redactStack(captured.stack);
    const fingerprint = computeFingerprint({
      service: ctx.service,
      operation: ctx.operation,
      code: ctx.code,
      message: captured.message,
      stack: captured.stack,
    });

    if (!shouldPersist(fingerprint)) return;

    const correlationId =
      typeof ctx.correlation === "string" ? ctx.correlation : ctx.correlation?.correlationId ?? undefined;
    const tenantIds: string[] = ctx.tenantId && !ctx.tenantId.includes("@") ? [ctx.tenantId] : [];
    const route = ctx.route ?? getRouteFromHeaders();
    const { environment, deploymentId, commitSha } = getDeploymentContext();
    const level = ctx.level === "FATAL" ? "FATAL" : ctx.level === "ERROR" ? "ERROR" : ctx.level === "WARN" ? "WARN" : "ERROR";

    if (typeof window !== "undefined") return;
    // Use eval to hide prisma import from client bundler (pg requires Node built-ins)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaMod: any = await (0, eval)('import("@/lib/prisma")');
    const prisma: any = prismaMod.prisma ?? prismaMod.default?.prisma ?? prismaMod.default;

    const existing = await prisma.systemError.findFirst({ where: { fingerprint }, select: { id: true, tenantIds: true, count: true, status: true } });

    const recovery = captured.recovery ?? (captured.code ? RECOVERY_HINTS[captured.code] : undefined) ?? null;

    if (existing) {
      const prevIds = Array.isArray(existing.tenantIds) ? (existing.tenantIds as string[]) : [];
      const mergedIds = tenantIds.length ? Array.from(new Set([...prevIds, ...tenantIds])).slice(0, 20) : prevIds;
      const shouldReopen = existing.status === "RESOLVED";
      await prisma.systemError.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastSeen: new Date(),
          tenantIds: mergedIds,
          // keep latest stack if different
          ...(stackTrace ? { stackTrace } : {}),
          ...(correlationId ? { correlationId } : {}),
          ...(route ? { route } : {}),
          ...(recovery ? { recovery } : {}),
          ...(shouldReopen ? { status: "NEW" } : {}),
        },
      });
    } else {
      await prisma.systemError.create({
        data: {
          fingerprint,
          count: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
          level,
          service: ctx.service,
          operation: ctx.operation ?? null,
          route: route ?? null,
          message: message.slice(0, 2000),
          stackTrace: stackTrace?.slice(0, 8000) ?? null,
          code: ctx.code ?? null,
          tenantIds: tenantIds,
          correlationId: correlationId ?? null,
          environment,
          deploymentId,
          commitSha,
          recovery,
          status: "NEW",
        },
      });
    }
  } catch {
    // Never throw from observability
  }
}

// For testing — reset flood map
export function __resetFloodForTests(): void {
  floodMap.clear();
}
export function __getFloodEntryForTests(fingerprint: string): FloodEntry | undefined {
  return floodMap.get(fingerprint);
}
