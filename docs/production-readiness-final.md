# Production Readiness — Final (RCCF-LAUNCH-01)

## Infrastructure changes applied

| Area | Change | File |
| --- | --- | --- |
| Prisma CLI / migrations | datasource prefers `DIRECT_URL` (direct 5432) — migrate no longer runs against the pooled endpoint | `prisma.config.ts` |
| Runtime pooling | unchanged — `src/lib/prisma.ts` keeps the pooled `DATABASE_URL` via `PrismaPg` | `src/lib/prisma.ts` |
| Vercel function limits | `[domain]` + builder get `maxDuration`/memory (were default 10s Hobby) | `vercel.json` |
| Cron | `/api/cron/integrity-cleanup` registered (daily) | `vercel.json` + new route |
| Storage policy | anon-INSERT policy on the public `influencer-images` bucket **removed** (vestigial + abuse vector); public READ kept | `supabase/migrations/20260807_drop_anon_upload_policy.sql` |
| TLS | `.env.example` documents `sslmode=require` for both pooled + direct | `.env.example` |

## Configuration review

| Item | Status |
| --- | --- |
| Secret exposure | ✅ none committed; `.env*` gitignored; no secrets in client components |
| RLS | ✅ correct model (Prisma service role bypasses; storage is the only anon surface) |
| Connection pooling | ✅ Supavisor transaction mode; pg adapter `max` tuning is documented roadmap |
| ISR | ✅ `sitemap` 3600s; storefront deliberately `force-dynamic` (IMPLEMENTATION-16) with 60s CDN cache + SWR |
| Edge vs Node | ✅ media routes `nodejs`; no edge-runtime mismatch found |
| Health endpoint | ⚠️ `local-dev-secret` fallback — roadmap: require `HEALTH_SECRET` in prod |
| Storage | ✅ signed two-step upload (service role); explicit `expiresIn` is roadmap |
| Bundle | ✅ `next/font/local` self-hosted; builder `next/dynamic ssr:false`; `await import("@/lib/prisma")` split points |

## Remaining hardening (roadmap, non-blocking)

1. `sslmode=verify-full` + Supabase CA on the direct URL (currently `require`).
2. Explicit pg pool `max` on the `PrismaPg` adapter.
3. Require `HEALTH_SECRET` in production (no fallback).
4. `NEXT_PUBLIC_PLATFORM_BASE_DOMAIN` for the client domain display.
5. Signed-upload `expiresIn` + `upsert:false`.
6. Apply the index migration against the direct connection (`prisma migrate
   deploy` with `DIRECT_URL` set) and verify with `EXPLAIN ANALYZE`.

## Startup checklist for launch

- [ ] `DIRECT_URL` set in Vercel env (direct 5432).
- [ ] Apply `20260807000000_scale_hardening_indexes` via `prisma migrate deploy`.
- [ ] Apply the storage policy drop in Supabase.
- [ ] `sslmode=require` (or `verify-full`) on both URLs.
- [ ] Add `HEALTH_SECRET` to production (no fallback).
- [ ] Confirm the three crons run (`sync-socials`, `cleanup-audit`,
      `integrity-cleanup`).
