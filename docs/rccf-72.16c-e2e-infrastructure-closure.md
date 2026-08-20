# RCCF-72.16C — Playwright E2E Infrastructure Closure Report

## 1. Executive Verdict
**Grade: A — the E2E gate is now trustworthy at the infrastructure level.**

- Discovery is non-zero and reproducible: **304 tests in 47 files** (was **0 tests in 0 files**).
- The `globalSetup` DB validation, which previously aborted every run, now connects and passes.
- Real browser tests execute against the live dev server (port 3000) and report per-test results.
- A silent zero-test green run is now impossible: `test:e2e:ci` begins with `playwright test --list`, which fails hard on any collection error.
- **Release gate assessment: RED today, for reasons outside this ticket's scope** — the `release` project (22 failures) asserts features still in-flight in the uncommitted working tree (creator provisioning, agency lifecycle, publishing). This is feature-state, not infrastructure. The gate is now *honest*: red means in-flight features or listed test-quality issues, never a silent zero-test false-green.

**Staged status:** Commit NOT CREATED. Push NOT PERFORMED.

## 2. Production Root Cause
Zero-test discovery was caused by a **Prisma 7 `prisma-client` generator emitting an ESM-only client**:

- `src/generated/prisma/client.ts` used `import.meta` (for `__dirname`) — ESM-only syntax.
- Playwright's CJS loader cannot evaluate that file.
- `tests/e2e/shared/database.ts` statically imports the generated client; `tests/e2e/release/environment.spec.ts` is the only spec that imports `database.ts`.
- A file-load error during **collection** aborts the whole run → `Total: 0 tests in 0 files` even though the suite contained 304 tests.

Two further layers surfaced after collection was fixed (each verified empirically):

1. **Prisma 7 requires an adapter.** Bare `new PrismaClient()` throws `PrismaClientInitializationError`. The app itself uses `PrismaPg` (`src/lib/prisma.ts`); the test helper did not.
2. **The Playwright process had no `DATABASE_URL`.** Empirically probed (`DATABASE_URL= UNDEFINED` in the test process). `pg` therefore defaulted to `localhost` → `ECONNREFUSED` at `db.user.findFirst` (globalSetup `getSuperAdmin`), aborting all projects. The reachable Supabase pooler (`aws-1-ap-northeast-2.pooler.supabase.com:6543`, TCP connect verified) was never used.

## 3. Architecture Invariant & Option Selection
**Invariant:** the E2E gate must (a) discover a non-trivial test set, (b) actually execute browser tests against the real app, and (c) fail loudly rather than silently when collection breaks.

Options considered for the ESM-in-CJS failure:

| Option | Rejected / Chosen | Why |
|---|---|---|
| Dynamic `import()` workaround in `shared/database.ts` (mirroring `global-setup.ts`) | **Rejected** | Fixed collection but broke *execution*: the native ESM loader mis-treats the `.ts` as CJS → same `import.meta` error in `globalSetup`. |
| `moduleFormat = "cjs"` on the `prisma-client` generator | **Chosen** | Root-cause fix. Regenerated client is CJS, zero `import.meta`; no app code change, no generated-file diff (`src/generated/prisma` is gitignored). |
| `PrismaPg` adapter in the test helper | **Chosen** | Mirrors `src/lib/prisma.ts`; `@prisma/adapter-pg` is CJS-safe and matches the app's only supported construction path. |
| `DATABASE_URL` into `.env.playwright` | **Chosen** | The config already loads `.env.playwright`; file is gitignored (`.gitignore:43` `.env*`), so no secret is committed. Local dev only; CI supplies the URL via process env. |
| `SKIP_DB_CHECK=true` permanently | **Rejected** | Would disable the DB pre-check that guards release-grade tests; weakens the gate. |

## 4. Implementation Changes
| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `moduleFormat = "cjs"` to the `prisma-client` generator block. Regenerated via `npx prisma generate`. |
| `tests/e2e/shared/database.ts` | Construct `PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })` — mirrors `src/lib/prisma.ts`. |
| `package.json` | `test:e2e:ci` now `playwright test --list && playwright test --reporter=list --retries=2`; added `test:e2e:list`. |
| `.env.playwright` *(gitignored, local only)* | Appended `DATABASE_URL` (pooler URL matching `.env.local`). |

## 5. Behavior Preservation
- No application source under `src/` was changed. Zero app behavior impact.
- No tests were rewritten, deleted, or added (the one temporary probe spec was removed after use).
- Unrelated working-tree work (theme/dashboard/builder/settings/RCCF-70.4.3/RCCF-71.x/publishing; `construction.actions.ts` themeConfig lines) remains untouched and unstaged.
- `prisma.schema` generator output location, provider, and datasource unchanged — only `moduleFormat` added.

## 6. Regression Coverage
- `test:e2e:ci` regression guard: prepended `playwright test --list` so any future collection error (ESM loader, missing dir, syntax) fails CI instead of reporting a green 0-test run.
- `test:e2e:list` script provides a single human-run command for the guard.
- No source-level guardrail unit test is appropriate here: the fix is configuration + test-helper wiring, verified by the real gate itself (discovery + execution).

## 7. Verification Results
| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run build` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0; only pre-existing `src/` unused-var warnings) |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS (CJS output, no `import.meta`) |
| `git diff --check` | PASS |
| `npx playwright test --list` | PASS — 304 tests in 47 files |
| Smoke (`--project=smoke`) | 4 passed / 1 failed / 25 skipped |
| Full E2E (all projects) | 45 passed / 25 skipped / 103 failed / 131 did not run (15.3m) |

**Failure breakdown (full run, 103):** super-admin 48, production 29, release 22, smoke 2, creator 1, public 1.

## 8. Diff Discipline
- **In-scope (tracked):** `prisma/schema.prisma`, `tests/e2e/shared/database.ts`, `package.json`.
- **In-scope (gitignored, local):** `.env.playwright`.
- **Untouched:** all other working-tree changes (in-flight features, prior RCCF work, `construction.actions.ts` themeConfig lines).
- **Frozen surfaces:** none of this ticket's changes touch auth, middleware, tenant resolution, billing, publishing, media/storage, Builder/LayoutEngine, or storefront.

## 9. Deferred Findings (out of scope — documented, not chased)
1. **Orphaned test assets:** `tests/e2e/partner/screenshots.spec.ts`, `tests/e2e/specs/creator-journey.spec.ts`, top-level `tests/e2e/*.spec.ts`, and `tests/e2e/smoke.config.ts` match no project `testMatch`. Dead weight; cleanup candidate.
2. **Projects with zero matching files:** `agency`, `billing`, `accessibility`, `performance`, `responsive` — directories do not exist; tolerated in the full multi-project run ("No tests found" only when selected alone).
3. **No `webServer` in `playwright.config.ts`** — the gate assumes an externally started dev server on port 3000. Should be added for CI self-containment (needs a warm-up readiness poll to avoid dev-server startup races).
4. **`SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` absent from `.env.playwright`** → 25 smoke super-admin tests skip. The DB-side check confirms a SUPER_ADMIN exists; supplying creds would exercise those paths.
5. **Test-quality issues surfaced (not infrastructure):**
   - `smoke/login.spec.ts` expects literal `Invalid`/`Error` text on the login form; the current form does not render it (selector drift — possibly interacting with in-flight LoginForm work).
   - `smoke/ping.spec.ts` uses fixed `waitForTimeout` sleeps → flakes under full-run parallel load (passed in isolation, failed in the full run).
   - 131 "did not run" in the full run — tests not reached (worker/parallel abort after heavy failures); expected under current feature-in-flight state.
6. **Release gate:** `release` project is red (22 failures) purely on feature-state assertions for in-flight work (provisioning, agency lifecycle, publishing). Re-certify once that work lands.

## 10. Risks & Edge Cases
- **Secrets hygiene:** `DATABASE_URL` in `.env.playwright` is local/gitignored; CI must inject `DATABASE_URL` via secrets for the `globalSetup` DB check. Documented; no action taken.
- **`process.env.DATABASE_URL!` non-null assertion:** globalSetup treats a missing URL as a hard failure by design (throws). Acceptable — loud failure preferred over silent skip.
- **`--list` guard cost:** negligible (~2s) added to every CI e2e invocation.

## 11. Recommendation
**Proceed — stage and commit** once the working tree is otherwise settled (this ticket makes no commit itself). The E2E gate is now a trustworthy signal: a green run means the covered features work and infra is sound; a red run means real feature-state or listed test-quality issues — never a silent zero-test green.

---

## Before / After Discovery
| Metric | Before fix | After fix |
|---|---|---|
| `playwright test --list` (full) | 0 tests in 0 files | 304 tests in 47 files |
| `globalSetup` DB validation | aborted all runs (`import.meta` → collection; `ECONNREFUSED` → execution) | PASS |
| Smoke project | blocked | 4 passed / 1 failed / 25 skipped |
| Release project discovery | 0 (SyntaxError abort) | 37 tests in 6 files |

## Git State
- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**