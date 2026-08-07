# Production Readiness — RCCF-VALIDATION-05 (Phase 11)

Supabase · Storage · RLS · Prisma · Env/Secrets · Vercel · ISR · Runtimes ·
Memory · Bundles.

## Findings

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| PR-01 | HIGH | Prisma CLI/migrations run against the **pooled** Supavisor `DATABASE_URL` — DDL/advisory-lock ops fail against the pooler. There is no `DIRECT_URL` wired into `prisma.config.ts`. | Point `prisma.config.ts` datasource at the direct connection (port 5432) for migrate; keep the pooled URL at runtime. |
| PR-02 | HIGH | `.env`/`.env.local` use `sslmode=no-verify` — TLS certificate verification disabled on the Postgres connection (MITM window). `.env.example` correctly uses `sslmode=require`. | `sslmode=require` (or `verify-full` with the Supabase CA). |
| PR-03 | HIGH | `supabase/migrations/storage_rls_policies.sql:15-21` — anon INSERT policy on the **public** `influencer-images` bucket (no path/ownership check). Anyone can upload arbitrary files to a public bucket; the signed-upload flow makes it vestigial. | New migration dropping the anon-INSERT policy; restrict to `authenticated` + path scoping. |
| PR-04 | MEDIUM | `src/lib/prisma.ts` `pgbouncer=true` param is ignored by the pg driver (legacy directive); no explicit `connection_limit` (pg default 10 per instance). | Set pool options on `PrismaPg` (e.g. `max: 1-5`); confirm Supavisor transaction-mode pooling. |
| PR-05 | MEDIUM | `vercel.json` sets `maxDuration` only for `admin/settings/**`; the heaviest dynamic routes (`[domain]`, `/builder`) have no override — default 10s Hobby timeout can be hit by the aggregation pipeline. | Add `maxDuration`/memory for `[domain]` and `/builder`. |
| PR-06 | MEDIUM | `next.config.mjs` `/:slug` header forces `Cache-Control: public, max-age=0, s-maxage=60, SWR=600` on ALL slugs — contradicts `force-dynamic` intent on `[domain]` and applies to marketing routes. | Restrict the header to genuinely cacheable routes. |
| PR-07 | MEDIUM | `/api/health` falls back to `"local-dev-secret"` when `HEALTH_SECRET` is unset in prod (`validate-env.mjs` only warns). | Require `HEALTH_SECRET` in production. |
| PR-08 | MEDIUM | `domain-settings.tsx` client component reads `process.env.PLATFORM_BASE_DOMAIN` (server-only → `undefined` in browser) then hardcodes `"creatorspace.app"`. | Use `NEXT_PUBLIC_PLATFORM_BASE_DOMAIN`. |
| PR-09 | MEDIUM | Local `.env.local` contains LIVE production credentials (VERCEL_API_TOKEN, Supabase service-role, Razorpay live keys, YT key, DB password). Not committed (gitignored) but live if the file leaks. | Rotate `VERCEL_API_TOKEN` + service-role key if the file ever left the machine. |
| PR-10 | LOW | `experimental.serverActions.bodySizeLimit: "25mb"` is large (server-action abuse surface). | Lower. |
| PR-11 | GOOD | RLS is correctly bypassed by the Prisma service-role data flow; only storage needs policies. Prisma global singleton correct for serverless; no `$disconnect` misuse in runtime; no heavy native libs (sharp/playwright/puppeteer) in runtime deps. | — |
| PR-12 | GOOD | No secrets in committed code or client components; `.env*` gitignored; `sitemap` ISR (3600s) appropriate; media routes `nodejs` + `maxDuration=120`; `await import("@/lib/prisma")` used to split server bundles. | — |

## Supabase / Prisma configuration summary

- **Data path:** Next.js server → Prisma (service role) → Supabase Postgres.
  RLS only governs direct anon access (storage). This is the correct model.
- **Pooling:** Supavisor transaction-mode pooling; `PrismaPg` adapter; keep the
  pooled URL at runtime, use DIRECT_URL for migrations (PR-01).
- **Storage:** signed two-step direct upload (service role) bypasses the Vercel
  413 limit; public URLs for reads; chunked deletes ≤900. Tighten the anon
  policy (PR-03) and explicit `expiresIn` on signed URLs.

## Recommended startup changes (before scale)

1. Apply the DIRECT_URL migration wiring + `sslmode=require`.
2. Drop the anon-INSERT storage policy.
3. Add `maxDuration` to `[domain]` + `/builder`.
4. Require `HEALTH_SECRET` in production.
5. Add the missing index migration from `docs/performance-roadmap.md`
   (run against the direct connection).
6. Register the reconciliation + integrity-cleanup crons and enable
   `jobRunner` via `instrumentation.ts` (or real cron routes).
