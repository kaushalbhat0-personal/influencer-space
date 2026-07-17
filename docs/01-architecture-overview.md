# 01 — Architecture Overview

## Multi-Tenant SaaS Model

CreatorStore is a **multi-tenant SaaS platform** where every influencer gets their own public storefront. Each tenant is isolated via a unique `tenantId` (UUID) that flows through every database query, server action, and service call.

### Tenant Resolution (Request → TenantId)

```
Browser Request
       │
       ▼
┌─────────────────────────────────────────────────┐
│  middleware.ts                                   │
│                                                  │
│  1. Parse hostname to extract tenant subdomain   │
│  2. Set x-tenant-host header                    │
│  3. Rewrite /path → /[tenant]/path              │
│  4. JWT auth guard for /admin/* routes          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  lib/tenant.ts — getTenantContext()             │
│                                                  │
│  1. Read x-tenant-host header                   │
│  2. Query: subdomain = host OR customDomain     │
│  3. Return Tenant object (with id)              │
└─────────────────────────────────────────────────┘
```

**Three domain types:**

| Type | Example | How it resolves |
|------|---------|-----------------|
| Platform (marketing) | `creatorshop.io` | Middleware returns early — no tenant rewrite |
| Subdomain | `snax.creatorshop.io` | Extracts `snax`, rewrites to `/snax/...` |
| Custom domain | `myinfluencer.com` | Uses full host, rewrites to `/myinfluencer.com/...` |

### Route Architecture

```
src/app/
├── layout.tsx              ← Root layout (fonts, global metadata)
├── page.tsx                ← Marketing homepage (/)
├── [domain]/
│   ├── page.tsx            ← Public influencer storefront
│   └── _components/        ← HeroBanner, BuyNowButton
├── admin/
│   ├── layout.tsx          ← Auth-gated admin shell
│   ├── login/              ← Admin login page (exempt from auth redirect)
│   ├── dashboard/          ← Admin overview
│   ├── products/           ← Storefront management
│   ├── gallery/            ← Hall of Fame
│   ├── milestones/         ← Timeline
│   ├── links/              ← Affiliate links
│   ├── settings/           ← Profile, Hero, SEO, Content Feed, Domain
│   ├── appearance/         ← Theme/colors
│   ├── billing/            ← Subscription
│   └── _components/        ← AdminSidebar, AdminLayoutClient
├── super-admin/            ← Platform-level admin (tenant management)
├── blog/                   ← Static marketing blog (SEO hub)
├── contact/ privacy/ refund/ terms/  ← Marketing legal pages
└── api/
    └── cron/
        └── sync-socials/   ← Daily cron: sync stats + content from social APIs
```

## Atomic Transactional Pattern

All mutations follow a strict **write-then-audit** pattern inside a single database transaction:

```
┌───────────────────────────────────────────┐
│  prisma.$transaction(async (tx) => {      │
│    1. settingsService.patchHeroData(tx)   │  ← atomic JSONB merge
│    2. logAction("updateHeroData", tx)     │  ← audit trail (same tx)
│  });                                       │
└───────────────────────────────────────────┘
```

**Why this matters:** If either the data write or the audit log write fails, both roll back. No partial state, no missing audit entries.

### `patchHeroData` — The Core Pattern

Instead of a read-modify-write cycle (which fails under concurrent access), `patchHeroData` uses PostgreSQL's `COALESCE` + `||` JSON merge:

```sql
INSERT INTO "Setting" ("id", "tenantId", "key", "value")
VALUES (gen_random_uuid(), $1, 'hero_data', $2::jsonb)
ON CONFLICT ("tenantId", "key")
DO UPDATE SET "value" = COALESCE("Setting"."value", '{}'::jsonb) || EXCLUDED."value"
```

- **Only specified keys are updated.** Sibling keys in the JSONB column are preserved.
- **Concurrent-safe.** No read before write. PostgreSQL resolves the conflict at the row level.
- **Sparse friendly.** The action layer strips `undefined`/`null`/`""` values before calling this, so only meaningful changes hit the database.

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Tenant Isolation | Every DB query includes `where: { tenantId }`. Admin users can only act on their own tenant (SUPER_ADMIN bypasses). |
| Auth Guard | Middleware checks JWT for `/admin/*`. Server actions check `session.user.tenantId` vs target. |
| API Keys | Stored in the `Tenant` model. OAuth tokens (Instagram/Twitch) are AES-256-GCM encrypted at rest. |
| Audit Trail | Every mutation logs `tenantId`, `action`, `metadata` (JSONB) to `AuditLog`. Sensitive keys (token, secret, password) are auto-redacted. |
| File Uploads | Client uploads to Supabase using anon key (bucket is public). Path pattern `{tenantId}/{folder}/{timestamp}-{random}.{ext}` provides tenant isolation by convention. |
| Security Headers | `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` applied globally. |

## Public vs Admin Action Separation

- **Public actions** (`contact.actions.ts`) use `getTenantContext()` — reads `x-tenant-host` from headers set by middleware. No session required. Suitable for fan-facing contact forms where the user isn't logged in.
- **Admin actions** (everything else) use `requireAuth(tenantId)` — reads `session.user.tenantId`. Requires valid JWT. Used for all mutating admin operations.

## Single Source of Truth

All data flows through the **service layer**, not directly through Prisma spread across components:

```
Page Component → Service → Prisma
                         → Returns typed data
```

For the public storefront (`[domain]/page.tsx`), a single function — `getPublicPageData(tenantId)` — assembles the entire page payload in one `Promise.all` call:

```typescript
const [profile, hero, products, links, gallery, milestones, feed] =
  await Promise.all([
    getProfile(tenantId),
    getHeroData(tenantId),
    getProducts(tenantId),
    getLinks(tenantId),
    getGallery(tenantId),
    getMilestones(tenantId),
    getContentFeed(tenantId),
  ]);
```

No circular dependencies. No component-level data fetching on the public page. This keeps Core Web Vitals fast and makes the page trivially cacheable.
