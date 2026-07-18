# 01 — Architecture Overview

## B2B2C Multi-Tenant SaaS Model

CreatorStore is a **B2B2C multi-tenant SaaS platform** built on a 3-tier model:

| Tier | Role | Entity | Auth Guard |
|------|------|--------|------------|
| **1 — Superadmin** | Platform owner. Takes global platform fee. Provisions agencies & creators. | `SUPER_ADMIN` (User.role) | `/super-admin/*` |
| **2 — Agency / Website Builder** | Pays SaaS subscription. Builds and manages stores for Creators. Earns revenue share. | `WebsiteAgency` + `AGENCY_ADMIN`/`AGENCY_STAFF` | `/agency/*` |
| **3 — Creator / Influencer** | End-user who gets a website. Can upgrade to Pro. Sells products to fans. | `Tenant` + `ADMIN` (User.role) | `/admin/*` |

### Business Model & Monetization Strategy

**Current Phase (Direct-to-Creator):**
- Super Admin creates websites and sells them directly to Creators.
- Revenue: Creator subscriptions (Pro tier) + platform fee % on Creator product sales.

**Future Phase (Agency Reseller):**
- Agencies/Website Builders buy "seats" via subscription (`AgencySubscription.maxManagedTenants`).
- Revenue scales: Agency subscription fees + Agency Creator's Pro subscriptions + platform fee % on Creator product sales split via Razorpay Route.
- Agencies earn automated revenue share (`AgencyTenant.productRevSharePercent`) on each Creator sale.

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
│  4. Role-based JWT guard for /admin/*,          │
│     /super-admin/*, /agency/* routes            │
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
├── page.tsx                ← Marketing homepage (B2B2C pricing)
├── signup/                 ← PLG self-serve registration
├── [domain]/
│   ├── page.tsx            ← Public influencer storefront
│   └── _components/        ← HeroBanner, BuyNowButton
├── admin/
│   ├── layout.tsx          ← Auth-gated admin shell
│   ├── login/              ← Admin login (NeAuth credentials)
│   ├── dashboard/          ← Creator overview
│   ├── products/           ← Storefront management
│   ├── gallery/            ← Hall of Fame
│   ├── milestones/         ← Timeline
│   ├── links/              ← Affiliate links
│   ├── settings/           ← Profile, Hero, SEO, Content Feed, Domain
│   ├── appearance/         ← Theme/colors
│   ├── billing/            ← Subscription
│   └── _components/        ← AdminSidebar, AdminLayoutClient
├── agency/
│   ├── page.tsx            ← Redirects to /agency/[agencyId] via session
│   └── [agencyId]/
│       ├── layout.tsx      ← Agency sidebar + dashboard shell
│       └── page.tsx        ← Agency dashboard
├── super-admin/            ← Platform-level admin (tenant/agency management)
├── blog/                   ← Static marketing blog (SEO hub)
├── contact/ privacy/ refund/ terms/  ← Marketing legal pages
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/  ← NextAuth handler
│   │   ├── register/       ← PLG sign-up (creates User+Agency+Subscription)
│   │   ├── login-as/       ← Superadmin impersonation
│   │   └── auto-login/     ← Post-webhook auto-login
│   ├── checkout/           ← Razorpay order creation
│   ├── webhooks/razorpay/  ← Payment webhook (user+agency provisioning)
│   └── cron/
│       ├── sync-socials/   ← Daily social content sync
│       └── cleanup-audit/  ← Weekly audit log purge
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

**PLG Registration Transaction** — the sign-up flow creates 3 entities atomically:

```typescript
await prisma.$transaction(async (tx) => {
  const user      = await tx.user.create({ ... });                    // Role: AGENCY_ADMIN
  const agency    = await tx.websiteAgency.create({ ... });          // subdomain: agency_{userId}
  await tx.user.update({ agencyId: agency.id });                      // link user to agency
  await tx.agencySubscription.create({ agencyId, plan: "STARTER", maxManagedTenants: 1 });
});
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
| Auth Guard | Middleware role-based: `/super-admin` (SUPER_ADMIN only), `/agency` (AGENCY_ADMIN/STAFF), `/admin` (any auth). JWT via NextAuth. |
| API Keys | Stored in the `Tenant` model. OAuth tokens (Instagram/Twitch) are AES-256-GCM encrypted at rest. |
| Audit Trail | Every mutation logs `tenantId`, `action`, `metadata` (JSONB) to `AuditLog`. Sensitive keys (token, secret, password) are auto-redacted. |
| File Uploads | Client uploads to Supabase using anon key (bucket is public). Path pattern `{tenantId}/{folder}/{timestamp}-{random}.{ext}` provides tenant isolation by convention. |
| Security Headers | `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` applied globally. |

## NextAuth Session Model

The JWT token and session carry:
```
token:  { id, email, role, tenantId, agencyId }
session.user: { id, email, role, tenantId, agencyId }
```

**Login redirect logic** (in `LoginForm.tsx`):
- `SUPER_ADMIN` → `/super-admin`
- `AGENCY_ADMIN` / `AGENCY_STAFF` → `/agency` (redirects to `/agency/[agencyId]`)
- `ADMIN` (Creator) → `/admin/dashboard`

**Auto-Login Flow** (after Razorpay guest checkout):
1. Webhook creates User + WebsiteAgency + AgencySubscription
2. Client redirects to `/api/auth/auto-login?email=xxx`
3. Route polls `prisma.user.findUnique({ email })` until user exists (max 30s)
4. On success: generates NextAuth JWT via `encode()`, sets session cookie, redirects to `/agency`

## Public vs Admin Action Separation

- **Public actions** (`contact.actions.ts`, `register/route.ts`, `checkout/route.ts`) — no session required. Use `getTenantContext()` for tenant-aware endpoints or accept `email` for guest flows.
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
