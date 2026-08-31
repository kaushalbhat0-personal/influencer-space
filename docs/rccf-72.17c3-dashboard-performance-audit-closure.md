# RCCF-72.17C.3 Dashboard Performance & N+1 Audit Closure

## Verdict
**A — PASSED (AUDIT ONLY, READ-ONLY)**

Established a measured, reproducible dashboard baseline against the real dev DB and confirmed the duplication hypotheses from the 72.17C architecture audit. No source modified, no implementation, no commit, no push.

## Scope (exactly what was audited)
- **Entry:** `src/app/admin/dashboard/page.tsx` → `getDashboardData()` (`src/features/dashboard/actions.ts`) → `runtimeContextBuilder.build(tenantId)` + 5 parallel helpers + plan/allowance.
- Measured the full authenticated-creator dashboard data path via a real-DB patched-pg harness (fixture tenant with website/pages/products/gallery/orders/subscription; cleaned up afterward).

## Query Map (actual, measured)
```
getDashboardData()
 ├─ runtimeContextBuilder.build(tenantId)              [COLD 64 / WARM 62]
 │   ├─ knowledgeAggregateSource.buildSnapshot         (websiteAggregateService.build + 6 meta reads)
 │   ├─ goalProfileService.getProfile
 │   ├─ Promise.all: getCreatorSuccess / getMetrics / websiteHealthEngine.evaluate / knowledge / goals
 │   ├─ recommendationContextSource + getRecommendationsFrom
 │   └─ resolveCommerceStrategy
 ├─ Promise.all: getActivity / getQuickStartSteps / getStorefrontUrl / businessHealth.recordFrom / evolution.detectFrom  [12/8]
 └─ resolveActivePlan + countActiveCoreContentUsage (launch allowance)                                            [9/7]
```

## Baseline (measured, real DB)
| Category | COLD | WARM |
|---|---|---|
| Context build | 64 | 62 |
| Helpers (activity/steps/storefront/health/evolution) | 12 | 8 |
| Plan + launch allowance | 9 | 7 |
| **TOTAL** | **85** | **77** |

**Warm per-table:** Setting 17 · Tenant 7 · Product 6 · ProductOrder 6 · Website 5 · GalleryImage 5 · Booking 4 · Offering 4 · PublishStatus 4 · AffiliateLink 3 · Game 3 · Brand 2 · TimelineEvent 2 · ContentFeedItem 2 · Workspace 2 · BillingSubscription 1 · BillingPlan 1 · (ContactSubmission/AnalyticsEvent/AuditLog 1 each).

## Findings
| ID | Severity | Confidence | Location | Evidence | Savings | Safety | Effort |
|---|---|---|---|---|---|---|---|
| **DASH-03** | HIGH | HIGH | `dashboard-page.tsx:172` + `success-journey-card.tsx` | `<SuccessJourneyCard />` (no props) fires `getMyCustomerSuccess()` client action → `loadSignals` → **a second full `runtimeContextBuilder.build` (~62 queries) in a separate request** after hydration | **~60 queries + a full network round-trip per dashboard load** | Low (thread prebuilt context; card becomes initial-state) | M |
| **DASH-01** | HIGH | HIGH | aggregate + metrics + health + quickStart/service.ts | `Setting` read **17×** (hero/seo/testimonials/faq/knowledge re-read 3–4×); `Tenant` read **7×**; `Website` 5× | Request-scoped shared-read gateway: ~15–20 queries | Low (dedupe only; same committed rows) | M |
| **DASH-02** | MEDIUM | HIGH | dashboard/service.ts (getMetrics/getQuickStart/getStorefront) + actions.ts | Content counts re-computed independently (Product ×6, ProductOrder ×6, Gallery ×5) across metrics/health/quickStart/success | Thread one counts payload; ~10 queries | Low | M |
| **DASH-04** | LOW-MED | MED | actions.ts:20 then :36 | `resolveActivePlan` + allowance run AFTER the full 62-query build (sequential); could run in the first `Promise.all` | ~2 round-trip latency, not query count | Low (independent of context) | S |
| **DASH-05** | LOW | HIGH | builder.ts:38-39 | `buildSnapshot` + `getProfile` are sequential awaits (independent) | 1 round-trip latency | Low | S |

## N+1 Analysis
**PASS (no creator-dashboard N+1).** Measured content-scaled tables (Product/Gallery/Booking/Offering) show **fixed** counts independent of data size — no `1+N` or `N+M` loops in the authenticated creator dashboard path. (The AGENCY dashboard has documented N+1 loops — 13·N health + ~10·N success-signals — but that surface is out of this RCCF's scope.)

## Parallelization Analysis
- **SAFE:** the 5 helpers + plan/allowance are independent of the context build's RESULT (DASH-04) — they can join the first `Promise.all`. `buildSnapshot` + `getProfile` (DASH-05). The build internally already parallelizes via `Promise.all`.
- **REQUIRES_ORDERING:** `businessHealth.recordFrom`/`evolution.detectFrom` need the context (kept in the existing second group). Recommendation `markShown` is a read-modify-write. `resolveActivePlan` cascade is inherently sequential.
- No transaction-boundary concerns — all dashboard reads are plain (non-tx).

## C.1 Interaction
**C.1 already makes the dashboard's plan resolution a single read** (measured: `BillingSubscription` ×1 + `BillingPlan` ×1 across the whole warm run). C.1's request-scoped memo also prevents duplicate plan resolution across the dashboard action + any same-request downstream call. It does **not** fix DASH-03 — the SuccessJourneyCard's second context build happens in a *separate* server-action request scope, which C.1's per-request cache cannot span.

## Security / Tenant Safety
- **Tenant isolation: PASS** — all reads keyed by `tenantId`; no proposed change widens scope.
- **Authorization: PASS** — no auth-path change; the audit proposes only data reuse within the same request.
- **Billing freshness: PASS** — any reuse is request-scoped (no global dashboard billing cache); new requests observe new committed state.
- **Data correctness: PASS** — DASH-03 fix preserves card output by passing the SAME context already computed server-side.

## Recommended Next RCCF
**RCCF-72.17C.4 — Dashboard context reuse (DASH-03):** pass the prebuilt `RuntimeContext`/signals from `getDashboardData` into `SuccessJourneyCard` as initial props (or accept an optional prebuilt context in `getMyCustomerSuccess`), eliminating the second ~62-query build + network round-trip. This is the single highest-value, provably-safe dashboard optimization (largest query reduction, zero output change, low risk). A later RCCF can address DASH-01 (request-scoped shared-read gateway for the 17× Setting / 7× Tenant re-reads).

## Not Audited
- Agency dashboard N+1 loops (documented; out of scope for the authenticated *creator* dashboard).
- Client-side rendering / bundle / hydration costs (frontend RCCF).
- Exact wall-clock latency attribution per category (only total ms captured; the per-query latency wasn't instrumented).

## Verification (read-only)
- `npx tsc --noEmit`: PASS (0)
- `npm run lint`: PASS (0, pre-existing warnings)
- `npx prisma validate`: PASS
- `git diff --check`: PASS
- No source modified; build/unit/E2E not rerun (no code changed). Temp measurement harness created in the OS temp dir and removed.

## Working Tree
- `git status --short` = **358 entries, unchanged** from the pre-audit state (only the pre-existing protected work: dashboard-page.tsx, plan-source entitlement, test fixtures, etc.).
- Nothing staged; no source implementation committed.

## Git
- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**

**STOP — audit complete.** The numbers (85 cold / 77 warm; ~60 queries recoverable from DASH-03 alone) support a focused dashboard-context-reuse RCCF as the next implementation target.