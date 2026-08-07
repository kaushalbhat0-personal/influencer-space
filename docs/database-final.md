# Database — Final (RCCF-LAUNCH-01)

## Composite index migration

Migration: `prisma/migrations/20260807000000_scale_hardening_indexes/migration.sql`
(authoritative; hand-authored from the V-05 index audit because no live DB was
available to run `prisma migrate diff --from-migrations`, which requires a shadow
database).

### Added (14)

| Index | Serves |
| --- | --- |
| `Setting(key)` | 4 platform-wide `where: { key }` scans (business health, evolution, recommendations, history) |
| `AnalyticsEvent(tenantId, eventType, occurredAt)` | page-view filter+sort on 10M rows |
| `GalleryImage(tenantId, status, isActive, order)` | `findPublished` on 2M rows |
| `Product(tenantId, status, isActive, order)` | `findPublished` on 100k rows |
| `ProductOrder(tenantId, status)` | dashboard sums |
| `ProductOrder(tenantId, createdAt)` | recent-orders lists |
| `BillingInvoice(workspaceId, issuedAt)` | per-workspace invoice history |
| `BillingInvoice(status, issuedAt)` | revenue window scans |
| `GenerationSession(status, updatedAt)` | stale-session recovery + cleanup |
| `BillingEvent(type, createdAt)` | PAYMENT_FAILED + date-range counts |
| `CommissionEntry(createdAt)` | global date-range commission scan |
| `User(role)` | orphan-scan `role notIn SUPER_ADMIN` |
| `Tenant(createdAt)` | platform-config lookup `orderBy createdAt` |
| `BillingSubscription(planId, status)` | active-subscription counts |

### Dropped (15, redundant — covered by composite/unique prefixes)

`Website_tenantId_idx` · `PublishStatus_websiteId_idx` · `PublishSnapshot_websiteId_idx`
· `Subscription_tenantId_idx` · `WorkspaceMember_workspaceId_idx`
· `NewsletterSubscriber_tenantId_idx` · `Setting_tenantId_idx` · `SocialStats_tenantId_idx`
· `Page_websiteId_idx` · `BillingSubscription_workspaceId_idx` · `Asset_tenantId_idx`
· `Offering_tenantId_idx` · `Settlement_settlementRef_idx` · `Product_status_idx`
· `GalleryImage_status_idx`

## Migration safety

- **Direct connection:** `prisma.config.ts` now prefers `DIRECT_URL`
  (Supavisor :5432) for Prisma CLI/migrate; the runtime keeps the pooled
  `DATABASE_URL`. DDL/advisory-lock operations no longer hit the pooler.
- **Pooled migration connection:** eliminated for migrate by the above.
- **Zero downtime:** all statements are `CREATE INDEX` (can use `CONCURRENTLY`
  on very large tables if required) / `DROP INDEX` — non-destructive, no table
  rewrites.
- **Rollback:** the migration is additive/reversible — re-running the DROP/CREATE
  list in reverse restores the prior index set.

## Verification

- `prisma validate` ✅ (schema + migration parse).
- Schema diff manually reconciled against the baseline migration's index
  inventory (every index name verified to exist / be new).
- Recommended: on the production database, run `EXPLAIN ANALYZE` on the hot
  queries (storefront `findPublished`, analytics page-view, revenue windows,
  integrity cleanup) before/after applying.

## Optimized query paths

- Builder save: ~1,100 statements → 3 (`createManyAndReturn`, V-05).
- Storefront pipeline memoized (halved per-request queries).
- `getAllTenants` lean `select` (no secret columns, `take:1` user).
- Dashboard/health metrics request-cached (dedupes ~26 queries per render).
