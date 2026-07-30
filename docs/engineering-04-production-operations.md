# ENGINEERING-04: Production Operations Dashboard & Alert Engine

**Date:** 2026-07-30  
**Status:** Complete  
**TypeScript errors:** 0 ✅  
**Build:** `npm run build` passes ✅  

---

## Repository Audit — Reuse vs New Matrix

| Existing System | Found | Reused | Extended | Replaced |
|----------------|-------|--------|----------|----------|
| `src/app/super-admin/page.tsx` | Main dashboard | ✅ | Added `dashboardMetricsService`, `alertEvaluator` | — |
| `src/app/super-admin/health/page.tsx` | Simple health page | ✅ | **Rewritten** to use `healthService.checkAll()` | Old Prisma queries |
| `src/app/super-admin/operations/page.tsx` | Operations page | ✅ | Preserved as-is | — |
| `src/app/super-admin/activity/page.tsx` | Activity timeline | ✅ | Preserved as-is | — |
| `src/app/super-admin/insights/page.tsx` | Insights page | ✅ | Preserved as-is | — |
| `src/app/super-admin/alerts/page.tsx` | — | — | **New page** (genuinely missing) | — |
| `src/app/super-admin/runbooks/page.tsx` | — | — | **New page** (genuinely missing) | — |
| `src/app/super-admin/runbooks/[id]/page.tsx` | — | — | **New page** (genuinely missing) | — |
| `src/lib/observability/health-service.ts` | Health service | ✅ | Consumed by health page | — |
| `src/lib/observability/dashboard-metrics.ts` | Dashboard metrics | ✅ | Consumed by main dashboard | — |
| `src/lib/observability/alert-rules.ts` | Alert rules | ✅ | Evaluated by alert engine | — |
| `src/lib/observability/runbooks.ts` | — | — | **New file** (genuinely missing) | — |
| `src/lib/observability/alert-evaluator.ts` | — | — | **New file** (evaluates rules against metrics) | — |
| `src/config/admin-registry.ts` | Navigation registry | ✅ | Extended with alerts + runbooks entries | — |

**No systems were duplicated. No existing pages were replaced.**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Super Admin Pages                   │
├─────────────────┬───────────────┬───────────────────┤
│  /super-admin   │ /health       │ /alerts           │
│  Dashboard      │ Health check  │ Alert evaluation  │
│  (extended)     │ (upgraded)    │ (new)             │
├─────────────────┼───────────────┼───────────────────┤
│  /runbooks      │ /runbooks/[id]│ /activity         │
│  Runbook list   │ Runbook steps │ (existing)        │
│  (new)          │ (new)         │                   │
└────────┬────────┴───────┬───────┴────────┬──────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────────────────────────────────────────┐
│              Existing Canonical Services              │
├──────────────┬──────────────┬────────────────────────┤
│ healthService│dashboard-    │alertEvaluator          │
│ .checkAll()  │ metrics-    │.evaluateAllRules()     │
│              │ Service     │                        │
├──────────────┼──────────────┼────────────────────────┤
│ ALERT_RULES  │ RUNBOOKS    │ │                     │
│ (9 rules)    │ (6 runbooks)│                        │
└──────────────┴──────────────┴────────────────────────┘
```

---

## Files Created

| File | Purpose | 
|------|---------|
| `src/lib/observability/alert-evaluator.ts` | Evaluates all 9 `ALERT_RULES` against live `dashboardMetricsService` + `healthService` data |
| `src/lib/observability/runbooks.ts` | 6 structured runbooks for common platform incidents |
| `src/app/super-admin/alerts/page.tsx` | Alert Center — displays live rule evaluations with triggered status |
| `src/app/super-admin/runbooks/page.tsx` | Runbook registry — card grid linking to detail pages |
| `src/app/super-admin/runbooks/[id]/page.tsx` | Runbook detail — ordered recovery steps with navigation |

## Files Modified

| File | Change |
|------|--------|
| `src/app/super-admin/page.tsx` | Added `dashboardMetricsService.collect()` for MRR/ARR/Gen Success/Failed Publishes. Added `alertEvaluator.evaluateAllRules()` for alert badge. Added Alert Center + Runbooks links. |
| `src/app/super-admin/health/page.tsx` | Complete rewrite — now consumes `healthService.checkAll()` with per-service health cards, status badges, and latency display |
| `src/lib/observability/index.ts` | Added exports for `alertEvaluator`, `RUNBOOKS`, `getRunbook`, `getRunbookForAlert` |
| `src/config/admin-registry.ts` | Added `alerts` (Bell icon) and `runbooks` (BookOpen icon) entries in the `platform` group |

---

## Dashboard Architecture

### Main Dashboard (`/super-admin`)
Shows 3 data tiers:
1. **Business metrics** (10 stat cards from `getPlatformStats`)
2. **Operational metrics** (MRR, ARR, Generation Success %, Failed Publishes from `dashboardMetricsService`)
3. **Alert summary** (critical/warning counts from `alertEvaluator`)
4. **Platform status** (existing summary card + links to all operations pages)

### Health Dashboard (`/super-admin/health`)
Consumes `healthService.checkAll()` and renders per-service cards with:
- Service name (formatted from keys like `partnerEngine`, `eventBus`)
- Health state badge (Healthy / Warning / Critical / Offline)
- Status message + latency (ms)
- Last checked timestamp
- Legend explaining health states

### Alert Center (`/super-admin/alerts`)
Consumes `alertEvaluator.evaluateAllRules()` and renders:
- Per-rule card with: rule name, severity badge, triggered indicator (pulsing red dot), description, threshold vs current value
- Links to runbook for triggered rules
- Summary: critical count, warning count, evaluation timestamp

### Runbook Registry (`/super-admin/runbooks`)
6 structured runbooks displayed as cards:
- Publishing Failure, Provisioning Failure, Billing Failure, Generation Failure, Registry Drift, Database Failure
- Each shows: severity, linked alert rule, description, step count
- Detail page shows numbered recovery steps with related page links

---

## Alert Architecture

The `alertEvaluator` evaluates 9 rules from `ALERT_RULES` against live data:

| Rule | Data Source | Evaluated As |
|------|------------|-------------|
| provision_duration | `dashboardMetrics.averageProvisionDurationMs` | > 60s |
| publish_duration | `dashboardMetrics.averagePublishDurationMs` | > 30s |
| billing_failure | `dashboardMetrics.failedBillingOperations` | > 0 |
| health_critical | `healthReport.overall === "critical"` | Boolean |
| generation_failure | `100 - dashboardMetrics.generationSuccessRate` | > 0 |
| database_latency | `healthReport.services["database"].latencyMs` | > 5000ms |
| workspace_creation_failure | `dashboardMetrics.failedProvisions` | > 0 |

---

## Runbook Architecture

6 runbooks stored in `src/lib/observability/runbooks.ts`:

| Runbook | Linked Alert | Severity | Steps |
|---------|-------------|----------|-------|
| Publishing Failure | publish_duration | Warning | 4 |
| Provisioning Failure | provision_duration | Critical | 5 |
| Billing Failure | billing_failure | Critical | 4 |
| Generation Failure | generation_failure | Warning | 4 |
| Registry Drift | registry_mismatch | Warning | 4 |
| Database Failure | health_critical | Critical | 5 |

Each runbook links from the Alert Center for immediate access.

---

## Verification

### TypeScript
```bash
$ npx tsc --noEmit
# Exit code: 0
```

### Build
```bash
$ npm run build
# ✓ Compiled successfully
```

### Reuse Verification
- `healthService.checkAll()` — **reused** existing ENGINE-02 service (not duplicated)
- `dashboardMetricsService.collect()` — **reused** existing ENGINE-02 service
- `ALERT_RULES` — **reused** existing ENGINE-02 constants
- `logger` — **reused** for alert evaluation logging
- `health/page.tsx` — **rewritten** to consume existing service (old Prisma queries removed)
- `admin-registry.ts` — **extended** with 2 new entries

---

## Remaining Roadmap

| Item | Priority | Notes |
|------|----------|-------|
| Notification providers (Email/Slack/Discord) | Low | Interface-ready, no implementation yet |
| Alert acknowledgement state | Low | Add ability to acknowledge/resolve alerts |
| Alert history timeline | Low | Persist alert evaluations for trend analysis |
| Runbook execution tracking | Low | Log when a runbook is viewed/used |
| Health check history | Low | Track health state over time for trend visualization |
| E2E smoke tests for new pages | Medium | Require running server + database |
