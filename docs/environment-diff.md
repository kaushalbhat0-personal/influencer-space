# Environment Diff

**IMPLEMENTATION-18 · Phase 8 · 2026-08-01**

## Claim

Compare the production environment with localhost and isolate environment-driven
differences.

## Observable differences (browser + network evidence)

| Aspect | Local (`localhost:3000`) | Production (`influencer-space-alpha.vercel.app`) |
|---|---|---|
| `NODE_ENV` | development | production |
| Storefront page chunk | `page-e88659a8149c2714.js` | `page-a39ff2a98380bd96.js` |
| `data-runtime-signature` on `<main>` | present (`75e22f9c…`) | **absent** |
| Storefront content | products, gallery, services, courses… | all placeholders |
| Builder canvas | renders | **absent** |
| `Invalid UUID ""` errors | none | present (server actions) |
| `Cannot convert undefined or null to object` | none | present |
| Middleware rewrite on storefront | none | none (both serve `/[domain]`) |
| `Cache-Control` storefront | `no-store` | `no-store` |

## Root environmental difference

**Production builds from `git HEAD` (commit `0fbe8cf`, IMPLEMENTATION-12).**
The fixes in IMPLEMENTATION-13–17 are **uncommitted working-tree changes**, so
they exist on this machine but were never deployed. This is proven by:

- The deployed page chunk hash (`page-a39ff2a98380bd96.js`) ≠ the local build
  (`page-e88659a8149c2714.js`).
- Production lacks `data-runtime-signature` (added in IMPLEMENTATION-16, still
  uncommitted).
- Production exhibits the `Invalid UUID ""` and `Object.keys(undefined)`
  defects that IMPLEMENTATION-13/15 fixed locally.

## Env-config notes (no evidence these cause the divergence)

- `.env.vercel` in the repo has empty `DATABASE_URL`/`NEXT_PUBLIC_APP_URL`; the
  real Vercel project variables are not committed. The shared Supabase project
  (`flhllvzzbtkfrcrajicq`) is used by both local and production (proven by
  shared data), so a DB-connection difference is **not** the cause.
- Production host is in the middleware `platformDomains` default list; no
  rewrite was observed.

## Verdict

The environment does not cause the divergence by config or hosting — it causes
it by **deploying older code**. Everything else (middleware, cache, host
detection, tenant resolution) behaved identically in the browser.
