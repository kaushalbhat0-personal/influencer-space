# RCCF-70.6.6 — Fresh Creator Signup → Normal Login Session Audit

**Ticket:** RCCF-70.6.6
**Type:** Read-only root-cause audit. No code changes. No commit.
**Severity:** P1 (production-risk blocker for the signup → login lifecycle).
**Scope frozen by mission rules:** authentication, middleware, tenant resolution,
Prisma schema/migrations, Builder, billing/capabilities.

---

## 1. Executive Verdict

**Verdict: CONFIRMED P1 — root cause isolated, single-source, fully fixable inside
the existing authentication architecture; no security boundary needs to move.**

A brand-new Creator that completes the **Build Manually** onboarding option is
provisioned correctly (tenant + workspace + website + publishing + `user.tenantId`
set in the DB) but **the `Setting { tenantId, key: "onboarding_completed" }` row
is never written**. The action that backs Build Manually,
`createManualWebsite` in `src/actions/onboarding.actions.ts`, is the **only**
creator provisioning entry point in the codebase that does **not** call
`markOnboardingComplete(tenantId)` after a successful publish.

Every other Creator/Partner provisioning entry point does call it:
`runCreatorGeneration` (AI/Import path, `onboarding.actions.ts:624`),
`acquire.actions.ts:168`, `provision.actions.ts:109`, and
`super-admin-provision.actions.ts:190` — the last one carrying an explicit
comment that this exact omission, when it occurred in `confirmProvision`, caused
an *infinite redirect between `/admin/dashboard` and `/onboarding`*
(VALIDATION-03 C-1, fixed). The identical class of bug now exists in the
Build-Manually path.

The two lifecycles diverge at the **DB-backed `requireTenant` boundary**
(`src/lib/auth/require-tenant.ts`) used by every `/admin/*` page:

- **Signup browser session:** works for `/builder` because middleware
  `resolveFromToken` (`src/lib/lifecycle/token-resolver.ts`) returns a
  **hardcoded `READY`** for `ADMIN + tenantId` (no DB Setting lookup), and the
  `/builder` Server Component does **not** call `requireTenant`. The signup
  cookie was already refreshed by `/api/auth/refresh-session` after
  `createManualWebsite`, so the JWT carries the new `tenantId` and
  `workspaceId`.
- **Fresh `/admin/login`:** credentials are accepted, the JWT cookie is set
  correctly with `tenantId` from the DB row, and `/api/auth/session` returns a
  valid session. But the immediate post-login navigation to
  `/admin/dashboard` enters an **infinite redirect loop**:

  1. `/admin/dashboard` → middleware passes (token-only READY) → Server
     Component calls `requireTenant()` → DB-backed `lifecycleService.resolve`
     finds `Website` but **no** `onboarding_completed` Setting → state
     `ONBOARDING` → `redirect("/onboarding")`.
  2. `/onboarding` → middleware `resolveFromToken` returns READY (token only)
     → `redirectTo(READY, "/onboarding")` → `"/admin/dashboard"`.
  3. → step 1. Indefinite loop. Browser aborts with
     `ERR_TOO_MANY_REDIRECTS`; the user is left observing that no
     authenticated page persists and effective redirection lands them back
     where the loop started (`/admin/login`).

The session is *established*; the user simply can never land on any
`requireTenant`-protected page because the DB marker that
`requireTenant` checks was never written.

**No auth bypass, no middleware weakening, no schema change, no service
account, and no client-supplied tenantId authority is required to fix this.**
The fix is a one-line addition to `createManualWebsite` mirroring the other
provisioning paths, plus an idempotent data backfill for the historic
Build-Manually creators who are already in a half-provisioned DB state.

---

## 2. Exact Reproduction

1. Fresh browser, platform domain (e.g. `creatorspace.app`), no `?tenant=`.
2. `/signup` → choose *Creator* → *Creator Launch* → enter email + password
   (≥ 8 chars) → *Create Account*.
   - `POST /api/auth/register` → 201, user created with
     `role="ADMIN"`, `tenantId=null`, billing account + 15-day
     TRIALING subscription on `creator_launch`.
   - SignupForm calls `signIn("credentials", { email, password, redirect:false })`
     **without `tenantId`**. `authorize()` skips the tenant check, returns
     `{ tenantId: null, role: "ADMIN", ... }`. JWT cookie set with
     `tenantId=null`.
   - SignupForm routes to `/onboarding` (not `/admin/dashboard`).
3. `/onboarding` → *Start Fresh* group → **Build Manually**.
   - `createManualWebsite()` (`src/actions/onboarding.actions.ts:36-79`):
     - `provisioningService.provision({ mode:"attach_existing_user",
       authenticatedUserId:userId, ... })` — creates Tenant `T`, Website,
       Workspace; updates `user.tenantId = T` via
       `userRepository.safeUpdate(...)` (safeUpdate passes because the
       user's current role is `ADMIN`, not `SUPER_ADMIN`).
     - `applyBlueprintToWebsite(websiteId, "com.creatos.creator",
       "com.creatos.neon-dark")` — blueprint applied, theme applied,
       `publishingService.publish(T)` succeeds. **No**
       `markOnboardingComplete(T)` call.
     - Returns `{ success:true, tenantId:T, websiteId:W }`.
   - Onboarding page calls `POST /api/auth/refresh-session` (best-effort):
     the route reads the user row from DB (now `tenantId=T`), runs
     `resolveWorkspace(user)`, encodes a **new** JWT cookie with
     `tenantId=T`, `workspaceId`, `workspaceType`, `workspaceRole`.
     Cookie replaced.
   - `router.replace("/admin/dashboard")`.
4. **Signup browser reaches `/builder`** (manual URL or post-build navigation):
   - middleware: `ADMIN + tenantId=T` → `resolveFromToken` returns **state
     READY (hardcoded)**, `canAccess("/builder", READY)` → allowed.
   - `/builder` Server Component (`src/app/builder/page.tsx`) **does NOT call
     `requireTenant`**. Builder renders with valid tenant-backed state.
5. **Fresh normal login** (new browser context or full cookie wipe):
   1. `/admin/login` (platform domain, no `?tenant=`).
      - `LoginPage` Server Component runs `getTenantContext()` → returns
        `null` (no `x-tenant-host` on the platform host); `searchParams?.tenant`
        is `undefined` → renders `<LoginForm tenantId={null} />` (no DB
        lookup). `LoginForm` will pass `tenantId: ""` to `signIn`.
   2. Enter the same email + password used at signup → submit.
   3. `signIn("credentials", { email, password, tenantId:"", redirect:false })`.
   4. `authorize()`:
      - `prisma.user.findFirst({ where:{ email }, include:{ tenant:true } })`
        → user found with `role="ADMIN"`, `tenantId=T` (DB-authoritative
        after step 3 provisioning).
      - `bcrypt.compare` succeeds.
      - `role === "ADMIN"` branch:
        `if (credentials.tenantId && user.tenant)` → `""` is falsy →
        **tenant check skipped** (intentional; platform-domain login with
        no tenant context).
      - Returns
        `{ id, email, name, tenantId: user.tenantId (T), agencyId, role:"ADMIN" }`.
   5. JWT callback: `token.tenantId = T`, `token.role = "ADMIN"`;
      `user.workspaceId` undefined → calls `resolveWorkspace(user)`;
      `findByTenantId(T)` returns the Workspace created during
      provisioning → `token.workspaceId`, `workspaceType`, `workspaceRole`
      populated. JWT cookie stored.
   6. Session callback (when first `getServerSession` runs):
      `prisma.user.findUnique({ id: token.id })` → user exists;
      `dbUser.role === token.role` (`"ADMIN" === "ADMIN"`); agency
      membership check skipped (not agency role). Session **is NOT
      invalidated**; `session.user.{id, tenantId, role, workspaceId, ...}`
      are populated from the token.
   7. `LoginForm.handleSubmit`: `result.error` is unset →
      `router.push("/admin/dashboard")`.
6. **`/admin/dashboard` redirect loop** (recorded observations):
   - `GET /admin/dashboard` → middleware: token has `id+ADMIN+tenantId=T` →
     `resolveFromToken` returns **state READY (hardcoded)**;
     `redirectTo(READY, "/admin/dashboard")` → `null`; `canAccess` allows;
     middleware passes the request through (sets `x-workspace-id`).
   - `/admin/dashboard` Server Component calls `await requireTenant()`.
     `getServerSession(authOptions)` → returns **a valid session** (session
     callback does not invalidate it). `lifecycleService.resolve(...)` (DB):
     - `prisma.setting.findUnique({ tenantId:T, key:"onboarding_completed" })`
       → **`null`** (Build Manually never wrote it).
     - `prisma.website.findUnique({ tenantId:T })` → exists.
     - `hasOnboardingCompleted=false`, `hasWebsite=true` →
       `service.ts:61-67` returns **state `ONBOARDING`**.
   - `requireTenant`: state ≠ VISITOR, state ≠ AUTHENTICATED,
     `!lifecycle.hasOnboardingCompleted` → `redirect("/onboarding")`.
   - `GET /onboarding` → middleware: token still `ADMIN+tenantId=T` →
     `resolveFromToken` returns **state READY (hardcoded)**;
     `redirectTo(READY, "/onboarding")` → returns **`"/admin/dashboard"`**
     (`token-resolver.ts:200-207`).
   - Browser navigates back to `/admin/dashboard` → step 6 again.
   - Browser aborts after the redirect limit; observable end state is
     either `ERR_TOO_MANY_REDIRECTS` bouncing between the two URLs or the
     user manually returning to `/admin/login` (which always renders,
     bypassed by `middleware.ts:74-75`'s `isLoginPage` short-circuit).

### Recorded artifacts (do NOT expose secrets)

| Artifact | Expected / Observed |
| --- | --- |
| Signup `POST /api/auth/register` response | `{ success:true, userId, email }` 201 |
| `User` row after Build Manually | `role="ADMIN"`, `tenantId=T` set |
| `Tenant` row | exists (`id=T`, subdomain = generated slug) |
| `Website` row | exists (`tenantId=T`, theme applied) |
| `Workspace` row | exists (`tenantId=T, type="TENANT"`) |
| `BillingAccount` + `BillingSubscription` | exists (`creator`, `TRIALING`, 15-day) |
| `Setting { tenantId:T, key:"onboarding_completed" }` | **MISSING** (root-cause evidence) |
| `Setting { tenantId:T, key:"onboarding_source" }` | only written by `runCreatorGeneration` (AI/Import); absent for Build Manually |
| `Setting { tenantId:T, key:"builder_artifact" }` | only written by `runCreatorGeneration`; absent for Build Manually |
| `POST /api/auth/callback/credentials` (login) | 200/302 with `Set-Cookie: ...session-token=<JWT with tenantId=T>` |
| `GET /api/auth/session` after login | `{ user: { id, role:"ADMIN", tenantId:T, workspaceId:W, ... } }` — **valid session present** |
| `GET /admin/dashboard` (with cookie) | 307 → `/onboarding` (from `requireTenant`) |
| `GET /onboarding` (with cookie) | 307 → `/admin/dashboard` (from middleware `redirectTo`) |
| Final observable URL | loop between `/admin/dashboard` and `/onboarding`; user reports "back at `/admin/login`" because no authed page persists |

Passwords/secrets: never logged or printed in this audit. The trace script
already in repo (`tests/auth-trace.ts`) does **not** log passwords.

---

## 3. Signup Lifecycle (works — narrative)

```
/signup → POST /api/auth/register     (create user, role=ADMIN, tenantId=null,
                                       billing account + 15-day TRIALING sub)
        → SignupForm.signIn("credentials", {email, password, redirect:false})
                                       (signs in with tenantId=null; authorize
                                        skips ADMIN tenant check; JWT cookie set
                                        with tenantId=null, workspaceId=null)
        → router.push("/onboarding")
        → middleware (/onboarding)
                                       (token-only: ADMIN + no tenantId →
                                        state AUTHENTICATED; canAccess allows for
                                        /onboarding guard; passes)
        → /onboarding client renders
        → user clicks "Build Manually"
        → createManualWebsite()
           ├─ provisioningService.provision({mode:"attach_existing_user",
           │                              authenticatedUserId, ...})
           │     • tx:create Tenant T, Website, Workspace
           │     • userRepository.safeUpdate(userId,
           │            { tenantId:T, role:"ADMIN" }, tx, "SUPER_ADMIN")
           │       (passes protection: existing role is ADMIN, not SUPER_ADMIN;
           │        user.tenantId = T in DB now)
           │     • billingRepository.linkSubscriptionToWorkspace(...)
           │     • seedStarterData(template) when no generatedWebsite sections
           │  ──▶ DOES NOT call markOnboardingComplete(T)  ◄── bug
           ├─ applyBlueprintToWebsite(websiteId, "com.creatos.creator",
           │                          "com.creatos.neon-dark")
           │     • verifies caller.tenantId === website.tenantId (T===T)
           │     • applies theme + blueprint pages (non-destructive)
           │     • publishingService.publish(T) succeeds
           │  ──▶ DOES NOT call markOnboardingComplete(T)  ◄── bug
           └─ returns { success:true, tenantId:T, websiteId:W }

        → POST /api/auth/refresh-session   (best-effort from onboarding page)
              • getToken → (still stale: tenantId=null)
              • DB lookup user → { tenantId:T }
              • resolveWorkspace(user) → workspaceId=W
              • encode new JWT with tenantId=T, workspaceId=W, ...,
                set cookie (maxAge 7d)

        → router.replace("/admin/dashboard")
           • middleware: ADMIN + tenantId=T → resolveFromToken READY (hardcoded)
             → canAccess(/admin/dashboard, READY) allowed
           • /admin/dashboard Server Component:
               await requireTenant()
                 → getServerSession → session.user.id present
                 → lifecycleService.resolve(DB):
                     prisma.setting.findUnique(tenantId=T, "onboarding_completed")
                        → NULL  ◄── bug surface
                     hasOnboardingCompleted=false
                     hasWebsite=true
                     return state=ONBOARDING
                 → if (!hasOnboardingCompleted) redirect("/onboarding")
           • **SIGNUP SESSION ALSO HITS THIS LOOP for /admin/dashboard;**
             the signup-session team observed success because they
             navigated to /builder (which doesn't call requireTenant), not
             /admin/dashboard.

        → /builder (manual navigation):
           • middleware: ADMIN + tenantId=T → READY; canAccess allows
           • /builder Server Component: <BuilderLoader/> (NO requireTenant)
           • Builder renders with tenant-backed state. PASS.
```

The signup session appears successful only because:
- middleware is **token-only** and **hardcodes READY** for `ADMIN + tenantId`;
- the `/builder` Server Component does **not** invoke `requireTenant`;
- `/api/auth/refresh-session` rewrites the cookie with the new `tenantId`,
  so middleware's `token.tenantId` is set.

The minute the signup user navigates to any `/admin/*` page (all of which call
`requireTenant`), the same loop happens.

---

## 4. Login Lifecycle (fails — narrative)

```
/admin/login  (fresh browser, platform domain, no ?tenant=)
  → LoginPage Server Component:
       getTenantContext()  →  null   (no x-tenant-host on platform host)
       searchParams?.tenant →  undefined
       returns <LoginForm tenantId={null} />
  → LoginForm renders.

User submits email + password.

LoginForm.signIn("credentials", { email, password, tenantId:"", redirect:false })
  → POST /api/auth/callback/credentials
  → authorize(credentials):
       prisma.user.findFirst({ where:{ email }, include:{ tenant:true } })
          → user found, role=ADMIN, tenantId=T (DB-authoritative)
       bcrypt.compare(password, user.password) → true
       role === "ADMIN":
         if (credentials.tenantId && user.tenant) → falsy → SKIP tenant check
         return { id, email, name,
                  tenantId: user.tenantId (T),
                  agencyId: user.agencyId,
                  role:"ADMIN" }
  → jwt({ token, user }):
       token.id = user.id
       token.tenantId = T
       token.role = "ADMIN"
       user.workspaceId is undefined → else:
         resolveWorkspace(user):
           findByTenantId(T)  →  Workspace W
           findMember(W, userId) → existing or created OWNER row
           return { workspaceId:W, workspaceType:"TENANT", workspaceRole:"OWNER" }
       token.workspaceId = W, workspaceType, workspaceRole
  → NextAuth encodes JWT, sets Set-Cookie: ...session-token=<JWT(T,W,ADMIN)>.

LoginForm.handleSubmit:
  result.error is unset → router.push("/admin/dashboard")

Browser GET /admin/dashboard (with new cookie)
  → middleware Phase 2 (protected):
       getToken(req, secret) → { id, role:"ADMIN", tenantId:T, workspaceId:W }
       resolveFromToken(token)  →  state=READY (hardcoded; no DB Setting lookup)
       redirectTo(READY, "/admin/dashboard")  →  null
       canAccess("/admin/dashboard", READY)    →  { allowed:true }
       request passes; x-workspace-id header set; security headers added
  → /admin/dashboard Server Component:
       await requireTenant()
         → getServerSession(authOptions) → session.user.id present
            (session callback did not invalidate: dbUser exists, role matches,
             no agency membership check for ADMIN)
         → lifecycleService.resolve({ userId, tenantId:T, role:"ADMIN", workspaceId:W })
              prisma.setting.findUnique({ tenantId:T, key:"onboarding_completed" })
                 → NULL   ◄── the bug
              prisma.website.findUnique({ tenantId:T })
                 → exists
              hasOnboardingCompleted = false
              hasWebsite             = true
              hasPublishedSnapshot   = (state.live?) — may be true after publish
              return state = LifecycleState.ONBOARDING
         → requireTenant: state != VISITOR, state != AUTHENTICATED,
            !lifecycle.hasOnboardingCompleted →
              redirect("/onboarding")

Browser GET /onboarding (cookie still valid)
  → middleware:
       resolveFromToken(token)  →  state=READY (hardcoded token-only)
       redirectTo(READY, "/onboarding"):
         if (pathname === "/onboarding" || startsWith("/onboarding/"))
            return "/admin/dashboard"       ◄── bounces back
       → NextResponse.redirect("/admin/dashboard")

Browser GET /admin/dashboard
  → ... GOTO /admin/dashboard Server Component step ...

  ───► INFINITE REDIRECT LOOP /admin/dashboard ↔ /onboarding ◄───

Browser aborts after redirect limit. User-visible state:
  • ERR_TOO_MANY_REDIRECTS at /admin/dashboard or /onboarding (alternating).
  • No session-protected page persists.
  • User reports "returns to /admin/login" because that page renders (Phase 1
    isLoginPage short-circuit) and the login attempt appears to fail.
```

The fresh-login session itself is **established** — `/api/auth/session` returns
the user object with `tenantId`, `workspaceId`, `role`. The failure is not at
the authentication layer; it happens at the **`requireTenant` DB-backed**
boundary that expects `onboarding_completed` to exist.

---

## 5. First Divergence

| Stage | Signup session | Fresh login | Result |
|---|---|---|---|
| 1. `/api/auth/register` creates user (role=ADMIN, tenantId=null) | ran | ran (n/a — user already exists) | equal |
| 2. `signIn("credentials", {email, password, ...})` — `authorize()` accepts | ran (no `tenantId` arg; user found; tenant check skipped) | ran (empty-string `tenantId` arg; user found; tenant check skipped because `""` is falsy) | equal — both produce a valid JWT |
| 3. JWT cookie set with `tenantId` from DB user row | at signup moment, `user.tenantId` is `null` → token.tenantId = `null` | after provisioning `user.tenantId = T` → token.tenantId = `T` | **fresh login JWT is already correct (T)** |
| 4. Onboarding provisioning (`createManualWebsite`) | ran; writes `user.tenantId=T`, Website, Workspace, PublishedSnapshot; **skips `markOnboardingComplete`** | (already provisioned) | equal end-state; both have **no `Setting{onboarding_completed}`** |
| 5. `/api/auth/refresh-session` rewrites cookie with `tenantId=T` and `workspaceId=W` | ran after provisioning (best-effort) | not invoked on fresh login (no onboarding page) | fresh login already has correct JWT from step 3, so effectively equal |
| 6. Browser navigates to `/admin/dashboard` | signup user typically went to `/builder` instead; **`/admin/dashboard` would also loop** | LoginForm does `router.push("/admin/dashboard")` | **THIS IS WHERE THE REPORTED FAILURE SURFACES.** Signup never visits `/admin/dashboard`; fresh login does. |
| 7. `GET /admin/dashboard` middleware `canAccess` | READY (token) → allows | READY (token) → allows | equal |
| 8. `/admin/dashboard` Server Component calls `requireTenant()` → DB-backed `lifecycleService.resolve()` checks `Setting(T,"onboarding_completed")` | (would loop too if reached) | **Setting is NULL** → state `ONBOARDING` → `redirect("/onboarding")` | **FIRST DIVERGENCE WITH USER-VISIBLE IMPACT:** signup session avoids this by using `/builder`; fresh login is forced into `/admin/dashboard`. |
| 9. `GET /onboarding` middleware `redirectTo` (token-only READY) → `/admin/dashboard` | (would loop) | `READY` → `redirectTo` returns `/admin/dashboard` → 307 | second leg of loop |
| 10. Loop end state | (if user clicked Dashboard they'd see the same loop) | `ERR_TOO_MANY_REDIRECTS` or manual return to `/admin/login` | user-level report: "session not established; returns to `/admin/login`" |

**The first verifiable divergence is step 8** — the DB-backed
`requireTenant` boundary. The signup session mask the bug because the user
goes to `/builder` (which never calls `requireTenant`), while the fresh-login
flow is forced through `/admin/dashboard` (which always calls `requireTenant`).

The underlying **data divergence** occurs at step 4: `createManualWebsite` does
not write the `onboarding_completed` Setting, so the DB state for a
Build-Manually creator is *provisioned but onboarding-incomplete by the
lifecycle service's contract* — even though the tenant, website, workspace,
and published snapshot all exist.

---

## 6. Root Cause (verified)

**`src/actions/onboarding.actions.ts` — `createManualWebsite()` does not call
`markOnboardingComplete(tenantId)` after a successful publish.**

Evidence chain:

1. **The lifecycle contract.** `src/lib/lifecycle/service.ts:44-67`
   `lifecycleService.resolve()` — the DB-backed resolver used by
   `requireTenant` — treats the `Setting { tenantId, key: "onboarding_completed" }`
   row as the **only** source of truth for `hasOnboardingCompleted`. Without
   it, even when a `Website` exists, the state is `ONBOARDING`, not `READY`.
   `src/lib/auth/require-tenant.ts:40-45` then redirects an ADMIN user to
   `/onboarding` whenever `!lifecycle.hasOnboardingCompleted`.

2. **The only writer of that Setting.** A repo-wide
   `grep "key:\s*[\"']onboarding_completed[\"']"` finds exactly two producers:
   - `src/actions/onboarding.actions.ts:815-817` — the
     `markOnboardingComplete(tenantId)` action (idempotent `prisma.setting.upsert`).
   - `src/lib/lifecycle/service.ts:45` — the *reader* (query).
   No other module writes this Setting.

3. **`markOnboardingComplete` callers (proves the contract is universal).**
   - `src/actions/onboarding.actions.ts:624` — `runCreatorGeneration`
     (AI / Import path).
   - `src/actions/acquisition/acquire.actions.ts:168` — the
     *Unified Profile Acquisition* path.
   - `src/actions/provision.actions.ts:109` — the generic
     `provisionCreator` action.
   - `src/actions/super-admin-provision.actions.ts:190` — the
     Super-Admin agency-provisioning path, with the adjacent comment:
     > *// VALIDATION-03 (CRITICAL): the agency provisioning path must mark
     > // onboarding complete — otherwise the claimed client lands in an
     > // infinite redirect between /admin/dashboard and /onboarding.*
   - `confirmProvision` (the agency invitation-claim path) — fixed in
     VALIDATION-03 (see `docs/validation-03-agency-client.md` C-1).
   - **`createManualWebsite` does NOT call it.** That is the only missing
     caller.

4. **The architectural asymmetry that masks the bug for the signup session.**
   `src/lib/lifecycle/token-resolver.ts:50-95` `resolveFromToken()` is
   **hardcoded** for middleware use (Edge-safe, no DB): for `ADMIN + tenantId`
   it returns `state=READY` and `hasOnboardingCompleted=true` **without any DB
   Setting lookup**. So middleware never blocks `/admin/dashboard` or
   `/builder` for a token-authenticated ADMIN with a tenantId, regardless of
   whether the Setting exists. That is why the signup browser reaches
   `/builder`. The fresh-login path is forced through
   `requireTenant` (which **is** DB-backed), so it discovers the missing
   Setting and bounces.

5. **The exact loop mechanism** has a documented precedent — VALIDATION-03 C-1
   — fixed in `super-admin-provision.actions.ts:187-190` with the explicit
   comment above. The Build-Manually path is the same bug class with the
   same fix.

6. **No other mechanism invalidates the fresh login session.** The session
   callback (`src/lib/auth.ts:114-156`) only invalidates on a missing user or a
   role mismatch (or, for agency roles, revoked membership). For a freshly
   signed-up Creator (`role="ADMIN"`, no agency), `dbUser.role === token.role`
   and `dbUser` exists, so the session is **not** invalidated. The session
   callback reads `tenantId`, `workspaceId`, etc. from the token (which is
   already correct after `authorize` + `jwt` for fresh login), so
   `session.user.tenantId === T` and `session.user.workspaceId === W`.

7. **`auth-trace.ts` precedent and `recovery-04-auth-root-cause.md`.** An
   earlier race-condition fix removed `getSession()` from `LoginForm` for a
   deleted-user scenario and is no longer the failing mechanism here. The
   current LoginForm correctly does not call `getSession()`. The
   session-refresh race is unrelated to this bug; the root cause is purely
   the missing `markOnboardingComplete` call in `createManualWebsite`.

**Root-cause statement (one sentence):**
`createManualWebsite` provisions Tenant + Website + Workspace + publishes the
site and correctly assigns `user.tenantId`, but **never persists the
`onboarding_completed` Setting** that the DB-backed `requireTenant` boundary
treats as authoritative, so every fresh login that lands on any
`requireTenant`-protected `/admin/*` page is bounced to `/onboarding`, which
middleware (token-only READY) immediately bounces back to `/admin/dashboard`,
producing an infinite redirect loop.

---

## 7. Security Impact

| Aspect | Assessment |
|---|---|
| Authentication bypass | **None.** The proposed fix does not weaken `authorize`, `bcrypt.compare`, the tenant-match check (skipped intentionally when `credentials.tenantId` is falsy), or the session-callback invalidation logic. |
| Authorization bypass | **None.** `requireTenant` and the role check in `authorize` are untouched. The fix only writes a Setting that already has a defined lifecycle contract. |
| Middleware weakening | **None.** `middleware.ts`, `token-resolver.ts`, and `LIFECYCLE_ROUTE_GUARDS` are frozen. |
| Tenant isolation | **None.** No `tenantId` is taken from the client; `markOnboardingComplete(tenantId)` accepts only the DB-authoritative tenantId already produced by `provisioningService.provision(..., mode:"attach_existing_user", authenticatedUserId:userId)` which derives ownership from the authenticated user. |
| Session forgery / hardcoded session | **None.** No JWT is synthesized; no cookie is minted outside the existing NextAuth flow. |
| Privilege escalation | **None.** `markOnboardingComplete` writes a Setting on the *tenant the user already owns*; it does not change `User.role`, `User.tenantId`, or `Workspace` membership. |
| Crypto / password verification | **Untouched.** `bcrypt.compare` and `password.length < 8` gate remain. |
| Prisma schema / migrations | **Untouched.** `Setting`, `User`, `Tenant`, `Website` schemas are unchanged. The fix is a single `prisma.setting.upsert` that already exists in `markOnboardingComplete`. |
| Audit log gaps | Existing `logAction` calls in `runCreatorGeneration` and `applyBlueprintToWebsite` cause `applyBlueprintToWebsite` not to write `onboarding:completed`. The fix can additionally emit `logAction(tenantId, "onboarding:completed", {...})` to match `runCreatorGeneration:629`, but this is informational only — not a security boundary. |
| Blast radius if mis-applied | Minimal. A correctly-idempotent `markOnboardingComplete` is a single `prisma.setting.upsert` no-op for already-migrated creators. The historic-Build-Manually backfill must be **idempotent** and **owner-preserving** (write only where `Website` exists and no Setting row exists). |

Net: the fix tightens the system to match the documented lifecycle contract
without altering any security boundary.

---

## 8. Affected Personas

| Persona | Login path | `onboarding_completed` Setting source | State after `requireTenant` (DB) | Status |
|---|---|---|---|---|
| New Creator, **Build Manually** | `/api/auth/callback/credentials` (empty `tenantId`) then `/admin/dashboard` | **Never written** by `createManualWebsite` | `ONBOARDING` (has Website, no Setting) → redirect `/onboarding` → loop | **AFFECTED** — fresh login cannot reach `/admin/dashboard` |
| Existing Creator who originally used **Build Manually** (pre-fix) | same | None — was never written | same | **AFFECTED** until backfill |
| New Creator, **Build with AI / Import profile** | same | `markOnboardingComplete` (`runCreatorGeneration:624`) | `READY` | OK |
| New Creator, **Unified Profile Acquisition** | same | `markOnboardingComplete` (`acquire.actions.ts:168`) | `READY` | OK |
| Super Admin | `/admin/login` (separate seeding) | Not consulted — `resolveFromToken` returns `READY` for `SUPER_ADMIN` regardless of any Setting; `requireTenant` is not used on `/super-admin/*` routes | `READY` | OK |
| Agency Admin / Agency Staff | `/admin/login`; `authorize` returns `tenantId=null` and `agencyId`; `resolveFromToken` returns `READY` for `AGENCY_*` regardless of any Setting; `requireTenant` redirects AGENCY personas to `/agency` before consulting hasOnboardingCompleted | n/a; agency provisioning (`confirmProvision`) was fixed by VALIDATION-03 to call `markOnboardingComplete` | `READY` | OK |
| Support / Read-Only | `authorize` returns `tenantId=null`; `resolveFromToken` returns `READY`; rarely uses `/admin/*` (its console is `/support`) | n/a | `READY` | OK |
| Existing Creator who originally used AI/Import (pre-fix or post-fix) | same | Already written | `READY` | OK |

**Regression-class risk:** *any* future provisioning entry point that forgets
`markOnboardingComplete` will exhibit the SAME bug for its persona. A
contract test (see §11) is required to lock this in.

---

## 9. Minimal Safe Fix

Mission constraints respected:
- No auth bypass. No test-only path. No middleware weakening. No tenant
  bypass. No hardcoded session. No schema/migration change. No
  service-account. No client tenantId authority. No password-verification
  change. No Builder change. No billing/capability change.

### Fix A (required, code): write the missing Setting

`src/actions/onboarding.actions.ts` — inside `createManualWebsite`, after
`applyBlueprintToWebsite` succeeds, call `markOnboardingComplete(tenantId)` in
the same idempotent manner as `runCreatorGeneration:617-624` (best-effort
`try/catch` — `markOnboardingComplete` already does `prisma.setting.upsert`).

Conceptual sketch (NOT to be applied in this audit — appendix only):

```ts
// after `const applied = await applyBlueprintToWebsite(...)` and
// `if (!applied.success) return applied;`

// RCCF-70.6.6 / VALIDATION-03 pattern: every creator provisioning
// path must mark onboarding complete so the DB-backed requireTenant
// (lib/lifecycle/service.ts) enters the READY state for the new
// tenant. Without this, a Build-Manually creator signs up + provisions
// successfully but a fresh login bounces /admin/dashboard → /onboarding
// (middleware READY via token-only) → /admin/dashboard (requireTenant
// ONBOARDING via DB) indefinitely.
try {
  await markOnboardingComplete(tenantId);
} catch (error) {
  captureError(error, {
    service: "onboarding-actions",
    operation: "createManualWebsite-markOnboardingComplete",
    tenantId,
  });
}

return { success: true, tenantId, websiteId };
```

This matches the existing convention in `runCreatorGeneration`,
`acquire.actions.ts`, `provision.actions.ts`, and
`super-admin-provision.actions.ts`. The `markOnboardingComplete` action is
already idempotent (`prisma.setting.upsert`).

### Fix B (required, data): idempotent backfill for historic half-provisioned creators

Existing Build-Manually creators (pre-fix) are in the same broken state. Apply
an **idempotent** one-time backfill that writes
`Setting { tenantId:T, key:"onboarding_completed", value:{ completedAt: <now> } }`
only for tenants that:

1. Have a `Website` row (`prisma.website.findUnique({ where:{ tenantId:T } })`
   exists), AND
2. Do NOT already have a `Setting { tenantId:T, key:"onboarding_completed" }`
   row, AND
3. Have an `User.role === "ADMIN"` whose `tenantId === T`.

The backfill must be the only `prisma.setting.upsert` performed; it does not
modify any `User`, `Tenant`, `Workspace`, or `Website` row. It is consistent
with `markOnboardingComplete` (`onboarding.actions.ts:812-823`) and can be
expressed as a thin script that calls `markOnboardingComplete(T)` for each
qualifying tenant. **Not applied in this audit (read-only).**

### Fix C (optional, hardening): contract test

Add a unit test (see §11) that asserts every creator provisioning caller
invokes `markOnboardingComplete(tenantId)` on success — this prevents the
class of regression from recurring.

### What is explicitly NOT the fix

- Do **not** change `middleware.ts` to perform a DB Setting lookup — that
  would re-introduce Prisma into the Edge middleware bundle, undoing the
  `service.ts / token-resolver.ts` split (`commit 3bf6bdb`).
- Do **not** weaken `requireTenant` to accept the absence of the Setting as
  "onboarding complete". That breaks the lifecycle contract and re-opens the
  VALIDATION-03 C-1 fix for the agency path.
- Do **not** have `authorize()` re-validate `onboarding_completed`. That
  conflates authentication (identity/password) with onboarding state and
  adds a DB read in the credentials hot path.
- Do **not** change the `LoginForm` to call `getSession()` post-`signIn`
  (the recovery-04 race-condition regression). The current behavior is
  correct.
- Do **not** change `resolveFromToken` to call Prisma — see above.
- Do **not** add a client-supplied `tenantId` authority to `authorize` for
  the platform-domain BUILD-MANUALLY creator path. The fix is DB-side only.

---

## 10. Files That Would Need Modification (for the eventual fix)

| File | Change | Rationale |
|---|---|---|
| `src/actions/onboarding.actions.ts` | In `createManualWebsite`, call `markOnboardingComplete(tenantId)` after `applyBlueprintToWebsite` succeeds; emit `logAction(tenantId, "onboarding:completed", { source: "manual" })` to match `runCreatorGeneration:629`. | Single-line (plus comment + optional audit). Restores parity with all other creator provisioning paths. |
| `scripts/` (new, optional) | Idempotent one-time backfill script that calls `markOnboardingComplete(T)` for qualifying Build-Manually creators (Website exists, no Setting, ADMIN-owned tenant). Run once on deploy. | Recovers historic Build-Manually creators without modifying schema or migrating data. |
| `tests/unit/lifecycle.test.ts` or new `tests/unit/rccf70-6-6-create-manual-website-onboarding.test.ts` | Unit tests: (1) `requireTenant` redirects ADMIN-with-tenantId-but-no-`onboarding_completed`-Setting to `/onboarding`; (2) `requireTenant` returns session when ADMIN has tenantId + Website + `onboarding_completed` Setting; (3) `createManualWebsite` invokes `markOnboardingComplete(tenantId)` after `applyBlueprintToWebsite` success; (4) `createManualWebsite` does NOT write the Setting when provisioning fails. | Locks the contract; prevents class regression. |
| `tests/unit/rccf70-6-6-provisioning-onboarding-contract.test.ts` (new, optional) | A `glob`-driven contract test asserting every caller of `provisioningService.provision(... mode:"attach_existing_user" ...)` or `publishingService.publish(...)` in a creator/provision-onboarding flow also invokes `markOnboardingComplete(tenantId)`. | Class-regression guard (mirrors the implicit VALIDATION-03 contract). |

---

## 11. Files That Must Remain Frozen

The mission rules forbid modifying auth, middleware, tenant checks, schema,
migrations, Builder, and billing/capabilities. Frozen files:

- `src/lib/auth.ts` — NextAuth config, `authorize`, JWT/session callbacks.
- `src/lib/auth/require-tenant.ts` — DB-backed `requireTenant` semantics.
- `src/lib/lifecycle/token-resolver.ts` — middleware's authoritative
  token-only state resolver (the READY-harcoded behavior is intentional and
  must NOT be weakened to read Prisma in Edge).
- `src/lib/lifecycle/service.ts` — DB-backed lifecycle resolver.
- `src/lib/lifecycle/index.ts`, `src/lib/lifecycle/types.ts`.
- `src/middleware.ts` — middleware (rate-limit, route classification, redirect
  orchestration, security headers, subdomain rewrite).
- `src/lib/platform/routes.ts`, `src/lib/platform/domains.ts` — route
  classification & platform-domain detection used by middleware.
- `prisma/schema.prisma` and everything under `prisma/migrations/` (no schema
  change, no migration).
- `src/app/api/auth/refresh-session/route.ts` (the DB-authoritative
  refresh-session, the only legitimate producer of a refreshed JWT cookie).
- `src/app/api/auth/register/route.ts` (signup).
- `src/app/api/auth/[...nextauth]/route.ts` (NextAuth route handler).
- `src/components/admin/LoginForm.tsx` (the recovery-04 race fix stands).
- `src/app/admin/login/page.tsx` (LoginPage host-tenant resolution).
- `src/app/admin/dashboard/page.tsx` (calls `requireTenant`; that's correct).
- `src/app/builder/page.tsx`, `src/app/builder/layout.tsx`,
  `src/features/builder/components/loader.tsx`, `BuilderWorkspace` — Builder
  remains untouched (out-of-scope per mission rules; Builder is not the
  failure surface, it is the only working surface for the signup session).
- `src/actions/create.actions.ts` (`applyBlueprintToWebsite`) — authorization,
  ownership check, and publish contract remain. Could optionally add a
  `markOnboardingComplete` call here too for double-safety, but the cleanest
  fix is in `createManualWebsite`; per mission, keep `applyBlueprintToWebsite`
  frozen.
- `src/modules/provisioning/application/provisioning-service.ts` (canonical
  provisioning — frozen; no schema/migration).
- `src/modules/tenant/infrastructure/user-repository.ts` (`safeUpdate`
  SUPER_ADMIN protection — frozen).
- `src/lib/tenant.ts` (`getTenantContext`).
- `src/modules/workspace/application/{resolve-workspace,workspace-permissions,
  workspace-membership,service}.ts`.
- Any billing / capabilities source under `src/modules/billing/`,
  `src/lib/billing`, `src/lib/capabilities` — frozen.

---

## 12. Tests Required

### 12.1 Unit — `createManualWebsite` contract

`tests/unit/rccf70-6-6-create-manual-website-onboarding.test.ts` (or extend an
existing onboarding actions test file):

1. **`createManualWebsite` writes `onboarding_completed` on success**:
   - Mock `provisioningService.createRun` / `provision`, `applyBlueprintToWebsite`
     to succeed.
   - Assert `markOnboardingComplete` (or the underlying `prisma.setting.upsert`)
     is invoked with `tenantId === provisionResult.tenantId` exactly once after
     `applyBlueprintToWebsite` resolves.
2. **`createManualWebsite` does NOT write the Setting on provisioning failure**:
   - `provisioningService.provision` throws → assert `markOnboardingComplete`
     is NOT invoked and the function returns `{ success:false, error }`.
3. **`createManualWebsite` does NOT write the Setting on `applyBlueprintToWebsite` failure**:
   - `applyBlueprintToWebsite` returns `{ success:false, error }` → assert
     `markOnboardingComplete` is NOT invoked and the failure is propagated.
4. **Idempotency**: subsequent calls of `createManualWebsite` that re-enter
   the `else` branch (existing tenantId) still ensure the Setting exists.
   (Today's code calls `applyBlueprintToWebsite` again for the existing
   tenant; the fix should still call `markOnboardingComplete` once.)

### 12.2 Unit — `requireTenant` lifecycle contract (extension of `tests/unit/lifecycle.test.ts`)

5. **ADMIN + tenantId + Website + `onboarding_completed` Setting → returns
   TenantSession** — already exists (line 194-224). Keep.
6. **ADMIN + tenantId + Website + NO `onboarding_completed` Setting →
   `redirect("/onboarding")`** (the missing test that surfaces the bug).
   - `mockSettingFindUnique.mockResolvedValue(null)`.
   - `mockWebsiteFindUnique.mockResolvedValue({...})`.
   - Expect `mockRedirect` was called with `"/onboarding"`.
7. **AGENCY_ADMIN + tenantId + Website + NO `onboarding_completed` Setting →
   `redirect("/agency")`** (the agency safety branch).
8. **AGENCY_STAFF + tenantId + Website + NO `onboarding_completed` Setting →
   `redirect("/agency")`**.

### 12.3 Contract — provisioning-onboarding parity (new)

`tests/unit/rccf70-6-6-provisioning-onboarding-contract.test.ts`:

9. For every source file under `src/actions/**` that is identified as a
   *creator provisioning entry* (calls `provisioningService.provision` or
   a Creator-publish then onboarding-complete chain), assert the source
   contains a call to `markOnboardingComplete`. Files today:
   - `src/actions/onboarding.actions.ts` — `runCreatorGeneration` ✓ and
     **`createManualWebsite` (must contain a new call after the fix)**.
   - `src/actions/acquisition/acquire.actions.ts` ✓.
   - `src/actions/provision.actions.ts` ✓.
   - `src/actions/super-admin-provision.actions.ts` ✓.
10. The contract test should fail BEFORE the fix is applied (asserts
    `createManualWebsite` calls `markOnboardingComplete`) and pass AFTER.

### 12.4 Architecture / regression — reuse existing fitness test

11. Extend `tests/architecture/fitness.test.ts`'s "authenticated admin routes
    must not import `getTenantContext`" style to assert that
    `createManualWebsite` continues to NOT accept a client-supplied
    `tenantId` (it derives only from the DB user row via the authenticated
    session). This locks the RCCF-21 ownership boundary intact.

### 12.5 Integration / E2E — fresh login end-to-end

12. E2E (`tests/e2e/`): simulate a brand-new Creator signup → Build Manually →
    clear cookies → fresh `/admin/login` with the same credentials →
    `GET /admin/dashboard` returns **200** (no redirect loop). Capture the
    redirect history and assert it is a single hop to `/admin/dashboard`.
13. Regression — existing_creator flow (build-with-AI / Import profile): same
    signup → Import profile →
    publish. Fresh login → 200. (Pre-existing path; should not regress.)
14. Regression — Super Admin fresh login → `/super-admin` 200. AGENCY_ADMIN
    fresh login → `/agency` 200. SUPPORT/READ_ONLY → `/support` 200.
15. Backfill test (data): assert the backfill script is idempotent (running
    twice yields the same `Setting` rows; `value.completedAt` updated only
    on first invocation OR the upsert update branch re-stamps `completedAt`
    consistently — pick the explicit policy and lock it in the test).

---

## 13. Verification Plan

### 13.1 Code-level (post-fix)

1. `npx tsc --noEmit` — 0 errors (macOS/Win/CI identical).
2. `npm run lint` — clean.
3. `npm run test` (vitest) — full suite green, including the new
   `rccf70-6-6-…` tests.
4. `npm run build` — `next build` succeeds; middleware bundle diff shows
   **no new Prisma import** in the Edge bundle (parity with the
   `3bf6bdb` split).
5. Architectural/fitness test asserts `createManualWebsite` source contains
   `markOnboardingComplete`, and that `module-level` imports remain the
   existing set (no new auth/middleware mutation).

### 13.2 Manual reproduction (post-fix)

1. Fresh browser, platform domain.
2. `/signup` (Creator, Creator Launch) → email + password.
3. `/onboarding` → **Build Manually**.
4. Confirm DB state via Prisma Studio or read-only SQL:
   - `User.tenantId === T` ✓
   - `Tenant.id === T` ✓
   - `Website.tenantId === T` ✓
   - `Workspace.tenantId === T` ✓
   - `Setting { tenantId:T, key:"onboarding_completed" }` **exists with
     `value.completedAt` set** (the fix surface).
   - `Setting { tenantId:T, key:"onboarding_source" }` /
     `builder_artifact` may or may not exist (those are
     `runCreatorGeneration`-specific and not part of the lifecycle contract).
5. In **the same signup browser**: navigate to `/admin/dashboard`.
   Expect **200**, no redirect loop. (Today the signup browser would also
   loop on `/admin/dashboard`; after the fix it must not.)
6. In **a fresh browser context** (cookies cleared): `/admin/login` with
   the same email + password.
7. Expect:
   - `POST /api/auth/callback/credentials` → 302/Set-Cookie (`session-token`).
   - `GET /admin/dashboard` → **200** (single hop).
   - `GET /api/auth/session` → `{ user: { id, role:"ADMIN", tenantId:T,
     workspaceId:W, workspaceType:"TENANT", workspaceRole:"OWNER", ... } }`.
   - No redirects to `/onboarding` or `/admin/login`.

### 13.3 Backfill (data)

8. Snapshot the `Setting` table before the backfill.
9. Run the idempotent backfill script (Fix B).
10. For each pre-fix Build-Manually tenant: `Setting
    {tenantId, key:"onboarding_completed"}` row now exists. For tenants
    that already had it (Build-with-AI / agency): unmodified
    (`prisma.setting.upsert` update branch re-stamps `completedAt`; if the
    policy is "preserve original timestamp", tweest the script to
    `update: {}` for existing rows; pick and test).
11. Fresh-login each affected Creator account (representative QA list):
    `/admin/dashboard` returns 200. No loop.
12. Regression — Super Admin, AGENCY_ADMIN, AGENCY_STAFF, SUPPORT,
    READ_ONLY: fresh logins unchanged (`go to /super-admin` / `/agency`
    / `/support` respectively).

### 13.4 Regression safety

13. Re-run the existing test suite: `vitest run` — 0 failures, especially
    `tests/unit/lifecycle.test.ts`, `tests/unit/rccf36-acquire-auth.test.ts`,
    `tests/unit/rccf63-creator-auth-hardening.test.ts`,
    `tests/unit/rccf68-admin-crud-billing-responsive.test.tsx`,
    `tests/architecture/fitness.test.ts`.
14. `git diff --check` and `git diff --stat` showing exactly:
    - `src/actions/onboarding.actions.ts` (Fix A)
    - `tests/unit/rccf70-6-6-…` (Fix C test files)
    - `scripts/<backfill>` (Fix B data path, if introduced)
    - nothing else.

### 13.5 Production rollout guardrails

15. Ship Fix A and the tests together. Backfill can ship as a follow-up
    update; existing pre-fix Build-Manually creators remain locked out
    until the backfill runs.
16. Monitor logs for `auth.session_invalidated` — should be **0** events
    related to fresh creators (no role change, no deletion).
17. Monitor middleware redirect logs for `/admin/dashboard ↔ /onboarding`
    hot pairs — expectation is zero occurrences post-fix.
18. Add a short-lived log line in `createManualWebsite` confirming
    `markOnboardingComplete` succeeded (existing `captureError` path handles
    failures). Remove the verbose line after the rollout stabilises
    (optional cleanup; keep `logAction(tenantId, "onboarding:completed",
    {source:"manual"})` for parity with `runCreatorGeneration` audit trail).

---

## 14. Appendix — Evidence Index

| Path | Lines | Role in the bug |
|---|---|---|
| `src/actions/onboarding.actions.ts` | 36-79 (`createManualWebsite`), 612-624 (`runCreatorGeneration`), 812-823 (`markOnboardingComplete`) | The missing call site. |
| `src/actions/create.actions.ts` | 79-136 (`applyBlueprintToWebsite`) | Publishes Website; no Setting write. |
| `src/modules/provisioning/application/provisioning-service.ts` | 143-417 (`provision`, line 254-265 `safeUpdate`) | Creates Tenant + Website + Workspace; updates `user.tenantId`. Does NOT write the Setting (the action caller's responsibility). |
| `src/actions/acquisition/acquire.actions.ts` | 168 | The acquisition path's `markOnboardingComplete` call. |
| `src/actions/provision.actions.ts` | 109 | The generic provision path's call. |
| `src/actions/super-admin-provision.actions.ts` | 187-190 | The VALIDATION-03 comment that explicitly documents this bug class for future maintainers. |
| `src/lib/auth/require-tenant.ts` | 26-48 (`requireTenant`), 67-107 (`resolveSession`) | DB-backed boundary that bounces a Creator whose `onboarding_completed` Setting is absent. |
| `src/lib/lifecycle/service.ts` | 14-83 (`LifecycleServiceWithDb.resolve`) | The DB lookup that returns `ONBOARDING` when Setting is absent but Website exists. |
| `src/lib/lifecycle/token-resolver.ts` | 49-95 (`resolveFromToken`), 157-210 (`redirectTo`) | Middleware's **token-only** READY for `ADMIN + tenantId`, plus the READY↔`/onboarding`→`/admin/dashboard` redirect that completes the loop. |
| `src/middleware.ts` | 57-150 | The edge orchestration that runs `token-resolver` (no Prisma, intentional split). |
| `src/lib/auth.ts` | 15-158 | NextAuth config; session callback invalidation logic — confirms no false-invalidation for fresh Creator. |
| `src/app/api/auth/refresh-session/route.ts` | 1-69 | The signup-session JWT rewrite that masks the bug (cookie gets `tenantId=T`). |
| `src/app/admin/login/page.tsx` | 1-37 | Login page host-tenant resolution that yields `tenantId=null` on the platform domain. |
| `src/components/admin/LoginForm.tsx` | 1-144 | `signIn({…, tenantId: tenantId ?? ""})` and `router.push("/admin/dashboard")` — confirms `""` is falsy and authorize skips the tenant check; not the failure. |
| `src/app/onboarding/page.tsx` | 370-392 (`handleBuildManually`) | Confirms Build Manually uses `createManualWebsite` and calls `/api/auth/refresh-session`. |
| `src/app/builder/page.tsx` | 1-7 | Confirms `/builder` does NOT call `requireTenant` — the asymmetry that masks the bug for the signup session. |
| `src/app/admin/dashboard/page.tsx` | 1-12 | Confirms `/admin/dashboard` DOES call `requireTenant` — where the fresh login discovers the missing Setting. |
| `docs/validation-03-agency-client.md` | 29 (C-1) | Exact precedent: same bug class in `confirmProvision`; fix identical in spirit. |
| `docs/recovery-04-auth-root-cause.md` | 60-72 (+ commit `47e3aea`) | Prior LOGIN-race fix (deleted-user). Confirmed unrelated to RCCF-70.6.6. |
| `docs/rccf-70.4.6.1-authenticated-final-visual-verification.md` | 17-29 | The original QA observation of this bug as a "new P1 verification blocker for the normal-login requirement". |
| `tests/auth-trace.ts` | 1-94 | Existing auth-pipeline tracer; safe to extend with a Build-Manually reproduction. |
| `tests/unit/lifecycle.test.ts` | 152-250 | Existing `requireTenant` tests; the missing test is the case "ADMIN + tenantId + Website + no Setting → redirect /onboarding" (§12.2 case 6). |

---

RCCF-70.6.6 audit complete. Verdict: CONFIRMED P1 — root cause isolated (missing
`markOnboardingComplete` call in `createManualWebsite`); fix is a one-line
addition plus idempotent data backfill, fully inside the existing authentication
architecture; no security boundary changes; minimal-files touch list.