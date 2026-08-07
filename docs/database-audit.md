# Database Audit — RCCF-VALIDATION-05 (Phases 1 + 2)

All locations are `file:line`. Estimates assume 5,000 tenants / 100k products /
2M gallery / 10M analytics events. **FIXED** = addressed in this validation.

## Phase 1 — Query findings

| ID | Sev | Location | Finding | Impact | Fix |
| --- | --- | --- | --- | --- | --- |
| DB-01 | **CRITICAL** | `src/app/[domain]/page.tsx:30-91` | Storefront pipeline ran TWICE per request (metadata + page) — not `React.cache`d | ~19 extra queries + double `layoutEngine.resolve` per view | **FIXED** — wrapped in `React.cache` |
| DB-02 | **CRITICAL** | `src/lib/builder/builder-service.ts:71-113` | save = deleteMany + per-page create + per-section create + per-section block.createMany ≈ 1,100 sequential statements | 2–5s save; tx-slot exhaustion at 100 concurrent saves | **FIXED** — `createManyAndReturn` (3 statements) |
| DB-03 | HIGH | `src/lib/client/service.ts:30-51` → `engine.ts:35-67` | Agency client list runs a 13-query health check per client, serially (50 clients = 650 queries) | seconds-long agency pages | Batch health from the storefront aggregate; `Promise.all` across clients |
| DB-04 | HIGH | `src/lib/integrity/runtime.ts:166-187` | `detectOrphans` materializes ALL workspaces/subs/invoices/bookings/websites in JS | full-table scans on the integrity action | `NOT EXISTS` SQL per orphan check |
| DB-05 | HIGH | `src/lib/observability/service.ts:55-73` | `getPerformanceMetrics` loads ALL generation sessions + nested stages + all publish statuses | unbounded O(all sessions) | `groupBy`/`aggregate` in SQL |
| DB-06 | HIGH | `src/modules/business-health/application/runtime.ts:128-131`, `website-evolution/application/runtime.ts:102-106`, `recommendation-runtime/application/history.ts:93-101` | `Setting.findMany({ where: { key } })` — no `key` index → seq scan (~100k rows) on 4 platform-wide views | seconds on super-admin surfaces | **Add `@@index([key])`** |
| DB-07 | MEDIUM | `src/services/super-admin.service.ts:62-83` | `getAllTenants` includes all users + counts, no `take` | large join payload per dashboard load | `select` + paginate |
| DB-08 | MEDIUM | `src/services/super-admin.service.ts:36-46` | `getPlatformStats` runs full-table `count()` on 2M-row tables (no index path) | several scans per load | `reltuples` approximate counts or counters table |
| DB-09 | MEDIUM | `src/modules/tenant/infrastructure/website-repository.ts:23-28` | aggregate `include: { tenant: true }` pulls the whole Tenant row (incl. razorpay/IG/Twitch/YT secrets) for one name | unnecessary column transfer every aggregate build | `select: { tenant: { select: { name: true } } }` |
| DB-10 | MEDIUM | `src/modules/billing/application/revenue-service.ts:52-56,101-113` | materializes all workspace ids then `where in` a huge list; per-plan N+1 `findUnique` | O(workspaces) memory + N+1 | range queries + one `findMany({ where: { id: { in } } })` |
| DB-11 | MEDIUM | `src/features/dashboard/service.ts:16-37` + `health/engine.ts` + `creator-success/runtime.ts` | dashboard re-counts products/gallery/orders/settings 3× independently of the aggregate | ~60-70 queries per dashboard load | derive metrics/health/success from the RuntimeContext snapshot |
| DB-12 | MEDIUM | `src/app/super-admin/page.tsx:26-34` + `alert-evaluator.ts:72-80` | operational metrics collected twice (collect + evaluateAllRules calls collect again) | doubled subscription load | thread the metrics object |
| DB-13 | LOW | `src/lib/media/service.ts:412-423` | asset URL resolution = one query per asset | ≤4 queries (bounded) | `findMany({ where: { id: { in } } })` |
| DB-14 | LOW | `src/features/analytics/service.ts:36-41` | workspace lookup awaited before the sessions query | serialized latency | include in initial `Promise.all` |

## Phase 2 — Index audit (prisma/schema.prisma)

Verdict: ✅ fine · ⚠️ missing composite · 🔁 redundant.

### Missing indexes (highest value)

| Model | Missing | Why | Lines |
| --- | --- | --- | --- |
| `Setting` | `@@index([key])` | 4 platform-wide `where: { key }` scans | 444 |
| `AnalyticsEvent` | `@@index([tenantId, eventType, occurredAt])` | page-view filter+sort on 10M rows | 1362 |
| `GalleryImage` | `@@index([tenantId, status, isActive, order])` | `findPublished` on 2M rows | 473 |
| `Product` | `@@index([tenantId, status, isActive, order])` | `findPublished` on 100k rows | 362 |
| `ProductOrder` | `@@index([tenantId, status])`, `@@index([tenantId, createdAt])` | dashboard sums + recent orders | 386 |
| `BillingInvoice` | `@@index([workspaceId, issuedAt])`, `@@index([status, issuedAt])` | per-workspace history + revenue windows | 914 |
| `GenerationSession` | `@@index([status, updatedAt])` | stale-session recovery/cleanup | 730 |
| `BillingEvent` | `@@index([type, createdAt])` | PAYMENT_FAILED + date-range counts | 838 |
| `CommissionEntry` | `@@index([createdAt])` | global date-range commission scan | 1523 |
| `User` | `@@index([role])` | orphan-scan `role notIn SUPER_ADMIN` | 334 |
| `Tenant` | `@@index([createdAt])` | platform-config lookup `orderBy createdAt` | 48 |

### Redundant indexes (drop to save write-path cost)

`Website(tenantId)` · `PublishStatus(websiteId)` · `PublishSnapshot(websiteId)` ·
`Subscription(tenantId)` · `WorkspaceMember(workspaceId)` · `BillingSubscription(workspaceId)` ·
`Settlement(settlementRef)` · `Asset(tenantId)` · `Setting(tenantId)` ·
`Offering(tenantId)` · `NewsletterSubscriber(tenantId)` · `SocialStats(tenantId)` ·
`Page(websiteId)` — all covered by their composite `@@unique`/`@@index` prefix.

### Good

`Booking(tenantId, status)` · `ContentFeedItem(tenantId, pinned, hidden, order)` ·
`AuditLog(tenantId, createdAt)` (exemplary) · `Asset(tenantId, createdAt)` ·
`PartnerInvite(partnerId, status)` · `Page(websiteId, slug)` unique.

**Note:** the index migration is intentionally NOT applied in this validation —
`prisma migrate` must run against the direct connection (see
`docs/production-readiness.md`). Exact DDL is in `docs/performance-roadmap.md`.
