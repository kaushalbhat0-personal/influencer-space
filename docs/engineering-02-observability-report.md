# ENGINEERING-02: Observability & Production Operations

**Date:** 2026-07-30  
**Status:** Complete  
**TypeScript errors:** 0 ✅  
**Build:** `npm run build` passes ✅  

---

## Architecture

### One Canonical System Per Capability

| Capability | Service | Location |
|-----------|---------|----------|
| Logging | `logger` | `src/lib/observability/logger.ts` |
| Correlation | `correlationService` | `src/lib/platform/correlation/` |
| Metrics | `metricsService` | `src/lib/observability/metrics-service.ts` |
| Error Tracking | `captureError` | `src/lib/observability/error-tracker.ts` |
| Health | `healthService` | `src/lib/observability/health-service.ts` |
| Workflow Diagnostics | `runWorkflow` | `src/lib/observability/workflow-diagnostics.ts` |
| Alert Rules | `ALERT_RULES` | `src/lib/observability/alert-rules.ts` |
| Dashboard Metrics | `dashboardMetricsService` | `src/lib/observability/dashboard-metrics.ts` |

### Existing Infrastructure (NOT duplicated)

| Capability | Existing | Status |
|-----------|----------|--------|
| Event Bus | `platformEventBus` (lib/events) | Preserved |
| Audit Log | `logAction` (lib/audit.ts) | Preserved |
| Telemetry | `platformTelemetry` (lib/telemetry) | Wrapped by metrics service |
| Platform Health | `getPlatformHealth` (lib/reliability) | Called by health service |
| Website Health | `WebsiteHealthEngine` (lib/platform/health) | Preserved |
| Correlation Context | `correlationService` (lib/platform/correlation) | Extended with Next.js helpers |

---

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/observability/logger.ts` | Canonical structured logger with 6 levels, auto-fields, child loggers | 159 |
| `src/lib/observability/metrics-service.ts` | Duration tracking, outcome recording, cache access, `trackDuration()` wrapper | 72 |
| `src/lib/observability/error-tracker.ts` | Structured error capture with recovery hints, telemetry integration | 96 |
| `src/lib/observability/health-service.ts` | Unified health checks (DB, storage, registry, platform services) | 113 |
| `src/lib/observability/workflow-diagnostics.ts` | Workflow instrumentation with timing, correlation, threshold monitoring | 89 |
| `src/lib/observability/dashboard-metrics.ts` | Operational metrics collection (MRR, ARR, failure rates, durations) | 130 |
| `src/lib/observability/alert-rules.ts` | 9 alert rule definitions with thresholds and recovery suggestions | 95 |
| `src/lib/platform/correlation/next.ts` | Next.js API route wrapper (`withCorrelation`) and server action helper | 41 |
| `docs/observability-conventions.md` | Developer guide for logging, correlation, metrics, errors, health | 136 |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/observability/index.ts` | Added exports for all new services (logger, metrics, error tracker, health, workflow, alerts, dashboard) |

---

## Service Details

### Phase 1 — Production Logger

**Canonical singleton:** `logger` from `@/lib/observability`

**Log levels:** TRACE, DEBUG, INFO, WARN, ERROR, FATAL

**Automatic fields per entry:**
- `timestamp` — ISO 8601
- `level` — log severity
- `message` — human-readable
- `service` — originating service name
- `environment` — from `NODE_ENV`
- `correlationId`, `workspaceId`, `tenantId`, `requestId` — from correlation context
- `operation`, `duration` — when provided
- `error` — structured error with name, message, stack, recovery

**Features:**
- Level filtering (INFO+ in production, DEBUG+ in development)
- JSON output via `console.log`/`console.warn`/`console.error`
- `child()` method for pre-bound service context
- Telemetry counter integration (`log_messages` metric)

**Usage:**
```ts
import { logger } from "@/lib/observability";

logger.info("User registered", "auth", {
  operation: "register",
  correlation: context,
  duration: elapsedMs,
});
```

---

### Phase 2 — Correlation ID Propagation

**Extended existing** `correlationService` with Next.js integration.

**New exports** from `@/lib/platform/correlation`:
- `withCorrelation(handler)` — wraps Next.js API route handlers with automatic correlation extraction
- `correlationFromRequest(request)` — extracts correlation from `NextRequest` headers
- `createActionCorrelation(overrides?)` — creates correlation for server actions

**HTTP header convention:**
- `x-correlation-id` — trace identifier
- `x-request-id` — request identifier
- `x-workspace-id` — workspace context
- `x-workflow-id` — workflow name

---

### Phase 3 — Performance Metrics

**Service:** `metricsService` from `@/lib/observability`

**Methods:**
- `recordDuration(operation, durationMs, labels?)` — operation timing
- `recordOutcome(operation, success, labels?)` — success/failure counting
- `recordCacheAccess(cacheName, hit)` — cache hit ratio tracking
- `recordQueryDuration(query, durationMs)` — query latency
- `recordSlowOperation(operation, durationMs, thresholdMs)` — slow op alerting

**Helper:** `trackDuration(operation, fn)` — wraps async function with automatic timing

**Backed by:** `PlatformTelemetry` (in-memory counters/timers)

---

### Phase 4 — Error Tracking

**Function:** `captureError(error, context?)` from `@/lib/observability`

**Features:**
- Structured error capture (name, message, stack, code, recovery)
- Automatic recovery hints for known error codes (P2002, P2025, ECONNREFUSED, etc.)
- Logs through canonical logger
- Records failure metrics through `metricsService`

**Recovery hints map:**
| Code | Hint |
|------|------|
| P2002 | Unique constraint violation |
| P2025 | Record not found |
| P1000 | Database connection failed |
| ECONNREFUSED | Connection refused |
| ETIMEOUT | Connection timed out |
| ENOTFOUND | DNS resolution failed |

---

### Phase 5 — Health Monitoring

**Service:** `healthService` from `@/lib/observability`

**States:** Healthy, Warning, Critical, Offline

**Checks:**
- Database (raw query + latency)
- Storage (count query)
- Registry (billing plan query)
- All platform services via `getPlatformHealth()` (partner engine, commission engine, payout engine, event bus, notifications, idempotency, job runner)

**Methods:**
- `checkAll()` — full report across all services
- `checkDatabase()` — targeted DB health
- `checkStorage()` — storage health
- `checkRegistry()` — registry health
- `quickHealth()` — lightweight healthy/unhealthy check

**Built on:** Existing `getPlatformHealth()` from `lib/reliability/health.ts`

---

### Phase 6 — Workflow Diagnostics

**Function:** `runWorkflow(workflow, fn, correlation?)` from `@/lib/observability`

**Instrumented workflows:**
- provisioning
- publishing
- builder_save
- billing
- generation
- registry_sync
- import
- onboarding

**Features:**
- Auto-creates correlation context if not provided
- Logs start and completion
- Captures errors via `captureError()`
- Records duration via `metricsService.recordSlowOperation()`
- Returns `WorkflowResult<T>` with success, data, error, durationMs, correlationId

**Thresholds:**
| Workflow | Warning Threshold |
|----------|------------------|
| provisioning | 60s |
| publishing | 30s |
| builder_save | 10s |
| billing | 15s |
| generation | 120s |
| registry_sync | 30s |
| import | 60s |
| onboarding | 120s |

---

### Phase 7 — Operational Dashboard Data

**Service:** `dashboardMetricsService` from `@/lib/observability`

**Collected metrics:**
- `failedPublishes`, `failedProvisions`, `failedBillingOperations`
- `averagePublishDurationMs`, `averageProvisionDurationMs`
- `generationSuccessRate`
- `workspaceCount`, `tenantCount`, `creatorCount`, `agencyCount`
- `mrr`, `arr`

**Sources:** Direct Prisma queries + `billingRepository`

---

### Phase 8 — Alert Rules

**Constant:** `ALERT_RULES` from `@/lib/observability`

9 defined rules:

| Rule | Threshold | Severity |
|------|-----------|----------|
| provision_duration | 60s | Critical |
| publish_duration | 30s | Warning |
| billing_failure | 0 failures | Critical |
| registry_mismatch | 0 diffs | Warning |
| health_critical | Any critical | Critical |
| workspace_creation_failure | 0 failures | Critical |
| api_failure_rate | 5% | Warning |
| generation_failure | 0 failures | Warning |
| database_latency | 5s | Warning |

---

## Ownership Map

| Service | Owner Module | ADIP Layer |
|---------|-------------|------------|
| Logger | observability | infrastructure |
| Metrics Service | observability | infrastructure |
| Error Tracker | observability | infrastructure |
| Health Service | observability | infrastructure |
| Workflow Diagnostics | observability | application |
| Dashboard Metrics | observability | application |
| Alert Rules | observability | domain |
| Correlation | platform/correlation | application |
| Telemetry | telemetry | infrastructure |
| Platform Health | reliability | infrastructure |

---

## Verification

### TypeScript
```bash
$ npx tsc --noEmit
# Exit code: 0
# Errors: 0
```

### Build
```bash
$ npm run build
# ✓ Compiled successfully
# Exit code: 0
```

### No Duplicates Created
- One logger (`logger`) — no duplicate
- One metrics service (`metricsService`) — no duplicate
- One health service (`healthService`) — no duplicate
- One error tracker (`captureError`) — no duplicate
- One correlation system (`correlationService`) — no duplicate
- Existing systems preserved: `platformTelemetry`, `platformEventBus`, `logAction`, `getPlatformHealth`, `WebsiteHealthEngine`

---

## Remaining Roadmap

| Item | Priority | Notes |
|------|----------|-------|
| Integrate `logger` into existing services | Medium | Replace ad-hoc `console.*` calls across ~30 files |
| Integrate `runWorkflow` into provisioning/publishing services | Medium | Wrap existing workflow entry points |
| Integrate `metricsService` into generation/builder/billing | Medium | Add timing calls to existing operations |
| External metrics export | Low | `flush()` reserved for Datadog/Prometheus integration |
| External log sink | Low | `flush()` reserved for log aggregation service |
| Alert evaluation engine | Low | Poll `dashboardMetricsService` and trigger alerts |
| Operational dashboard UI | Low | Frontend consuming `dashboardMetricsService` |
| E2E smoke tests | Medium | Require running server + database infrastructure |
