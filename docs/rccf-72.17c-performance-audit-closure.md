# RCCF-72.17C Performance Audit & Query Deduplication — Closure

## Verdict
**A — PASSED (AUDIT COMPLETE, NO IMPLEMENTATION)**

Read-only audit established a measured baseline for plan resolution and a fully-traced query inventory for publish, dashboard, and agency paths. No source modified, no cache added, no schema change. ~3 weeks of pre-existing working-tree work untouched (verified byte-identical before/after).

## Executive Summary
- **`resolveActivePlan()` is the single highest-leverage dedup target**: measured **3 DB queries per call** (warm), **5 on cold** — and it is **not request-memoized**. The publish path calls it **3×** (9 queries); dashboard + agency paths call it multiple times per request.
- **Publish = ~72 DB round-trips** (traced); the two full website-aggregate builds duplicate ~17–22 reads, workspace is read 6×, subscription 4×, website 4×.
- **Dashboard = ~86–88 queries/render**; the same Tenant row is read **7×**, Website 5×, ProductOrder 6×, several Settings 4×.
- **Agency dashboard = ~31 + 23·N queries** (N = clients) with two N+1 loops (13·N health + ~10·N success-signals).
- **Prisma pool is clean**: one global client (globalThis-cached), PrismaPg adapter, no per-module instances, no pool misconfiguration.
- **Transaction safety is favorable**: `resolveActivePlan` never accepts a transaction client (global prisma only); the row-lock content-limit path already resolves the plan BEFORE the lock and threads it in. A request-scoped memo is therefore safe.

## 1. resolveActivePlan Inventory (Phase 2)
**Measured:** 3 queries warm / 5 cold per call (Workspace + BillingSubscription + Subscription-legacy + [AgencyTenant 30s-cached] + [BillingPlan runtime-overrides process-cached]).

| File | Function | Boundary | Tx? | Classification |
|---|---|---|---|---|
| `actions/theme.actions.ts:67,214` | theme save/load | server action | no | **A** request-local duplicate (2×/action) |
| `actions/create.actions.ts:113` | website create | server action | no | A |
| `actions/builder-preview.actions.ts:42` | preview data | server action | no | A |
| `actions/builder-overview.actions.ts:166` | builder boot | server action | no | A |
| `components/storefront/StorefrontPage.tsx:160` | preview render | RSC render | no | A (preview only) |
| `actions/partner.actions.ts:162` | partner | server action | no | A |
| `features/dashboard/actions.ts:36` | dashboard | server action | no | A |
| `app/super-admin/tenants/[id]/page.tsx:36` | tenant detail | RSC | no | C independent |
| `lib/publishing/service.ts:222,300,591` | **publish** | server action | no (all pre-tx) | **A — 3× per publish** |
| `lib/publishing/publish-usage.ts:44` | usage read | server action | no | A |
| `modules/provisioning/.../provisioning-service.ts:382` | provisioning | job/action | no | B/D |
| `modules/partner/.../team-membership.ts:98`, `partner-relationship.ts:68`, `access-lock.ts:40` | partner gates | action/RSC | no | A |
| `app/dev/theme-runtime, billing, billing-consolidation` | dev pages | RSC | no | C (dev-only) |
| `lib/media/service.ts:667` | media | server action | no | A |
| `app/agency/billing/page.tsx:40` | agency billing | RSC | no | C |
| `app/admin/layout.tsx:26` | admin shell | RSC | no | A (shared with page) |
| `app/admin/{integrations,appearance,domain,themes}/page.tsx` | admin pages | RSC | no | A |
| `modules/billing/.../storage.enforcement.ts:127` | storage gate | action | no | A |
| `modules/billing/.../capability-gates.ts:37` | capability gate | action | no | A |
| `modules/billing/.../order-completion.ts:62,122` | order complete | action | **no (outside tx)** | A |
| `modules/billing/.../content-limit.enforcement.ts:159,237` | content limit | action | **237 outside tx (threaded); 159 fallback** | A/B |

**Summary:** ~26 production call sites, all **A** (request-local duplicate) or **B** (provisioning/job) or **C** (independent). None are E (authorization-sensitive per-user) — the function is a pure function of `(workspaceId, tenantId)` + committed DB state.

## 2. Resolution Chain (Phase 3) — measured
```
resolveActivePlan(workspaceId?, tenantId?)
  ├─ loadRuntimeFeatureOverrides()          → BillingPlan.findMany (PROCESS-cached, 0 after warm)  [0-1 q]
  ├─ (workspaceId path) findSubscriptionWithPlan → BillingSubscription+plan [1 q]
  ├─ (tenantId path) Workspace.findFirst{tenantId} [1 q]
  │      └─ BillingSubscription.findUnique+plan   [1 q]
  ├─ Subscription.findUnique legacy fallback      [1 q]
  └─ resolveRestrictedPlanCode → AgencyTenant (30s PROCESS-cached) [0-1 q]
```
**Measured total: 3 queries warm / 5 cold.** Depends ONLY on `(workspaceId, tenantId)` — NOT user/session/role/headers. Runtime config already process-cached. **No transaction client is ever passed** (signature has no `tx` param; `findSubscriptionWithPlan` hard-codes global prisma).

## 3. Memoization Analysis (Phase 4)
- Semantically `f(workspaceId, tenantId)` — inputs fully capture the result given committed DB state.
- **Safe boundary: request-scoped cache** keyed by `${workspaceId}|${tenantId}` (e.g. `React.cache`, or a `Map` cleared per server-action/RSC request).
- **Global cache NOT recommended** — billing state can change mid-request (order completion, webhook); a global cache risks stale entitlement.

## 4. Transaction Safety (Phase 5)
- `resolveActivePlan` is **never called with a tx client** — verified in every call site and in `findSubscriptionWithPlan`.
- The row-lock path (`withLaunchCoreContentCapacity`, content-limit.enforcement.ts:237) **already resolves the plan before the lock and threads it** into the transaction — the established safe pattern.
- order-completion resolves the plan **outside** its `$transaction` (line 62 before tx at 83).
- **Conclusion:** a request-scoped memo is transaction-safe — it cannot return an in-transaction read because the function never reads via a tx, and callers already thread resolved results across transaction boundaries. Recommended API: keep `resolveActivePlan(workspaceId, tenantId)` (memoized) + note the tx-usage rule; no new signature needed.

## 5–8. Publishing Query Audit (Phase 6–8) — traced ~72 round-trips
Sequence (metered publish): 55 reads outside tx + ~4 reads/4 writes inside the commit tx + wrapper. Key duplication:
| Data | Times | First | Repeated | Safe to share? |
|---|---|---|---|---|
| Workspace | 6× | service.ts:139 | policy/publish-usage/plan-source×3 | **Yes** — same row, no writes between |
| BillingSubscription | 4× | publish-usage.ts:36 | repository×3 | **Yes** (merge projection for trialEndsAt+renewsAt) |
| Website | 4× | service.ts:148 | :172, aggregate×2 | **Yes** |
| Full content aggregate | 2× | service.ts:176 (buildWithDiagnostics) | :187 (homepage build) | **Yes** — derive homepage in memory |
| `resolveActivePlan` | 3× | :222 | :591, :300 | **Yes** (no billing writes between; keep :300 freshest) |
| Asset rows | ≤10× | aggregate#1 | aggregate#2 | **Yes** — one `findMany in` |

**Transaction boundaries:** only the quota reserve + snapshot commit are inside the tx; all reads (incl. all 3 plan resolutions) are outside/pre-tx. Sharing plan/workspace/website reads is safe. **Correctness caveat:** PUB-07 — the navigation `setting.upsert` write happens OUTSIDE the tx before the quota check (partial state on quota failure) — a correctness finding, not perf. PUB-08 — quota policy derives from a pre-tx read (narrow window; atomic `used<limit` increment remains the enforcement point).

## 9–10. Dashboard Query Audit (Phase 9–10) — traced ~86–88 queries/render
- Tenant read **7×**, Website **5×**, ProductOrder **6×**, Setting seo/testimonials **4×**, Product/GalleryImage counts **4×**.
- **SAFE_PARALLELIZABLE:** buildSnapshot+getProfile; the activity/quickstart/storefront/plan/allowance group (~14 q) can run concurrently with the ~63-query context build instead of serially after it.
- **REQUIRES_ORDERING:** getMetrics publishSnapshot (needs liveVersion); recommendation `markShown` RMW; businessHealth recordFrom; resolveActivePlan cascade; commerce-strategy cascade.
- **DASH-03 (highest-value):** `SuccessJourneyCard` re-fires `getMyCustomerSuccess()` after hydration, which rebuilds the **entire ~63-query runtime context** in a second request — the page effectively runs the heaviest work twice.

## 11. Agency Query Audit (Phase 11) — ~31 + 23·N
- **AGENCY-01 N+1:** `listByAgency` → 13 queries × N clients (health engine, sequential loop). 50 clients ≈ 650 queries. No `take` cap.
- **AGENCY-02 N+1:** success section `loadSignalsLight` ≈ 10·N more (same clients; health computed twice, two ways).
- **AGENCY-03:** agencyTenant read 4–5×/request; workspace + membership read twice per client action.
- **AGENCY-04:** `/agency/clients` search calls `listByAgency` twice; work page adds 13·N on top.

## 12. Prisma Pool Audit (Phase 12)
- `src/lib/prisma.ts`: **one** global `PrismaClient` (globalThis-cached — correct serverless pattern), `PrismaPg` adapter → pooler `DATABASE_URL`, `log:["error"]`. No per-module `new PrismaClient` anywhere in `src`. No pool misconfiguration found; nothing to change.

## 13–14. Measured Baseline (Phase 13–14)
| Surface | Baseline |
|---|---|
| `resolveActivePlan` per call | **3 queries warm / 5 cold** (MEASURED via patched-pg harness against live DB) |
| Publish | **~72 round-trips** (traced, exact call enumeration); plan ×3, workspace ×6, aggregate ×2 |
| Dashboard | **~86–88 queries/render** (traced); tenant ×7 |
| Agency | **~31 + 23·N** (traced); 2 N+1 loops |
| Prisma pool | healthy (1 client) |

**Honest limitation:** wall-clock latency (ms) was not captured — measuring it requires temporary source instrumentation (e.g. `log:["query"]`), which this read-only mandate prohibits. The query counts are exact code-path enumerations (every `prisma.*` call) plus one live measurement, not guesses.

## 15–16. Other Findings + Prioritization
| # | Pri | Finding | Evidence | Impact | Risk/Effort |
|---|---|---|---|---|---|
| P1 | P1 | `resolveActivePlan` un-memoized, ~26 sites, publish ×3 | measured 3q/call; plan-source.ts:71 | 3–9 redundant queries per publish/dashboard request | LOW/S |
| P2 | P1 | Publish builds full aggregate twice | service.ts:176+187 | ~17–22 q duplicated (~half of publish reads) | LOW/M |
| P3 | P1 | Publish re-reads workspace×6, subscription×4, website×4 | service.ts:139–300 | 10 reads → 2–3 | LOW/M |
| P4 | P1 | Dashboard SuccessJourneyCard re-runs full context build | dashboard-page.tsx:172; success-journey-card.tsx:12 | ~63 extra queries + a second HTTP round-trip per dashboard load | MED/M |
| P5 | P1 | Dashboard tenant/website/order read 4–7× | dashboard service | ~35–40 redundant reads | LOW/M |
| P6 | P2 | Agency N+1 (health 13·N) | client/service.ts:34 | 13 q × N clients | LOW/M |
| P7 | P2 | Agency N+1 (success ~10·N) | platform.ts:78 | ~10 q × N | LOW/M |
| P8 | P2 | Agency repeated tenant/membership reads | access-lock/authorization | ~6–8 q/request | LOW/S |
| P9 | P3 | PUB-06 maintenanceMode flag = 2 un-cached queries (incl. global tenant scan) | platform-config.ts:13 | 2 q/publish | LOW/S |
| P10 | P3 | PUB-04 assets resolved per-id (≤10 q) | asset-queries.ts | ≤10 q/publish | LOW/S |
| P11 | P3 | resolveAssetUsage ~15 serialized reads on media library | media/usage-resolver.ts | ~15 q/list render | LOW/S |
| CORR | P0-correctness | PUB-07 nav write outside commit tx; PUB-08 quota policy from pre-tx read | service.ts:262,300 | partial nav state on quota failure; narrow policy staleness | MED — separate from perf |

## 17. Recommended Implementation RCCFs (smallest safe boundaries)
1. **72.17C.1 — Request-scoped plan resolution.** Add `React.cache`-style request memo around `resolveActivePlan` (keyed workspaceId|tenantId). Zero behavior change; publish −6q, dashboard/agency −3q each site. Guard: no tx client use (already true); add a unit test pinning memoization within a request and the non-tx contract.
2. **72.17C.2 — Publish data reuse.** Resolve workspace+subscription+website once; thread through `isTrialExpiredForTenant`, experience, policy; eliminate aggregate build #2 by deriving homepage view in memory (keep `homepage:true` featured-first semantics — parity tests required).
3. **72.17C.3 — Dashboard parallelization + SuccessJourneyCard.** Launch independent queries in the first `Promise.all`; pass prebuilt context/signals to the success card (kill the second context build).
4. **72.17C.4 — Dashboard row dedup.** One request-scoped tenant/website/publishStatus/settings gateway feeding metrics/quickstart/storefront/health.
5. **72.17C.5 — Agency N+1.** Batch the 13-question health evaluation + reuse `listByAgency` row set for success signals; cap or filter the loop to rendered rows.
6. **72.17C.6 — (optional, correctness-first)** PUB-07 nav-write-into-tx.

## Safety Constraints (preserved throughout)
- **Tenant isolation / authorization:** memo keyed by tenant; no user/session input involved; no memo across tenants.
- **Billing state:** request-scoped only; never global; never read via a tx (function never takes one).
- **Transaction consistency:** the row-lock path already threads pre-resolved plan; new memo keeps that contract.
- **Publish correctness:** parity tests (Builder == Preview == Storefront) required for the aggregate-reuse change; `homepage:true` featured-first behavior must be preserved.

## Working Tree
- **Unchanged.** `git status --short` = 357 entries / 64 files both before and after the audit (same set as Phase 1). No source, schema, package.json, or test file modified. No staging. No commit. No push.

## Final STOP
This RCCF is audit-only. No implementation, no staging, no commit, no push. The closure is ready for your review before any 72.17C.1 implementation begins.