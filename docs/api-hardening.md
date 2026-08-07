# API Hardening — Final (RCCF-LAUNCH-01)

## Route inventory (15 API routes)

| Route | Auth | Rate-limited | Notes |
| --- | --- | --- | --- |
| `auth/[...nextauth]` | NextAuth | login | middleware-gated |
| `auth/register` | public-intent | 5/hr | free-plan forced (LAUNCH-01) |
| `auth/refresh-session` | JWT | — | — |
| `auth/login-as` | signed JWT | — | SUPER_ADMIN-gated at issuance |
| `cron/cleanup-audit` | CRON_SECRET | — | idempotent |
| `cron/sync-socials` | CRON_SECRET | — | batch cursor fixed (V-05) |
| `cron/integrity-cleanup` | CRON_SECRET | — | **new** (LAUNCH-01) |
| `dev/seed` | SUPER_ADMIN (non-dev) | — | **fixed** (V-05) |
| `health` | x-health-secret | — | — |
| `media/upload-url` | session tenantId | 60/min | **rate-limited** (LAUNCH-01) |
| `media/upload` | session tenantId | 60/min | **limited** (LAUNCH-01) |
| `media/register` | session tenantId | 120/min | **limited** (LAUNCH-01) |
| `platform/sync` | SUPER_ADMIN | — | dry-run first |
| `support/search` | SUPER_ADMIN | — | 4 parallel findMany (roadmap) |
| `webhooks/razorpay` | HMAC | 30/s | signature guard fixed (V-04) |

## Hardening applied this sprint

1. **`/api/dev/seed`** — SUPER_ADMIN required in any non-`development`
   environment (was unauthenticated on staging/preview).
2. **Register plan entitlement** — creator signup is **free-only**
   (`creator_launch`). The body previously accepted an arbitrary `planCode`,
   granting a paid plan in `TRIALING` with no verification. Paid plans must now
   come through the checkout flow.
3. **Media rate limits** — `upload-url` / `upload` / `register` bounded per
   tenant (60/60/120 per min) with `checkRateLimit`.
4. **Rate-limiter sweep** — expired keys evicted every 50 checks (memory bound).

## Validation posture

- No route returns a full table (all `take`/`limit`) ✅
- All mutations are POST server actions / HMAC / role-gated ✅
- **Roadmap (not sprint):** zod schemas per route (validation is ad-hoc but
  functional today), Redis-backed rate limiting (per-instance counters are weak
  at scale), `support/search` parallelization, `cleanup-audit` `days` clamp,
  webhook double idempotency-check removal.

## Payload limits / timeouts

- Server actions `bodySizeLimit: 25mb` — documented; consider lowering (roadmap).
- Media routes `nodejs` + `maxDuration=120`; `[domain]` + builder now have
  explicit `maxDuration`/memory in `vercel.json`.
