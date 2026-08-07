# Platform Operations Report — RCCF-VALIDATION-04

AI Operations · Integrity Runtime · Event Runtime · Chaos Scenarios ·
Operational Excellence.

## AI Operations

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| O-01 | CRITICAL | AI Operations page reads an in-memory cost monitor whose `record()` is never called — "Total AI Calls / Cost / Cache Hit" are always initial zeros. | Back `costMonitor` with `ProviderFetchLog`/`AICostLog` and record real provider token/cost at the LLM call sites (`lib/ai/llm-engine.ts:92`, `provider.ts:88-104`) |
| O-02 | CRITICAL | `generateWebsite` server action is a stub (`void _input;` → empty stages) — the super-admin Generation wizard renders fabricated/empty output (score 0%, everything "missing"). | Implement against the real provisioning pipeline, or remove the wizard from nav until implemented |
| O-03 | CRITICAL | The elaborate generation queue/worker-pool runtime exists only in tests; production generation is synchronous server actions + a mock adapter (`provision-pipeline.ts:39`). Fire-and-forget with no `.catch` in `generate/page.tsx:172-187`. | Wire a persisted queue or connect the runtime to a production adapter |
| O-04 | HIGH | Stuck `GenerationSession`s can't be recovered; nothing sets `timed_out`. | **FIXED (partial)** — `runSafeCleanup` now marks stale active sessions `timed_out`. Super-admin session-recovery UI (force-fail/retry) is roadmap |
| O-05 | MEDIUM | Provider configuration is env-only; no runtime provider management. | Roadmap: DB-backed provider registry + key rotation UI |
| O-06 | MEDIUM | `cacheRuntime` in the intelligence runtime is dead code (the real cache is `lib/ai/cache.ts`). | Delete or wire it |

## Integrity Runtime

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| O-07 | CRITICAL | Safe-delete/preview dependency graph hardcoded `tenantId: ""` → every count 0 → `safeDeleteTenant` always returned "No tenant data found". No tenant could be deleted safely. | **FIXED** — parameterized queries; delete is now a single transaction; preview reflects real counts |
| O-08 | HIGH | Safe-delete/preview not wired to any UI (only Scan + Cleanup buttons exist). | Roadmap: integrity page "Preview deletion / Safe delete" buttons |
| O-09 | HIGH | Integrity scan flags agency workspaces/users as orphans (false positives); `runSafeCleanup` doesn't repair the orphan categories it reports. | Roadmap: exclude agency-owned rows; make cleanup repair reported categories |
| O-10 | MEDIUM | Health score `100 - issues*0.5` is arbitrary; scan re-runs per page load. | Roadmap: category-weighted score + persisted scans |
| O-11 | MEDIUM | Reconciliation orphan-commission display always rendered ₹0 (number cast to object). | **FIXED** |

## Event Runtime

| ID | Sev | Finding |
| --- | --- | --- |
| O-12 | CRITICAL | `runtimeEventBus` has zero production subscribers — every `publish` inserts an `AnalyticsEvent` row but nothing reads them; the `subscribe()` API is only exercised in tests. Write-only sink. |
| O-13 | MEDIUM | Event Explorer reads an in-memory bus (empty until manual `rehydrateEngine`), not the durable `AnalyticsEvent` table. |
| O-14 | MEDIUM | `occurredAt` is client-supplied; no dedupe key on `AnalyticsEvent` → duplicates possible on retried actions. Index on `(tenantId, occurredAt)` exists (good). |

## Chaos scenarios

| Scenario | Outcome | Verdict |
| --- | --- | --- |
| Delete tenant during publish | `createPublish` FK throw is caught → clean failure, no crash | Acceptable |
| Delete tenant during builder save | Save is transactional; tenant FK throw caught → error surfaced | Acceptable |
| Delete tenant during generation | `GenerationSession` has no FK → writes continue silently after delete (orphans) | **Gap** — now the explicit delete cleans sessions; in-flight rows can still be created after delete (documented) |
| Delete tenant during checkout | New `ProductOrder` FK violation throws to the customer; any already-created Razorpay order/payment becomes an orphaned external reference | **Gap** — documented |
| Delete tenant during commission settlement / health eval | Commission/health are in-memory or row-scoped; no corruption observed | OK |
| Failed autosave / stuck generation | Autosave re-arms (V-03.5); stuck sessions now recovered by cleanup (O-04) | Fixed |

## Operational excellence verdict

An operations team can run the platform today: the Billing v2 state machine,
webhook idempotency, audit logs, registry-sync dry-run, canonical runtime
analytics pages, and the now-functional integrity/feature-flag/governance fixes
are production-grade. What is **not** yet scalable is the tooling layer:
bulk operations, CSV exports, server-side pagination, AI cost telemetry, and
real-time health probes are the roadmap items that separate "can operate" from
"can operate efficiently at 5,000 tenants".
