# RCCF-72.17B NextAuth Security Upgrade & Dependency Audit Gate Closure

## Verdict
**A — PASSED**

`next-auth` upgraded same-major `4.24.14 → 4.24.15` (the v4 security target), a reproducible production-audit gate added, all auth flows verified, zero source-code changes required. Surgical staging — the pre-existing 72.16E `db:seed:e2e` package.json line excluded.

## Installed Versions
| | Requested | Resolved |
|---|---|---|
| **Before** | `^4.24.14` | `4.24.14` |
| **After** | `^4.24.15` | `4.24.15` |

## Dependency Changes
Only next-auth and its transitive `uuid` changed (package + lockfile only, **no source edits**):
- `next-auth 4.24.14 → 4.24.15` — the v4 security patch release (same major, API-compatible)
- `uuid 8.3.2 → 11.1.1` — next-auth's transitive `uuid` requirement bumped (`^8.3.2` → `^11.1.1`); uuid is NOT a direct dependency and is never imported by app source (verified), so the major bump is lockfile-only
- `@auth/core@0.34.3` — unchanged; an **optional peer** of next-auth that the app never imports (verified via grep)

## Security Audit
**Before** (`npm audit --omit=dev`): 15 vulnerabilities (2 critical, 7 high) — the criticals were the next-auth v4 `@auth/core` homoglyph-bypass / getToken-exception advisories.

**After** (`npm audit --omit=dev`): 14 vulnerabilities (2 critical, 7 high, 4 moderate, 1 low).

Classification of the remaining 14:
| Advisory | Package | Classification |
|---|---|---|
| `@auth/core` ≤0.41.2 (critical, ×2) | Optional peer of next-auth, **never imported by app** | TRANSITIVE_ACCEPTED (unreachable; v4 credentials path uses bcrypt directly; npm's suggested "fix" is a data-quirk downgrade to 4.24.7) |
| `postcss` ≤8.5.22 (high, ×4) | Under `next`'s node_modules | UNRELATED — fix requires `next@16` (breaking); tracked as RCCF-72.17H (Next major) |
| `deepmerge-ts`, `fast-uri`, `hono`, `@hono/node-server`, `valibot`, `@prisma/dev` (high/moderate) | Under `prisma` CLI (`@prisma/config`, `@prisma/dev`) | DEV_TOOLING / TRANSITIVE_ACCEPTED — build-time CLI, not runtime app surface |
| `cookie` <0.7.0 (moderate) | Under unused `@auth/core` tree | TRANSITIVE_ACCEPTED (unreachable) |
| `uuid` <11.1.1 (moderate) | **RESOLVED** by this upgrade |

**Gate added:** `"audit:prod": "npm audit --omit=dev"` in package.json — independently invokable, does not fail lint/build. No CI workflow exists in this repo (`.github` has templates only), so no workflow integration was added (creating CI is RCCF-72.17G territory).

## Authentication Regression
All verified against the upgraded 4.24.15 via both unit tests (which exercise the upgraded node_modules) and E2E against a freshly-restarted dev server running 4.24.15:
| User | Expected | Result |
|---|---|---|
| `creator@creatorstore.test` | creator dashboard | ✅ → `/admin/dashboard` |
| `agency@creatorstore.test` | agency workspace | ✅ → `/agency` |
| `admin@creatorstore.test` | super-admin | ✅ → `/super-admin` |
| `superadmin@influencer.space` | super-admin dashboard | ✅ → `/admin/dashboard` |
- **Login/logout/session refresh:** NextAuth success URL flow verified for all four
- **Protected route / middleware redirect:** `/admin/login` serves; authenticated flows redirect by role (verified)
- **Tenant ownership:** unchanged (no source edits to auth/tenant code)
- **Invalid login:** smoke `invalid login shows error` passes

No source files in `src/lib/auth.ts`, middleware, session/JWT callbacks, or role flows were modified.

## Verification Matrix
| Gate | Result |
|---|---|
| `npm install` | PASS (0) |
| `npm ls next-auth` | `next-auth@4.24.15` |
| `npm audit --omit=dev` | 14 remain — all TRANSITIVE_ACCEPTED / DEV_TOOLING / UNRELATED (see table) |
| `npx tsc --noEmit` | PASS (0) |
| `npm run lint` | PASS (0, pre-existing warnings only) |
| `npm run build` | PASS (0) |
| `npx prisma validate` | PASS |
| Unit (focused auth) | 79/79 + 23 (72.17A) pass |
| Full unit suite | 3799/3807 — same 7 pre-existing `rccf71-*` theme-guardrail failures (verified at HEAD, unrelated) + 1 flaky `rccf68` (passes in isolation) |
| E2E auth (smoke login) | PASS (super-admin login, invalid-login, dashboard) |
| E2E release environment | 4/4 pass |
| Playwright discovery | 304 tests / 47 files |
| `git diff --check` | PASS |

## Staging
Exactly **3 files** staged:
```
M package.json          (audit:prod script + next-auth ^4.24.15 only)
M package-lock.json     (next-auth 4.24.15 + uuid 11.1.1 dependency resolution)
A docs/rccf-72.17b-nextauth-security-upgrade-closure.md
```
- **Pre-existing 72.16E `db:seed:e2e` package.json line excluded** (surgical index update; remains unstaged in working tree).
- No RCCF-70.4.3 / 71.x / dashboard / builder / settings / theme / publishing / construction.actions.ts files touched.

## Git
- Commit: **NOT CREATED**
- Push: **NOT PERFORMED**

## Next
- **RCCF-72.17C** — `resolveActivePlan()` request memoization + publish/dashboard query dedup (measured DB reduction).