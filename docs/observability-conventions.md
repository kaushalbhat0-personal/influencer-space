# Observability Conventions

## Canonical Logger

**Location:** `src/lib/observability/logger.ts`  
**Import:** `import { logger } from "@/lib/observability"`

### Log Levels

| Level | Usage |
|-------|-------|
| TRACE | Detailed step-by-step execution flow |
| DEBUG | Development diagnostics |
| INFO | Normal operational events |
| WARN | Unexpected but handled situations |
| ERROR | Recoverable failures |
| FATAL | Unrecoverable failures |

### Logging a message

```ts
logger.info("Payment captured", "billing", {
  operation: "capture_payment",
  correlation: correlationContext,
  duration: elapsedMs,
  metadata: { invoiceId, amount },
});
```

### Logging an error

```ts
try { ... } catch (error) {
  logger.error("Failed to process payment", "billing", {
    operation: "capture_payment",
    correlation: correlationContext,
    error: error instanceof Error ? error : new Error(String(error)),
  });
}
```

### Using child loggers

```ts
const log = logger.child("my-service", { workspaceId: "ws-123" });
log.info("Workspace-specific operation");
// Produces JSON with service="my-service", workspaceId="ws-123"
```

### Automatic fields

Every log entry includes:
- `timestamp` — ISO 8601
- `level` — TRACE/DEBUG/INFO/WARN/ERROR/FATAL
- `message` — human-readable description
- `service` — originating service name
- `environment` — NODE_ENV value
- `correlationId` — from correlation context when available
- `workspaceId` — from correlation context when available
- `tenantId` — from correlation context when available
- `requestId` — from correlation context when available
- `operation` — operation name when provided
- `duration` — elapsed ms when provided
- `error` — structured error when present

---

## Correlation IDs

**Location:** `src/lib/platform/correlation/`  
**Import:** `import { correlationService } from "@/lib/platform/correlation"`

### Creating a correlation context

```ts
const ctx = correlationService.create({ workflowId: "publishing" });
```

### For API routes

```ts
import { withCorrelation } from "@/lib/platform/correlation";

export const GET = withCorrelation(async (context) => {
  logger.info("API route called", "my-route", { correlation: context });
  return { data: "ok" };
});
```

### For server actions

```ts
import { createActionCorrelation } from "@/lib/platform/correlation";

const ctx = createActionCorrelation({ workspaceId: "ws-123" });
```

### Correlation via headers

HTTP requests should include:
- `x-correlation-id` — trace identifier
- `x-request-id` — request identifier
- `x-workspace-id` — workspace context

Responses include `x-correlation-id` for traceability.

---

## Metrics

**Location:** `src/lib/observability/metrics-service.ts`  
**Import:** `import { metricsService } from "@/lib/observability"`

### Recording durations

```ts
metricsService.recordDuration("publish", elapsedMs, { websiteId });
```

### Tracking operations

```ts
import { trackDuration } from "@/lib/observability";
const result = await trackDuration("provision", () => provisioningService.provision(input));
```

### Recording outcomes

```ts
metricsService.recordOutcome("billing_execution", true);
```

---

## Error Tracking

**Location:** `src/lib/observability/error-tracker.ts`  
**Import:** `import { captureError } from "@/lib/observability"`

```ts
try { ... } catch (error) {
  captureError(error, {
    service: "billing",
    operation: "capture_payment",
    correlation: correlationContext,
  });
}
```

---

## Health Checks

**Location:** `src/lib/observability/health-service.ts`  
**Import:** `import { healthService } from "@/lib/observability"`

```ts
const report = await healthService.checkAll();
// report.overall: "healthy" | "warning" | "critical" | "offline"
```

---

## Workflow Diagnostics

**Location:** `src/lib/observability/workflow-diagnostics.ts`  
**Import:** `import { runWorkflow } from "@/lib/observability"`

```ts
const result = await runWorkflow("publishing", async (correlation) => {
  return publishingService.publish(websiteId, correlation);
});
// result.success, result.durationMs, result.correlationId
```

---

## Alert Rules

**Location:** `src/lib/observability/alert-rules.ts`  
**Import:** `import { ALERT_RULES, getAlertRule } from "@/lib/observability"`

Thresholds define when operations exceed acceptable duration. See the file for all 9 defined rules.

---

## Dashboard Metrics

**Location:** `src/lib/observability/dashboard-metrics.ts`  
**Import:** `import { dashboardMetricsService } from "@/lib/observability"`

```ts
const metrics = await dashboardMetricsService.collect();
// Returns MRR, ARR, failure counts, success rates, tenant counts
```

---

## Quick Reference

| Capability | Import Path | Key Export |
|-----------|-------------|------------|
| Logger | `@/lib/observability` | `logger`, `LogLevel` |
| Correlation | `@/lib/platform/correlation` | `correlationService`, `withCorrelation` |
| Metrics | `@/lib/observability` | `metricsService`, `trackDuration` |
| Error Tracking | `@/lib/observability` | `captureError`, `errorToRecovery` |
| Health | `@/lib/observability` | `healthService` |
| Workflow | `@/lib/observability` | `runWorkflow` |
| Alerts | `@/lib/observability` | `ALERT_RULES`, `getAlertRule` |
| Dashboard | `@/lib/observability` | `dashboardMetricsService` |
