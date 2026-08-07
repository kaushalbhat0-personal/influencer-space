# Performance Roadmap — RCCF-VALIDATION-05

What was NOT fixed (per the rules — everything else goes here). Ordered by
launch impact. Each item is bounded and does not redesign the architecture.

## Phase A — Index migration (highest ROI, low risk)

Apply against the **direct** connection (see `docs/production-readiness.md`
PR-01) as one Prisma migration:

```sql
CREATE INDEX "setting_key_idx" ON "Setting"("key");
CREATE INDEX "analytics_event_tenant_event_time_idx" ON "AnalyticsEvent"("tenantId", "eventType", "occurredAt");
CREATE INDEX "gallery_image_tenant_status_idx" ON "GalleryImage"("tenantId", "status", "isActive", "order");
CREATE INDEX "product_tenant_status_idx" ON "Product"("tenantId", "status", "isActive", "order");
CREATE INDEX "product_order_tenant_status_idx" ON "ProductOrder"("tenantId", "status");
CREATE INDEX "product_order_tenant_created_idx" ON "ProductOrder"("tenantId", "createdAt");
CREATE INDEX "billing_invoice_workspace_issued_idx" ON "BillingInvoice"("workspaceId", "issuedAt");
CREATE INDEX "billing_invoice_status_issued_idx" ON "BillingInvoice"("status", "issuedAt");
CREATE INDEX "generation_session_status_updated_idx" ON "GenerationSession"("status", "updatedAt");
CREATE INDEX "billing_event_type_created_idx" ON "BillingEvent"("type", "createdAt");
CREATE INDEX "commission_entry_created_idx" ON "CommissionEntry"("createdAt");
CREATE INDEX "user_role_idx" ON "User"("role");
CREATE INDEX "tenant_created_idx" ON "Tenant"("createdAt");
```

Then drop the redundant single-column indexes listed in `docs/database-audit.md`
(Phase 2). Verify with `EXPLAIN ANALYZE` on the hot queries.

## Phase B — Aggregate-derived metrics (kills duplicate counting)

- Make `dashboardService.getMetrics`, `websiteHealthEngine`, and
  `getCreatorSuccess` read the RuntimeContext snapshot counts instead of
  re-querying (`docs/runtime-audit.md` RT-03). Turns ~50 queries/context build
  into ~1 snapshot.
- Pass `preRead` scores into `recommendationContextSource.buildFromSnapshot`
  (RT-04) to end the 2–3× score recomputation.

## Phase C — Scale tooling (from V-04 roadmap)

- Server-side `skip/take` + search for tenants/users/payments/invoices lists.
- Prisma `aggregate` for all revenue/invoice totals (no `take` truncation).
- Bulk plan/suspend/publish actions + CSV exports.
- Approximate counts (`reltuples`) for the super-admin dashboard + operations
  aggregator.

## Phase D — Background jobs

- Invoke `platformBootstrap.initialize()` from `instrumentation.ts` (or add
  `/api/cron/expire-invites`) so partner invites auto-expire.
- Add `/api/cron/reconcile` and `/api/cron/integrity-cleanup` (CRON_SECRET),
  both idempotent.
- Wire a persisted generation queue or a generation-recovery cron; connect the
  AI cost monitor to a DB-backed log (`ProviderFetchLog`).

## Phase E — Storefront caching (decision, not a quick fix)

The storefront is deliberately `force-dynamic` (IMPLEMENTATION-16: live content,
no stale divergence). The 60s CDN cache + SWR header already absorbs repeat
views. If live-content freshness is ever relaxed, switch to
`export const revalidate = 30` + `revalidateTag` — invalidation is already wired
via `afterContentChange`. Until then, the `React.cache` fix (P-01) already halved
per-request load.

## Phase F — Agency client list health (N+1)

Batch `getHealthScoreShort` across clients (`Promise.all` + shared aggregate
counts) so a 50-client agency renders in one pass instead of 650 queries.

## Phase G — Frontend polish

- Scope the root framer-motion `template.tsx` to the marketing group.
- `next/dynamic` for `recharts` and the gallery `Lightbox`.
- Hero LCP: `CreatorImage` + `priority`.
- `loading.tsx` for `[domain]`, `/builder`, `/agency/**`.
- `minimumCacheTTL` → 3600; revalidate images on publish.

## Metrics to track after landing

- Storefront queries/request (target ≤10 with aggregate-derived metrics).
- Builder save wall time (target <1s at 500 sections — already ~4 statements).
- P95 storefront SSR; agency client-list P95; integrity scan wall time.
- Dashboard P95 (target <1.5s at 5,000 tenants with pagination + reltuples).
