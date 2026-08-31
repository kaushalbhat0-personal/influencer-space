# RCCF-72.0 — Creator Platform E2E Audit: Account Creation, Authentication & Onboarding

**Type:** Audit only (no application code changed, no commit)
**Date:** 2026-08-18
**Scope:** Creator journey start — manual signup → account provisioning → onboarding → tenant provisioning → destination → dashboard. Agency / Super Admin / Marketing / Publishing out of scope.
**Environment:** Local dev, Next.js App Router, `http://localhost:3000`, SERVER_READY (PID 16308, HTTP 200 probes). QA DB via read-only Prisma checks.

---

## 1. Executive Verdict

**VERDICT: B — PASS with minor issues (no P0/P1).**

The core Creator acquisition path works end-to-end and matches the documented authority:

- Manual signup provisions a real account (role `ADMIN`, `tenantId: null`) with a truthful 15-day TRIALING `creator_launch` subscription. FREE-only, `planCode` ignored (RCCF-LAUNCH-01), duplicate → 409.
- Onboarding "Build Manually" → "Continue to Theme Selection" is the single provisioning trigger (RCCF-71.4.1): tenant + TENANT workspace + OWNER membership + website created and **published live (v1)** server-side. Session refresh then routes the creator to `/admin/dashboard`.
- Login, session, lifecycle routing, capability denial, and mobile rendering all behave per the single-authority design.
- Two transient UI-transition stalls were observed during the run — **both are dev-environment connection-abort artifacts** (the same `Error: aborted` pattern documented in RCCF-71.6.4). Server-side state was correct in every case; no happy-path application defect was found.
- One **P2 recoverability gap** in the signup error path and several **P3** observations are listed below.

---

## 2. Manual Signup Audit

**Authority:** `src/app/api/auth/register/route.ts`, `src/components/auth/signup/SignupForm.tsx`, `src/lib/capabilities/plans.ts` (`getSignupEligiblePlans` L118).

| Check | Result |
|---|---|
| `/signup` renders (200, title "Sign Up Free — CreatorStore") | PASS |
| `?plan=creator_grow` → no pre-selection (paid code cannot be granted at signup) | PASS (RCCF-71.4.3) |
| `?plan=bogus999` → no pre-selection, no crash | PASS |
| Plans offered: ONLY `creator_launch` (Free). No paid codes selectable | PASS (RCCF-71.4.3 / RCCF-LAUNCH-01) |
| Persona step | PASS |
| Account step validation: short password disables Create Account; invalid email flagged; name/email/password rendered | PASS |
| "Setting up your workspace" provisioning state shown during submit | PASS |
| `POST /api/auth/register` → **201**, JSON `{success:true, userId, email}` | PASS |
| DB result of signup | role `ADMIN`, `tenantId null`, `agencyId null` — correct: tenant provisioned later in onboarding |
| Subscription | `creator_launch` / `TRIALING` / `trialEndsAt` = +15 days (TRIALING truthful 15-day window) |
| Duplicate email → **409** `{"error":"An account with this email already exists"}` | PASS |
| Direct API `planCode:"creator_scale"` on register → **201**, DB subscription stays `creator_launch` TRIALING (code ignored) | PASS (RCCF-LAUNCH-01 by design) |
| Email normalization (trim/lowercase), password ≥ 8 enforced server-side | PASS (code) |
| Kill-switch `enableNewRegistrations` | Present in authority |
| Rate limit register 5/hr/IP (in-memory) | Present; 3 of 5 budget used this audit |

**Accounts created during audit:**
- `rccf72-1787032348339@example.com` / `Audit72!QaPass` — main audit creator (later provisioned).
- `rccf72-plan-1787033098612@example.com` / `Audit72!QaPass` — planCode-ignored test.

---

## 3. Social Authentication Audit

**Authority:** `src/lib/auth.ts` — NextAuth (JWT) with **only `CredentialsProvider`**.

**Result: NOT IMPLEMENTED (N/A, not a defect).** No social login provider exists (Google/GitHub/Apple/…). The only OAuth/token sync in the codebase (`social-api.service.ts`) is Instagram/Twitch *content* token sync, not authentication. Per the audit brief, no unsupported provider was invented or simulated. Recommend a roadmap ticket if social login is a product goal.

---

## 4. Onboarding Audit

**Authority:** `src/app/onboarding/page.tsx`, `src/actions/onboarding.actions.ts` (`createManualWebsite` L36, `markOnboardingComplete` L828), `src/modules/provisioning/application/provisioning-service.ts`, `src/modules/workspace/application/resolve-workspace.ts`, `src/app/api/auth/refresh-session/route.ts`.

| Check | Result |
|---|---|
| Unauthenticated `/onboarding` → `/admin/login` (auth gate) | PASS |
| AUTHENTICATED (no tenant) `/onboarding` → renders onboarding (stays, no bounce) | PASS |
| READY (tenant provisioned) `/onboarding` → `/admin/dashboard` | PASS (RCCF-71.4.1 destination) |
| "🛠 Build Manually" card present; selecting shows panel + CTA "Continue to Theme Selection" | PASS |
| Selecting Build Manually alone does **not** provision (no DB tenant/website until Continue) | PASS (code: `createManualWebsite` only called from Continue) |
| Clicking "Continue to Theme Selection" → "Preparing your website…" loading → provisioning runs | PASS |
| Provisioning result (server-side, DB) | **Tenant** `147dc2d1-…` name "RCCF 72.0 Audit", subdomain `rccf-720-audit`; **Website** `a26f96b7-…` theme `com.creatos.neon-dark`, publishStatus **live v1** (publishedAt 05:56:11Z); **Workspace** TENANT `96d76df6-…` slug `rccf-720-audit`; **Membership** OWNER / ACTIVE |
| Auto-publish of blueprint on manual creation | PASS (published v1 live) |
| Onboarding-complete flag on workspace | `onboardingCompleted=false` (not a defect — completion is marked later in the flow; READY routing is token/tenant based) |
| Session refresh before destination navigation | PASS (RCCF-71.4.1; refresh endpoint + re-encoded JWT with tenantId/workspaceId) |

**Stall observed (classified):** in one run the client stayed on `/onboarding` after provisioning while the server had completed everything (tenant + website + publish). The server-action response was lost to a dev-mode connection abort (`Error: aborted` in the err log). A subsequent fresh login landed directly on `/admin/dashboard` with correct state. Not an application defect.

---

## 5. Normal Login Audit

**Authority:** `src/components/admin/LoginForm.tsx`, NextAuth Credentials + `src/middleware.ts`.

| Check | Result |
|---|---|
| Wrong password → `/admin/login?error=CredentialsSignin` + inline error | PASS |
| Empty credentials → browser required-attribute blocks submit | PASS |
| Valid login, no tenant yet (fresh account) → **`/onboarding`** | PASS (lifecycle AUTHENTICATED) |
| Valid login, tenant provisioned → **`/admin/dashboard`** | PASS (lifecycle READY) |
| Session cookies set | `next-auth.csrf-token`, `next-auth.callback-url`, `next-auth.session-token` |
| Refresh `/onboarding` stays valid (no loop/bounce) | PASS |
| Sign out → 302 → `/admin/login`; post-signout `/admin/dashboard` → `/admin/login` | PASS |
| Middleware rate limit on `/api/auth/callback/credentials` + `/api/auth/signin` (10/15min/IP) | Present |

---

## 6. Tenant Provisioning Audit

Verified in Section 4 (DB-level evidence). Summary: provisioning is **onboarding-triggered, not signup-triggered** (signup leaves `tenantId:null`), exactly per the RCCF-71.4.1 fix — "Build Manually" does not auto-provision; "Continue to Theme Selection" does. Single-tenant, subdomain `rccf-720-audit`, publish snapshot v1 live.

---

## 7. Session / Auth Audit

- JWT strategy; role `ADMIN`; `tenantId`/`workspaceId`/`workspaceType`/`workspaceRole` re-encoded via `/api/auth/refresh-session` after provisioning.
- Stale AUTHENTICATED token (no tenantId) hitting `/admin/dashboard` → 307 → `/onboarding` (correct stale-token behavior observed during the audit).
- CSRF protection active (csrf-token cookie).
- No session leaks observed; logout clears session (302 to login).

---

## 8. Destination Matrix

| Route | Unauthenticated | AUTHENTICATED (no tenant) | READY (provisioned) |
|---|---|---|---|
| `/admin/login` | 200 login | 200 login (stays; Phase-1 always-allow) | 200 login (stays) |
| `/onboarding` | → `/admin/login` | 200 onboarding | → `/admin/dashboard` |
| `/admin/dashboard` | → `/admin/login` | 307 → `/onboarding` | 200 dashboard |
| `/builder` | → `/admin/login` | → `/onboarding` | 200 "Loading your editor…" |
| `/admin/create` | → `/admin/login` | → `/onboarding` | 200 |
| `/admin` (bare) | → `/admin/login` | → `/onboarding` | **404 "Creator Not Found"** (P3) |

---

## 9. Plan / Capability Sanity

**Authority (single-authority):** `src/config/commerce/plans.ts` `capabilities[]` → `src/lib/capabilities/plans.ts` registry → `engine.ts`/`entitlements.ts`.

| Plan | `premium_themes` | `advanced_builder` | Notes |
|---|---|---|---|
| `creator_launch` | **denied** | **denied** | only `basic_builder, basic_themes, creator_subdomain, theme_background_solid` |
| `creator_grow` | granted | granted | + backgrounds/effects, ai_generation, priority_support |
| `creator_scale` | granted | granted | + custom_domain, api, webhooks, white_label, advanced_ai |

Launch-account gating matches the registry. Signup UI offers only launchable plans. **P3 note:** the DB billing catalog mirror (`BillingPlanFeature`, seeded by `catalog-seed.ts`) lists 45 features including `premium_themes`/`advanced_builder` on `creator_launch` — it is NOT the runtime authority (registry is) but is misleading and stale vs. the registry.

---

## 10. Security / Authority Audit

- Registration kill-switch present; rate limits on register (5/hr), login callback (10/15min), signin (10/15min).
- `planCode` from the client cannot escalate plan (ignored → `creator_launch`).
- Role fixed to `ADMIN` on creator signup (no tenant until onboarding).
- Password min-8 enforced client + server; email normalized.
- No secrets/logs of credentials observed; `.env.playwright` remains gitignored.

---

## 11. Mobile Results

No horizontal overflow (`scrollWidth ≤ innerWidth`) at **320 / 375 / 390 / 1440** on `/signup`, `/admin/login`, `/onboarding`. Auth gate renders correctly on mobile.

---

## 12. P0 / P1 Findings

None.

---

## 13. P2 / P3 Findings

**P2-1 — Signup error-state recoverability gap** (`SignupForm.tsx:100-102`)
If the client `signIn()` call rejects *after* a successful `POST /api/auth/register`, the UI returns to the Account step with a generic error, but the account already exists. The only next action ("Create Account") then yields 409, and there is no "Log in instead" affordance. Frequency is low (network blip; reproduced once here via a dev-mode connection abort), but the catch path is real app code and the dead-end is real.

**P3-1 — `/admin` (bare) → 404 "Creator Not Found"** for a READY ADMIN. The route is treated as a public profile path without a slug; admin entry points use `/admin/dashboard`. Minor dead-end; could redirect `/admin` → `/admin/dashboard` for READY admins.

**P3-2 — Already-authenticated users visiting `/admin/login`** stay on the login page (Phase-1 always-allow) instead of being forwarded to their dashboard. Design behavior; worth a forward-on-authed if UX wants it.

**P3-3 — Billing catalog DB mirror divergence** from the capability registry (`BillingPlanFeature` shows premium features on `creator_launch`). Runtime gating is correct; mirror is informational/stale.

**P3-4 — Billing display parity (carried from RCCF-71.6.4):** `/admin/billing` showed Creator Scale at ₹1,999/mo while the registry lists ₹1,995 (runtime Pricing-Center price may differ by design). Cross-check pricing parity in a billing ticket.

---

## 14. Product Gaps

- Social login not implemented (Credentials-only) — roadmap item, not a defect.
- No "Log in instead" recovery on the signup error path (see P2-1).
- No `/admin` → `/admin/dashboard` redirect for bare admin path (P3-1).

---

## 15. Environment / QA Blockers

- **Dev-mode connection aborts** (`Error: aborted` at `abortIncoming`) intermittently drop client responses while the server completes the work. Observed twice: (a) signup success-step transition, (b) post-provision navigation to `/admin/create`. Both times server-side state was correct (account + subscription; tenant + website + live publish). Same class as the RCCF-71.6.4 media-upload stall. **Not application defects.**
- First-hit route compilation adds seconds (register took 4.1s incl. compile 1.9s); slow client transitions misread as failures unless server logs + DB are checked.
- In-memory rate limits are keyed per-IP with dev defaulting to a single `unknown` bucket — register budget (5/hr) and login budget (10/15min) are shared across all local runs. Register: 3/5 used this audit.

---

## 16. Exact Reproduction Steps

Happy path (verified):
1. `GET /signup` → persona "Creator" → plan "Creator Launch" (Free) → account step.
2. Enter name/email/password (≥8 chars) → "Create Account".
3. `POST /api/auth/register` → 201; auto `signIn`; success step "Let's build your website." → "Continue to Onboarding".
4. Onboarding: select "🛠 Build Manually" → "Continue to Theme Selection" → "Preparing your website…" → session refresh → `/admin/create` (theme selection) → `/admin/dashboard`.
5. Log out/in → `/admin/dashboard`.

Error paths:
- Duplicate email signup → 409 error shown on account step.
- Wrong password → `/admin/login?error=CredentialsSignin` + banner.

---

## 17. Files / Code Paths Involved

- `src/app/api/auth/register/route.ts` — registration, kill-switch, rate limit, FREE-only planCode ignore.
- `src/components/auth/signup/SignupForm.tsx` (L75-103 submit, L285-312 success) — signup wizard.
- `src/app/signup/page.tsx` — runtime pricing + signup shell.
- `src/lib/capabilities/plans.ts` (L118 `getSignupEligiblePlans`) — FREE-only eligibility.
- `src/config/commerce/plans.ts` — plan capabilities authority (L133 launch, L187 grow, L254 scale).
- `src/lib/auth.ts` — Credentials-only provider.
- `src/middleware.ts` — auth gate + rate limit + lifecycle `redirectTo`/`canAccess`.
- `src/lib/lifecycle/token-resolver.ts` — route guards (AUTHENTICATED/READY states).
- `src/app/api/auth/refresh-session/route.ts` — JWT re-encode after provisioning.
- `src/app/onboarding/page.tsx`, `src/actions/onboarding.actions.ts` (`createManualWebsite` L36, `markOnboardingComplete` L828).
- `src/modules/provisioning/application/provisioning-service.ts`, `src/modules/workspace/application/resolve-workspace.ts` — tenant/workspace creation.
- `src/lib/security/rate-limiter.ts`, `src/lib/capabilities/engine.ts`, `src/lib/capabilities/entitlements.ts` — rate limits + capability resolution.
- `src/components/admin/LoginForm.tsx` — login form.

---

## 18. Recommended Next RCCF Ticket

- **RCCF-72.1 (P2-1):** Signup error-state recovery — add "Log in instead" affordance when registration succeeded but the client sign-in transition failed; optionally auto-sign-in a second attempt that hits 409 with correct credentials (or deep-link to `/admin/login`).
- Optional follow-ups: RCCF-72.2 `/admin` bare-path redirect (P3-1); RCCF-72.3 billing pricing parity (P3-4); social login roadmap.

---

## 19. Frozen Surfaces

Untouched (audit-only): auth, signup, onboarding, billing, plans, capability authority, tenant resolution, Prisma schema/migrations, publishing, Theme Experience, Builder, storefront, Agency, Super Admin, marketing. No temp app routes added; QA DB writes limited to the two signups the public API created; no commits.

**Artifacts:** screenshots `screenshots/rccf-72.0-*.png` (signup account step, signup success, onboarding landing, build-manually panel, login-fresh-onboarding, post-provision dashboard, builder-ready, theme-selection). Temp scripts under `C:\Users\91866\AppData\Local\Temp\opencode\rccf72-*.js`.
