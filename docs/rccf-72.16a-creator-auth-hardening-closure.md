# RCCF-72.16A — Creator Server-Action Authorization Hardening — Closure

## 1. Executive Verdict
**Grade: A- — IMPLEMENTED, STAGED (NOT committed, per standing rule; user to review and commit).**

Closed all 4 audit findings (S-A1..S-A4) declared in `docs/rccf-72.16-creator-re-audit.md` for the 5 Creator server actions. All gates are now **DB-backed ownership** (not token-derived). 61 focused tests green, `tsc` clean, production build OK, `prisma validate` OK, `git diff --check` clean, lint clean (2 pre-existing `logger` unused-import warnings, present at HEAD). Full suite: 3749 passed / 8 failed — all 8 pre-existing and unrelated (7 RCCF-71.x theme source-string tests asserting on untouched committed files; 1 `rccf68` flake that passes in isolation).

## 2. Production Root Cause (context)
The Creator re-audit found server actions accepting client-supplied `tenantId` / `subdomain` / `sessionId` and trusting them as credentials. Two trust failures were latent:
1. **Token-derived tenant trust**: a fresh signup's NextAuth JWT `tenantId` is null until re-login (`src/lib/auth.ts` session callback reads `token.tenantId`, never the DB), while provisioning writes `user.tenantId` to the DB (`attach_existing_user`). Any gate reading `session.user.tenantId` therefore cannot authorize a just-provisioned creator, and a stale JWT can carry a wrong tenant id after a tenant change.
2. **No ownership check at all** on read paths (`getConstructionSnapshot` by `sessionId`/`subdomain`, `getGenerationSessionProgress`), leaking snapshots/progress across tenants when an id was guessed or leaked.

## 3. Architecture Invariant & Option Selection
**Invariant: a client-supplied identifier is never a credential. Ownership is resolved server-side from the authenticated session against the database (`User.tenantId`), with SUPER_ADMIN cross-tenant bypass preserved and AGENCY_ADMIN supported via the existing `assertAgencyOwnsTenant`.**

Options considered:
- **A (chosen) — DB-backed ownership gate + masked not-found.** `getServerSession` → `prisma.user.findUnique` (or `prisma.user.count`) → compare `dbUser.tenantId`. Rejected alternatives:
  - **B — re-login requirement (token-only)**: rejected — would break the primary onboarding flow (`onboarding/page.tsx:317` calls `markOnboardingComplete` immediately after generation, before any re-login).
  - **C — trust `assertAgencyOwnsTenant` alone**: rejected — agency ownership is a tenant-vs-agency relation; the creator's own tenant still needs the `User.tenantId` match.
  - **D — in-place write in the gated action**: rejected for the provisioning flows — the gated `markOnboardingComplete` cannot be reused inside trusted flows that legitimately write another user's tenant (they are authorized at their own boundary), and calling the exported action from a server context would re-trigger the gate. Instead a **non-`"use server"` internal primitive `writeOnboardingComplete`** (`src/lib/onboarding/complete.ts`) holds the upsert+event logic; the exported action wraps it with the gate. A helper exported from a `"use server"` module would itself become a client-callable server action — hence the separate module.

## 4. Implementation Changes
| File | Change |
|---|---|
| `src/actions/construction.actions.ts` | Added `getServerSession`/`authOptions`. **sessionId path**: `generation.creatorId !== session.user.id` (non-SUPER_ADMIN) → `{ success:false, error:"Not found" }` (masked). **subdomain path**: `prisma.user.count({ where:{ id: session.user.id, tenantId: tenant.id } })` === 0 → `"Not found"` (masked). Unknown subdomain keeps `{ success:true, snapshot:null }`. Anonymous → `"Unauthorized"`. |
| `src/actions/onboarding.actions.ts` | Added `assertTenantAccess(tenantId, opts?:{allowAgency?:boolean})` helper: no session → `unauthorized`; SUPER_ADMIN → ok; DB `prisma.user.findUnique` `tenantId` match → ok; AGENCY_ADMIN + `assertAgencyOwnsTenant` → ok (unless `allowAgency:false`). Gated `markOnboardingComplete` (delegates to primitive), `isOnboardingComplete`, `retryPublish` (`allowAgency:false`), `getGenerationSessionProgress` (session ownership check, masked `"Session not found"`). Internal `createManualWebsite` (:83) and `runCreatorGeneration` (:641) call the primitive directly. `isOnboardingComplete` return shape → `{ success, complete?, error? }` (zero external callers — only barrel re-export at `src/actions/index.ts:81`). Removed now-unused `emitEvent` import; restored `platformEventBus` import. |
| `src/lib/onboarding/complete.ts` | **NEW** — non-server `writeOnboardingComplete(tenantId)` (prisma `setting.upsert` + `emitEvent("onboarding.completed", tenantId)`). |
| `src/actions/provision.actions.ts` (:109) | Uses `writeOnboardingComplete` from the new primitive module. |
| `src/actions/super-admin-provision.actions.ts` (:216) | Same primitive import/use. |
| `src/actions/acquisition/acquire.actions.ts` (:168) | Same primitive import/use. |
| `tests/unit/rccf72-16a-onboarding-auth.test.ts` | **NEW** — 19 behavioral tests (mark/is/retry/getGenerationSessionProgress: anonymous, owner, foreign, SUPER_ADMIN, AGENCY_ADMIN; asserts no DB write / no publish for unauthorized). |
| `tests/unit/rccf72-16a-construction-snapshot-auth.test.ts` | **NEW** — 7 behavioral tests (sessionId owner vs foreign masked; subdomain member vs foreign masked; unknown subdomain; anonymous). |
| `tests/unit/rccf70-6-6-provisioning-onboarding-contract.test.ts` | Rewritten from source-string (`readFileSync`+`toContain`) to **behavioral** (source-string assertions are forbidden by this ticket). Mocks `writeOnboardingComplete`; covers provisionCreator (success/fail), confirmProvision, acquireAndProvision. |
| `tests/unit/rccf36-acquire-auth.test.ts` | Mock migrated from exported `markOnboardingComplete` to the internal `writeOnboardingComplete`; SUPER_ADMIN test now asserts the primitive was called. |

## 5. Behavior Preservation
- SUPER_ADMIN cross-tenant bypass unchanged everywhere.
- Primary onboarding flow preserved: a freshly provisioned creator can still complete onboarding immediately (DB-backed check, no re-login).
- Trusted provisioning/acquire flows unchanged functionally — only the write target moved to the internal primitive.
- Unknown-subdomain construction reads still return `{ success:true, snapshot:null }` (existing convention preserved).
- `isOnboardingComplete` behavior identical for all existing call sites (none outside the barrel re-export).
- Pre-existing uncommitted work preserved verbatim: `themeConfig` threading in `construction.actions.ts` (RCCF-71.x), `src/actions/billing.actions.ts` (RCCF-70.4.3), `dashboard-page.tsx`, all `theme_*` files.

## 6. Regression Coverage
- 26 new tests across `rccf72-16a-onboarding-auth` + `rccf72-16a-construction-snapshot-auth`.
- 5 behavioral tests in rewritten `rccf70-6-6-provisioning-onboarding-contract` pin the internal-primitive wiring (every creator provisioning entry point that publishes MUST write onboarding_completed).
- `rccf36-acquire-auth` asserts the primitive write in the SUPER_ADMIN acquire path.
- Note on style: this ticket **forbids source-string assertions**, so unlike the skill's default source-guardrail style, all guards here assert runtime behavior (mock `next-auth`/`prisma`, execute the real action, assert `{success:false}` outcomes and no write/publish side effects).

## 7. Verification Results
| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| Focused `npx vitest run` (6 related files) | PASS — 61/61 |
| Full `npx vitest run` | 3749 passed / 8 failed — all pre-existing (see §1) |
| `npm run build` | PASS (production build completed) |
| `npx prisma validate` | PASS ("schema is valid") |
| `npx next lint` (touched files) | PASS — 2 pre-existing warnings (unused `logger` import in `onboarding.actions.ts` and `super-admin-provision.actions.ts`, present at HEAD) |
| `git diff --check` | PASS (clean; one CRLF notice on `super-admin-provision.actions.ts` is cosmetic) |
| Browser QA (dev server port 3000, authenticated as seeded creator `RCCF 71.5.1 Launch Test`) | PASS — `/admin/login` 200; `/dev/generation-experience` full pipeline no 500; anonymous `/onboarding` → auth-middleware redirect to dashboard (no loop); authenticated `/builder` loads OWN snapshot with no console errors; onboarded `/onboarding` → clean redirect to `/admin/dashboard` (onboarding gate intact) |

## 8. Diff Discipline
- **In-scope (touched):** the 5 target actions + `src/lib/onboarding/complete.ts` (new) + 4 test files.
- **Untouched (pre-existing uncommitted work preserved):** `src/actions/billing.actions.ts` (RCCF-70.4.3), `src/actions/builder-preview.actions.ts`, `src/actions/theme.actions.ts`, `src/components/admin/PreviewShell.tsx`, `src/features/builder/**`, `src/features/settings/**`, `src/lib/publishing/service.ts`, `src/lib/theme/**`, `dashboard-page.tsx`, all `docs/rccf-71*` + `docs/rccf-72.9*` + `screenshots/*`.
- **Frozen surfaces (not modified):** Prisma schema/migrations, auth middleware, `publishingService`, `capabilityService`, billing/Razorpay, media/storage, layout engine, storefront.

## 9. Risks & Edge Cases
- **AGENCY_ADMIN acquire flow**: `acquireAndProvision` never creates the `AgencyTenant` link before its onboarding write — it intentionally goes through the internal primitive. The gated action correctly rejects agency users for a tenant they do not own (`retryPublish` even for a tenant their agency owns — per the ticket's explicit model).
- **`isOnboardingComplete` shape change**: no callers existed; if a future caller expects a bare boolean, the shape is `{ success, complete?, error? }` — noted for the consuming team.
- **Sibling findings (documented, NOT fixed — out of ticket scope):** the same token-derived `session.user.tenantId === tenantId` pattern exists in `analytics.actions.ts` (fetchAnalytics), `settings.actions.ts` (7 fns), `content-feed.actions.ts` (4), `link.actions.ts` (6), `milestone.actions.ts` (4), `theme.actions.ts` (2); partial (workspace-membership-with-token-fallback) gates in `gallery.actions.ts` (13) and `billing.actions.ts` (5). These are the natural scope of RCCF-72.16B / CL-1 and were audited across all 60 server-action files (5 already hardened here confirmed properly gated).
- **Fresh-user nuance**: DB-backed ownership assumes `User.tenantId` is set at provisioning (`attach_existing_user`). A pre-existing legacy user without a tenant still cannot read another tenant's data (count/findUnique yields no match → masked).

## 10. Recommendation
**Proceed / staged.** Implementation is complete and verified; review the staged diff and commit when ready. Recommend scheduling RCCF-72.16B to apply the same DB-backed pattern to the 33 sibling action functions enumerated in §9.