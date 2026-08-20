# RCCF-72.17A Security Quick-Wins Closure

## Verdict
**A — PASSED**

All six security findings closed with behavior-preserving fixes. 23 focused security regression tests added; all verification gates green. Staged surgically — pre-existing in-flight RCCF-71.x/71.4.5 working-tree changes excluded from the staged set.

## Findings

### SEC-01 — Stored XSS via JSON-LD (P0)
- **Root cause:** `StorefrontPage.tsx` rendered creator-controlled strings into `<script type="application/ld+json">` via `dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}`. `JSON.stringify` does not escape `<`, so a value containing `</script>` breaks out of the script element.
- **Fix:** new `serializeJsonLd()` helper (`src/lib/storefront/json-ld.ts`) escapes `<`→`\u003c`, `>`→`\u003e`, `&`→`\u0026`, `\u2028`/`\u2029` — valid JSON, script-context-safe. Used at the single render point.
- **Files:** `src/lib/storefront/json-ld.ts` (new), `src/components/storefront/StorefrontPage.tsx`
- **Tests:** `tests/unit/rccf72-17a-jsonld.test.ts` (7) — script breakout, validity, quotes/ampersands, Unicode, normal/empty SEO, line separators, mixed-case closers.

### SEC-02 — simulateRazorpayEvent authorization (P0)
- **Root cause:** only `NODE_ENV !== "production"` + any authenticated session; no role gate. Any user could mint entitlement state.
- **Fix:** require `session.user.role === "SUPER_ADMIN"` (matches the canonical `super-admin-billing.actions.ts` gate). Role derived from server session only.
- **Files:** `src/actions/billing.actions.ts`
- **Tests:** `tests/unit/rccf72-17a-billing-simulator.test.ts` (9) — anonymous/ADMIN/AGENCY_ADMIN/SUPPORT/READ_ONLY/AGENCY_STAFF denied, SUPER_ADMIN allowed, client identifiers not an auth signal.

### SEC-04 — /api/dev/seed auth inversion (P0)
- **Root cause:** SUPER_ADMIN check ran only when `NODE_ENV !== "development"` — a mis-set env exposed an unauthenticated full DB reseed.
- **Fix:** SUPER_ADMIN now required unconditionally; production additionally fails closed. Canonical E2E seed (`db:seed:e2e`) unaffected (script-based).
- **Files:** `src/app/api/dev/seed/route.ts`

### SEC-08 — cron hardening (P1)
- **Root cause:** three cron routes used non-constant-time `!==` compare; empty `CRON_SECRET` collapsed to a guessable `Bearer `; `days` unclamped (negative → deletes whole audit log).
- **Fix:** new canonical `verifyBearerAuth()` (`src/lib/security/verify-bearer.ts`) — `crypto.timingSafeEqual` with length guard, fails closed on empty secret. `days` clamped to 1..3650. Applied to all three cron routes.
- **Files:** `src/lib/security/verify-bearer.ts` (new), `src/app/api/cron/cleanup-audit/route.ts`, `integrity-cleanup/route.ts`, `sync-socials/route.ts`
- **Tests:** `tests/unit/rccf72-17a-cron-auth.test.ts` (7).

### SEC-05 — preview no-store (P1)
- **Root cause:** `next.config` sets `public, s-maxage=60` for `/:slug`; an authorized draft preview (`?preview=true`) could be cached at the edge and served to anonymous visitors.
- **Fix:** middleware overrides `Cache-Control: private, no-store` on storefront responses when `?preview=true`. Published storefront caching untouched; preview-auth boundary untouched.
- **Files:** `src/middleware.ts`

### OPTIONAL — public API error sanitization
- **Fix:** `pricing/upgrade`, `pricing/plans`, `platform/sync` (GET+POST), `cron/sync-socials` now return a static `"Internal error"`/`"Sync failed"` with detail captured server-side via `captureError`. Status codes and contracts preserved. `/api/dev/seed` retains its error message (dev-only, SUPER_ADMIN-gated diagnostic surface).
- **Files:** the four routes above.

## Security Verification
| Invariant | Status |
|---|---|
| simulateRazorpayEvent: anonymous/normal/admin/agency/support/read_only → DENY; SUPER_ADMIN → ALLOW | ✅ (9 tests) |
| dev seed: anonymous → DENY; SUPER_ADMIN required unconditionally; production → DENY | ✅ |
| preview draft: `?preview=true` → `Cache-Control: private, no-store`; preview-auth ownership unchanged | ✅ |
| JSON-LD: `</script>`/`<script>` cannot escape the script context; output remains valid JSON | ✅ (7 tests) |
| cron: constant-time compare; empty secret fails closed; `days` clamped 1..3650 | ✅ (7 tests) |
| public API 500s: no internal exception detail echoed | ✅ |

## Regression Results
| Check | Result |
|---|---|
| Focused unit tests | **23/23 pass** (3 new files) |
| Full unit suite | 3799/3807 pass; **8 failures all pre-existing** `rccf71-*` theme guardrails — verified absent in `storefront-loader.ts` at HEAD, unrelated to this RCCF |
| E2E smoke | 3/3 pass (homepage, login page, invalid login) |
| E2E release environment | 4/4 pass |
| `npx tsc --noEmit` | PASS (0) |
| `npm run lint` | PASS (0, pre-existing warnings only) |
| `npm run build` | PASS (0) |
| `npx prisma validate` | PASS |
| `git diff --check` (staged) | PASS (0) |

## Staging
**Exactly 15 staged files** (surgical):
```
M src/actions/billing.actions.ts                     (SEC-02 gate only)
M src/app/api/cron/cleanup-audit/route.ts            (SEC-08)
M src/app/api/cron/integrity-cleanup/route.ts        (SEC-08)
M src/app/api/cron/sync-socials/route.ts             (SEC-08 + sanitize)
M src/app/api/dev/seed/route.ts                      (SEC-04)
M src/app/api/platform/sync/route.ts                 (sanitize)
M src/app/api/pricing/plans/route.ts                 (sanitize)
M src/app/api/pricing/upgrade/route.ts               (sanitize)
M src/components/storefront/StorefrontPage.tsx       (SEC-01 only)
M src/middleware.ts                                  (SEC-05)
A src/lib/security/verify-bearer.ts                  (SEC-08 helper)
A src/lib/storefront/json-ld.ts                      (SEC-01 helper)
A tests/unit/rccf72-17a-billing-simulator.test.ts
A tests/unit/rccf72-17a-cron-auth.test.ts
A tests/unit/rccf72-17a-jsonld.test.ts
```
- **No unrelated staged files.** Pre-existing RCCF-71.4.5 (`isPaidEvent`/`amount` in billing.actions.ts) and RCCF-71.2 (`bakedExperience` in StorefrontPage.tsx) working-tree changes remain **unstaged** (verified).
- All other in-flight work (RCCF-70.4.3, 71.x, dashboard, builder, settings, theme, publishing, construction.actions.ts) untouched.

## Git
- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**

## Next (per the agreed sequence)
- **72.17B** — `next-auth` ≥4.24.15 same-major security upgrade + `npm audit --omit=dev` CI gate.
- **72.17C** — `resolveActivePlan` request memoization + publish query deduplication (~50 → ~25 queries, dashboard −20%).