# RCCF-72.16E — E2E Test Database Cleanup & Deterministic Seed Closure

## Verdict
**A — PASSED**

The E2E environment now has deterministic canonical accounts and a repeatable, idempotent seed. Historical test-namespace data is managed exclusively through the namespace registry; nothing outside the proven E2E namespace was touched. No secrets were committed. Application code was not modified.

## Database Target (Phase 1)
- **Environment:** Remote Supabase (dev/QA) — the same database the running dev server (port 3000) uses
- **Host:** `aws-1-ap-northeast-2.pooler.supabase.com:6543` (pooler) / `db….supabase.co:5432` (direct, IPv6-only unreachable)
- **Database:** `postgres`
- **Production: NO** — no production project/tenant identified; the DB is the shared dev/QA environment
- Confirmed via `.env.local`, `.env.playwright`, and direct connection probes (redacted)

## Before (Phases 2–5)
| Item | Count |
|---|---|
| Candidate test users | 61 (2 SUPER_ADMIN, 6 AGENCY_ADMIN, 53 ADMIN — predominantly RCCF/QA artifacts) |
| Candidate test tenants | 33 total: 26 RCCF-prefixed, 25 QA/test-like |
| Known missing accounts | `testcreator1@gmail.com`, `agency@creatorstore.test`, `creator@creatorstore.test` |
| Real-looking creators preserved | Cristiano Ronaldo, 3 ALL DAY, Shreenivasan Iyer, R15 Seed Creator, Test Creator 4/5 — **NOT touched** |

Dependency graph mapped from `prisma/schema.prisma` (cascade chains: Tenant→Website→Page→Section→Block→…, Agency→Workspace→WorkspaceMember, User→ClientAssignment/WorkspaceMember). The existing `scripts/clean-supabase.ts` (broad destructive wipe) was reviewed and explicitly NOT run — it would delete nearly all data and is out of scope.

## Strategy (Phase 6)
**Strategy C — Deterministic test-namespace registry** (within the shared dev/QA DB), per the architectural preference for *deterministic reset/seed* over broad manual deletion:
- Canonical namespace = fixed UUIDs + `@creatorstore.test` identities + `testcreator`/`testagency` subdomains.
- The seed's reset pass removes ONLY this namespace (children before parents, per the schema FK graph), then recreates it.
- No heuristic deletion ("anything that looks synthetic") — every removal is keyed to the namespace.

## Cleanup (Phase 12)
- **Test users removed:** 3 namespace users (`admin@creatorstore.test`, `agency@creatorstore.test`, `creator@creatorstore.test`) — reset and recreated
- **Test tenants removed:** 1 namespace tenant (`testcreator`) — reset and recreated
- **Dependent records removed:** namespace-scoped children (products, orders, gallery, subscription, settings, client assignments, workspace, agency, invitations) — reset and recreated
- **Real/non-test data:** 0 records touched outside the namespace

## Deterministic Seed (Phases 8–10, 13)
Reused the repo's existing `tests/fixtures/test-seed.ts` and repaired it to actually run against this schema:
- **Bug fixed:** fixed IDs were invalid for `@db.Uuid` columns (`P2007` on every run) → now derived as deterministic v5 UUIDs from the fixed names, preserving repeatable assertions.
- **Password:** canonical `admin123` (matches `prisma/seed.ts`, `tests/reset-pw.ts`, `docs/recovery-03-certification.md`, and the 72.16D restoration). Overridable via `E2E_TEST_PASSWORD` env for CI. Hashed with the repo's bcrypt mechanism — no plaintext stored.
- **Reset pass added:** scoped deletion of the namespace before every seed.

## E2E Validation (Phases 14–15)
| Check | Result |
|---|---|
| Discovery | 304 tests / 47 files ✓ |
| Smoke project | **18 passed / 12 failed** (12 = rate-limit-blocked super-admin logins — deferred to 72.16F) |
| Release environment spec | 4/4 passed ✓ |
| Super-admin project | 10 passed (was 1) — remaining failures rate-limited |
| Missing-account failures | **eliminated** — all canonical accounts now exist and authenticate |
| Rate limit | unchanged (`/api/auth/login` 10/15min/IP) — not modified |

## Verification (Phase 16)
| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0) |
| `npm run build` | PASS (0) |
| `npm run lint` | PASS (0, pre-existing warnings only) |
| `npx prisma validate` | PASS |
| `git diff --check` | PASS (CRLF normalization warnings only) |

## Files Changed
```
package.json                 | 1 +   (db:seed:e2e script)
tests/fixtures/test-seed.ts  | 94 +  (deterministic UUIDs, reset pass, canonical password)
tests/fixtures/auth.ts      | 9 +-  (canonical password for agency/creator fixtures)
```
Plus gitignored `.env.playwright` (HEALTH_SECRET, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD) — local only, NOT committed.

## Deferred
- **RCCF-72.16F — E2E auth session reuse / storageState** — resolves the 10-login/15-min rate-limit bottleneck by authenticating once per worker instead of per test. This is the single highest-value follow-up.
- **Historical RCCF/QA tenant bulk cleanup** — deferred to the dedicated-E2E-DB migration (per the architectural preference for a separate E2E database with full reset), rather than deleting accumulated artifacts from the shared dev/QA DB.

## Git
- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**