# Routing Audit

**IMPLEMENTATION-13 · Phase E · 2026-08-01**

## Verdict

The chain `Provision → Website → Tenant → Domain → Route → Storefront` is now
guaranteed, and a creator cannot publish without storefront routing existing.

## The Production Error

Dashboard exists, Builder exists, Storefront 404s after publish.

### Root causes

1. **Middleware platform-domain whitelist mismatch** — `src/middleware.ts:14-17`
   hardcoded `["localhost:3000", "influencer-space-alpha.vercel.app"]`. Any host
   not in the list is treated as a tenant host and rewritten to `/{tenantHost}`
   (`middleware.ts:71-80`). If the real deployment domain isn't in the list:
   - `GET https://<real-domain>/<slug>` → rewrite to `/<real-domain>/<slug>` → no matching route → 404
   - `GET https://<slug>.<real-domain>/` → `[domain]` gets `"<slug>.<real-domain>"` → tenant lookup fails → `notFound()`.
2. **Publish FK violation** — `PublishSnapshot.websiteId` references
   `PublishStatus.websiteId` (`schema.prisma:156`), but `createPublish` inserted
   the snapshot before the status upsert (`publishing-repository.ts:34` before `:43`).
   Any website without a `PublishStatus` row failed at publish → no snapshot →
   storefront 404 forever.
3. **No publish-time routing validation** — nothing stopped a publish when the
   tenant had neither subdomain nor custom domain.

### Chain verified

| Step | File:line | Status |
|---|---|---|
| Tenant created with subdomain | `provisioning-service.ts:183` | ✅ |
| Website created | `provisioning-service.ts:184` | ✅ |
| PublishStatus created (draft) | `provisioning-service.ts:194` | ✅ |
| Publish upserts status → live + liveVersion | `publishing-repository.ts` | ✅ (fixed FK order) |
| Storefront tenant lookup by subdomain/customDomain | `[domain]/page.tsx:15` | ✅ |
| `getLive` returns snapshot when liveVersion set | `publishing/snapshot.ts:102-112` | ✅ |
| Middleware host classification | `middleware.ts` | ✅ (env-driven domains) |
| View-site links | `platform.ts:23-25` | ✅ |

## Fixes

1. **`src/middleware.ts`** — `platformDomains` is now derived from
   `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, and the new `PLATFORM_DOMAINS` env var,
   in addition to the two existing defaults. The platform host can no longer be
   misclassified as a tenant host.
2. **`src/modules/tenant/infrastructure/publishing-repository.ts`** — the
   `PublishStatus` row is guaranteed to exist (created as `draft` if absent)
   **before** the snapshot insert, then updated to `live`. FK failures are
   impossible and the transition to `live` still happens atomically.
3. **`src/lib/publishing/service.ts`** — publish returns
   `"Storefront routing is not configured..."` when the tenant has neither a
   subdomain nor a custom domain. No dead storefront URLs.

## Remaining Operational Note

The storefront route is an ISR page (`revalidate = 60`). Publish revalidates
`/`, `/admin/dashboard`, and `/${tenant.subdomain}` after commit
(`publishing/service.ts`). If a 404 was cached before this deployment, it clears
on the first publish after deploy.
